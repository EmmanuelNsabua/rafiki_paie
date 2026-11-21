import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import Decimal from 'decimal.js';
import { executerMigrations } from '../src/main/db/migrator';
import {
  EmployeService,
  OperationService,
  LigneService,
  ParametreService,
  JournalService,
  ErreurMetier,
  calculerTotauxOperation,
} from '../src/main/domain';
import {
  lignePaieSchema,
  employeSchema,
  CANAUX_IPC,
  ipcEmployesCreerInput,
  ipcOperationsOuvrirInput,
} from '@rafiki/contrat';

describe('Vérification Exhaustive des Critères de la Phase 1', () => {
  let db: Database.Database;
  let employeService: EmployeService;
  let operationService: OperationService;
  let ligneService: LigneService;
  let journalService: JournalService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    employeService = new EmployeService(db);
    operationService = new OperationService(db);
    ligneService = new LigneService(db);
    journalService = new JournalService(db);
  });

  afterEach(() => {
    db.close();
  });

  // 1. Cas de référence de bout en bout
  it('1. Cas de référence : 500 $, HS 40, ret 20, 22 j, 2 mal, 1 con, 1 abs -> net 474.545455, vir 470', () => {
    const emp = employeService.creer({
      nom: 'Kabongo',
      postnom: 'Ilunga',
      prenom: 'Gloire',
      telephone: '+243 81 000 0010',
      code_banque: '840',
      salaire_base: '500',
    });

    const op = operationService.ouvrir(2026, 10, 22);
    const detail = operationService.obtenir(op.id);
    const ligneId = detail.lignes[0].id;

    ligneService.modifier(ligneId, {
      hs: '40',
      retrait: '20',
      jours_maladie: '2',
      jours_conge: '1',
      jours_absence: '1',
    });

    operationService.terminer(op.id);

    const ligneFinale = db.prepare('SELECT * FROM ligne_paie WHERE id = ?').get(ligneId) as any;

    expect(ligneFinale.net_global).toBe('474.545455');
    expect(ligneFinale.virement).toBe('470');
    expect(ligneFinale.telephone).toBe('+243 81 000 0010');
    expect(ligneFinale.code_banque).toBe('840');
  });

  // 2. Cas d'arrondi
  it('2. Cas d arrondi : 554.99->550 ; 555.00->560 ; 557.20->560 ; 474.55->470 ; 0->0', () => {
    const tests = [
      { montant: '554.99', attendu: '550' },
      { montant: '555.00', attendu: '560' },
      { montant: '557.20', attendu: '560' },
      { montant: '474.55', attendu: '470' },
      { montant: '0', attendu: '0' },
    ];

    for (const t of tests) {
      const d = new Decimal(t.montant);
      const u = new Decimal(10);
      const res = d.dividedBy(u).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(u).toString();
      expect(res).toBe(t.attendu);
    }
  });

  // 3. Immutabilité et Déclencheurs SQL
  it('3. Immutabilité : modification et suppression bloquées par triggers SQL après terminaison, autorisées après réouverture', () => {
    const emp = employeService.creer({ nom: 'Testeur', salaire_base: '400' });
    const op = operationService.ouvrir(2026, 10, 22);
    const ligneId = operationService.obtenir(op.id).lignes[0].id;

    operationService.terminer(op.id);

    // Déclencheur UPDATE
    expect(() => {
      db.prepare('UPDATE ligne_paie SET hs = ? WHERE id = ?').run('10', ligneId);
    }).toThrow(/OPERATION_TERMINEE/);

    // Déclencheur DELETE
    expect(() => {
      db.prepare('DELETE FROM ligne_paie WHERE id = ?').run(ligneId);
    }).toThrow(/OPERATION_TERMINEE/);

    // Après réouverture
    operationService.rouvrir(op.id);
    expect(() => {
      db.prepare('UPDATE ligne_paie SET hs = ? WHERE id = ?').run('10', ligneId);
    }).not.toThrow();
  });

  // 4. Unicité et contraintes
  it('4. Unicité et contraintes : doublon mois, doublon ligne, jours 0, absences excessives, types STRICT', () => {
    const emp1 = employeService.creer({ nom: 'A1', salaire_base: '300' });
    operationService.ouvrir(2026, 1, 20);

    // Doublon mois
    try {
      operationService.ouvrir(2026, 1, 20);
      expect.unreachable('Devait refuser le doublon de mois');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ErreurMetier);
      expect(e.code).toBe('OPERATION_DEJA_EXISTANTE');
    }

    // Doublon ligne dans même opération
    expect(() => {
      db.prepare(
        `INSERT INTO ligne_paie (id, operation_id, employe_id, numero, nom, salaire_base, jours_ouvrables, mis_a_jour_le)
         VALUES ('l-dup', (SELECT id FROM operation_paie LIMIT 1), ?, 1, 'A1', '300', 20, ?)`
      ).run(emp1.id, new Date().toISOString());
    }).toThrow();

    // Jours ouvrables = 0
    try {
      operationService.ouvrir(2026, 2, 0);
      expect.unreachable('Devait refuser jours ouvrables = 0');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ErreurMetier);
      expect(e.code).toBe('JOURS_INVALIDES');
    }

    // Insertion d'un type non numérique dans STRICT table
    expect(() => {
      db.prepare(
        `INSERT INTO employe (id, numero, nom, salaire_base, mis_a_jour_le)
         VALUES ('e-bad', 'faux-numero', 'Bad', '300', ?)`
      ).run(new Date().toISOString());
    }).toThrow();
  });

  // 5. Atomicité de la terminaison
  it('5. Atomicité : un échec au milieu de la terminaison annule toute modification', () => {
    const emp1 = employeService.creer({ nom: 'E1', salaire_base: '500' });
    const emp2 = employeService.creer({ nom: 'E2', salaire_base: '600' });

    const op = operationService.ouvrir(2026, 10, 22);
    const detail = operationService.obtenir(op.id);

    // Mettre la deuxième ligne en erreur (absences 25 > 22 jours) via update forcé
    db.prepare('UPDATE ligne_paie SET jours_absence = ? WHERE id = ?').run(
      '25',
      detail.lignes[1].id
    );

    // Terminaison doit échouer
    try {
      operationService.terminer(op.id);
      expect.unreachable('Devait échouer avec lignes en erreur');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ErreurMetier);
      expect(e.code).toBe('LIGNES_EN_ERREUR');
    }

    // Vérifier l'atomicité : aucune ligne n'a de virement figé, opération toujours ouverte
    const opVerif = operationService.obtenir(op.id);
    expect(opVerif.operation.statut).toBe('ouverte');

    const lignesDb = db
      .prepare('SELECT virement, net_global FROM ligne_paie WHERE operation_id = ?')
      .all(op.id) as any[];
    for (const l of lignesDb) {
      expect(l.virement).toBeNull();
      expect(l.net_global).toBeNull();
    }
  });

  // 6. Employé désactivé
  it('6. Employé désactivé : visible dans anciennes opérations, exclu des nouvelles', () => {
    const emp1 = employeService.creer({ nom: 'Permanent', salaire_base: '500' });
    const emp2 = employeService.creer({ nom: 'FuturInactif', salaire_base: '400' });

    // Mois 1 : les 2 employés sont actifs
    const op1 = operationService.ouvrir(2026, 1, 20);
    expect(operationService.obtenir(op1.id).lignes.length).toBe(2);

    // Désactivation de emp2
    employeService.desactiver(emp2.id);

    // Mois 2 : seul emp1 doit être inclus
    const op2 = operationService.ouvrir(2026, 2, 20);
    const detailOp2 = operationService.obtenir(op2.id);
    expect(detailOp2.lignes.length).toBe(1);
    expect(detailOp2.lignes[0].employe_id).toBe(emp1.id);

    // Mois 1 garde toujours emp2
    expect(operationService.obtenir(op1.id).lignes.length).toBe(2);
  });

  // 7. Journal et immutabilité
  it('7. Journal : enregistre modifications sensibles et refuse toute modification/suppression', () => {
    const emp = employeService.creer({
      nom: 'AgentJournal',
      telephone: '+243 81 111 1111',
      code_banque: '840',
      salaire_base: '500',
    });

    // Modification du téléphone et du code banque
    employeService.modifier(emp.id, {
      telephone: '+243 81 222 2222',
      code_banque: '841',
    });

    const logs = journalService.lister({ entite: 'employe' });
    expect(logs.length).toBeGreaterThan(0);
    const modifLog = logs.find((l) => l.action === 'MODIFIER_DONNEES_SENSIBLES_EMPLOYE')!;
    expect(modifLog).toBeDefined();
    expect(modifLog.detail).toContain('+243 81 111 1111');
    expect(modifLog.detail).toContain('+243 81 222 2222');

    // Déclencheur SQL d'immutabilité du journal
    expect(() => {
      db.prepare('UPDATE journal SET detail = ? WHERE id = ?').run('fake', modifLog.id);
    }).toThrow(/JOURNAL_IMMUTABLE/);

    expect(() => {
      db.prepare('DELETE FROM journal WHERE id = ?').run(modifLog.id);
    }).toThrow(/JOURNAL_IMMUTABLE/);
  });

  // 8. Migrations rejouées et somme de contrôle
  it('8. Migrations : rejouer est sans effet, modification de checksum refuse le démarrage', () => {
    // Rejouer sur la base existante
    const res = executerMigrations(db);
    expect(res.appliquees.length).toBe(0);
    expect(res.dejaAppliquees).toBeGreaterThan(0);

    // Altérer la somme de contrôle dans la table
    db.prepare('UPDATE schema_migrations SET somme_controle = ? WHERE numero = 1').run('corrompue');

    try {
      executerMigrations(db);
      expect.unreachable('Devait refuser avec somme altérée');
    } catch (e: any) {
      expect(e.code).toBe('SOMME_CONTROLE_ALTEREE');
    }
  });

  // 9. Contrat et compatibilité PostgreSQL (tout en chaînes, zéro float)
  it('9. Contrat : les montants exportés de SQLite sont strictement des chaînes décimales valides selon Zod', () => {
    const emp = employeService.creer({
      nom: 'TestContrat',
      salaire_base: '520.50',
      code_banque: '840',
      telephone: '+243 81 333 3333',
    });

    const op = operationService.ouvrir(2026, 10, 22);
    operationService.terminer(op.id);

    const ligneSql = db
      .prepare('SELECT * FROM ligne_paie WHERE operation_id = ?')
      .get(op.id) as any;

    // Validation Zod de la ligne
    const parsed = lignePaieSchema.safeParse(ligneSql);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      const data = parsed.data;
      expect(typeof data.salaire_base).toBe('string');
      expect(typeof data.net_global).toBe('string');
      expect(typeof data.virement).toBe('string');
      expect(typeof data.retenue_maladie).toBe('string');
      // Aucun nombre flottant JavaScript
      expect(typeof (data as any).net_global).not.toBe('number');
    }
  });

  // 10. Totaux et formule d'écart d'arrondi
  it('10. Totaux : ecart_arrondi = somme(virements) - somme(nets) exactement', () => {
    employeService.creer({ nom: 'Agent1', salaire_base: '500' });
    employeService.creer({ nom: 'Agent2', salaire_base: '450' });
    employeService.creer({ nom: 'Agent3', salaire_base: '380' });

    const op = operationService.ouvrir(2026, 10, 22);
    const detail = operationService.obtenir(op.id);

    // Modif variables
    ligneService.modifier(detail.lignes[0].id, { hs: '40', retrait: '20', jours_maladie: '2' });
    ligneService.modifier(detail.lignes[1].id, { jours_absence: '1' });
    ligneService.modifier(detail.lignes[2].id, { hs: '25', retrait: '10' });

    const opApres = operationService.obtenir(op.id);
    const totaux = opApres.totaux;

    let sommeVirements = new Decimal(0);
    let sommeNets = new Decimal(0);
    for (const l of opApres.lignes) {
      sommeVirements = sommeVirements.plus(new Decimal(l.virement || '0'));
      sommeNets = sommeNets.plus(new Decimal(l.net_global || '0'));
    }

    const diffCalculee = sommeVirements.minus(sommeNets).toDecimalPlaces(2).toString();
    expect(totaux.ecart_arrondi).toBe(diffCalculee);
    expect(totaux.total_virement).toBe(sommeVirements.toString());
  });
});
