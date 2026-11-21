import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { executerMigrations, calculerSommeControle } from '../src/main/db/migrator';
import {
  EmployeService,
  OperationService,
  LigneService,
  ParametreService,
  JournalService,
  ErreurMetier,
} from '../src/main/domain';

describe('Audit Phase 1 - Groupe B : Données (E1, E4, E5, E6)', () => {
  let db: Database.Database;

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('Migration 0001 -> 0002 : conserve les données, convertit 804 en 840, rétro-remplit jours_ouvrables et vérifie FK/intégrité/déclencheurs/index', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // 1. Appliquer uniquement 0001
    const dossierMigrations = path.join(__dirname, '../migrations');
    const sql0001 = fs.readFileSync(path.join(dossierMigrations, '0001_initial.sql'), 'utf8');
    db.exec(sql0001);

    const sha0001 = calculerSommeControle(sql0001);
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        numero INTEGER PRIMARY KEY,
        nom TEXT NOT NULL,
        somme_controle TEXT NOT NULL,
        appliquee_le TEXT NOT NULL
      ) STRICT;
    `
    ).run();
    db.prepare('INSERT INTO schema_migrations VALUES (?, ?, ?, ?)').run(
      1,
      'initial',
      sha0001,
      new Date().toISOString()
    );

    // 2. Insérer des données préexistantes au schéma 0001
    // Employés : 2 avec 804, 1 avec code spécifique 999
    db.exec(`
      INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
      VALUES 
        ('emp-1', 1, 'Mukendi', 'Tshimanga', 'Jean', 'Directeur', '+243 81 000 0001', '804', '800', 1, 1, '2026-01-01T00:00:00.000Z'),
        ('emp-2', 2, 'Kabongo', 'Ilunga', 'Gloire', 'Professeur', '0810000002', '804', '500', 1, 1, '2026-01-01T00:00:00.000Z'),
        ('emp-3', 3, 'Kalonji', 'Mwamba', 'Paul', 'Comptable', '243810000003', '999', '600', 1, 1, '2026-01-01T00:00:00.000Z');
    `);

    // Opération 1 : ouverte avec jours_ouvrables = 20 sur les lignes
    db.exec(`
      INSERT INTO operation_paie (id, annee, mois, statut, terminee_le, version, mis_a_jour_le)
      VALUES ('op-ouverte', 2026, 1, 'ouverte', NULL, 1, '2026-01-01T00:00:00.000Z');

      INSERT INTO ligne_paie (
        id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
        telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
        jours_maladie, jours_conge, jours_absence, version, mis_a_jour_le
      )
      VALUES 
        ('lig-1', 'op-ouverte', 'emp-1', 1, 'Mukendi', 'Tshimanga', 'Jean', 'Directeur', '+243 81 000 0001', '804', '800', '0', '0', 20, '0', '0', '0', 1, '2026-01-01T00:00:00.000Z'),
        ('lig-2', 'op-ouverte', 'emp-2', 2, 'Kabongo', 'Ilunga', 'Gloire', 'Professeur', '0810000002', '804', '500', '0', '0', 20, '0', '0', '0', 1, '2026-01-01T00:00:00.000Z');
    `);

    // Opération 2 : terminée avec jours_ouvrables = 22 et résultats figés (code_banque = 804)
    db.exec(`
      INSERT INTO operation_paie (id, annee, mois, statut, terminee_le, version, mis_a_jour_le)
      VALUES ('op-terminee', 2026, 2, 'terminee', '2026-02-28T00:00:00.000Z', 1, '2026-02-28T00:00:00.000Z');

      INSERT INTO ligne_paie (
        id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
        telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
        jours_maladie, jours_conge, jours_absence, salaire_a_payer, jours_prestes,
        retenue_maladie, retenue_conge, retenue_absence, net_global, virement, version, mis_a_jour_le
      )
      VALUES 
        ('lig-3', 'op-terminee', 'emp-1', 1, 'Mukendi', 'Tshimanga', 'Jean', 'Directeur', '+243 81 000 0001', '804', '800', '0', '0', 22, '0', '0', '0', '800.00', '22', '0.00', '0.00', '0.00', '800.000000', '800', 1, '2026-02-28T00:00:00.000Z');
    `);

    // Journal d'audit
    db.exec(`
      INSERT INTO journal (id, horodatage, action, entite, entite_id, detail)
      VALUES ('j-1', '2026-01-01T00:00:00.000Z', 'TEST', 'test', '1', 'detail');
    `);

    // 3. Exécuter la migration 0002 via le migrateur
    const res = executerMigrations(db, dossierMigrations);
    expect(res.appliquees).toContain('0002_donnees_banque_et_contraintes.sql');

    // 4. Assertions de conservation des données
    const nbEmployes = db.prepare('SELECT count(*) as c FROM employe').get() as { c: number };
    expect(nbEmployes.c).toBe(3);

    const nbOperations = db.prepare('SELECT count(*) as c FROM operation_paie').get() as {
      c: number;
    };
    expect(nbOperations.c).toBe(2);

    const nbLignes = db.prepare('SELECT count(*) as c FROM ligne_paie').get() as { c: number };
    expect(nbLignes.c).toBe(3);

    const nbJournal = db.prepare('SELECT count(*) as c FROM journal').get() as { c: number };
    expect(nbJournal.c).toBe(1);

    // 5. Conversion 804 -> 840
    const emp1 = db.prepare('SELECT code_banque FROM employe WHERE id = ?').get('emp-1') as {
      code_banque: string;
    };
    expect(emp1.code_banque).toBe('840');

    const emp3 = db.prepare('SELECT code_banque FROM employe WHERE id = ?').get('emp-3') as {
      code_banque: string;
    };
    expect(emp3.code_banque).toBe('999');

    const lig1 = db.prepare('SELECT code_banque FROM ligne_paie WHERE id = ?').get('lig-1') as {
      code_banque: string;
    };
    expect(lig1.code_banque).toBe('840');

    const lig3 = db.prepare('SELECT code_banque FROM ligne_paie WHERE id = ?').get('lig-3') as {
      code_banque: string;
    };
    expect(lig3.code_banque).toBe('840');

    // 6. Rétro-remplissage operation_paie.jours_ouvrables
    const op1 = db
      .prepare('SELECT jours_ouvrables FROM operation_paie WHERE id = ?')
      .get('op-ouverte') as { jours_ouvrables: number };
    expect(op1.jours_ouvrables).toBe(20);

    const op2 = db
      .prepare('SELECT jours_ouvrables FROM operation_paie WHERE id = ?')
      .get('op-terminee') as { jours_ouvrables: number };
    expect(op2.jours_ouvrables).toBe(22);

    // 7. Paramètre code_banque_defaut
    const param = db
      .prepare('SELECT code_banque_defaut FROM parametre WHERE id = ?')
      .get('default') as { code_banque_defaut: string };
    expect(param.code_banque_defaut).toBe('840');

    // 8. Contrôle FK et Intégrité
    const fkViolations = db.pragma('foreign_key_check') as unknown[];
    expect(fkViolations).toEqual([]);

    const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
    expect(integrity).toEqual([{ integrity_check: 'ok' }]);

    // 9. Présence des 3 déclencheurs et des 2 index
    const triggers = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'ligne_paie'")
      .all() as Array<{ name: string }>;
    const triggerNames = triggers.map((t) => t.name);
    expect(triggerNames).toContain('trg_ligne_paie_bloquer_update_si_terminee');
    expect(triggerNames).toContain('trg_ligne_paie_bloquer_delete_si_terminee');
    expect(triggerNames).toContain('trg_ligne_paie_bloquer_insert_si_terminee');

    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'ligne_paie'")
      .all() as Array<{ name: string }>;
    const indexNames = indexes.map((i) => i.name);
    expect(indexNames).toContain('idx_ligne_paie_operation');
    expect(indexNames).toContain('idx_ligne_paie_employe');
  });

  it('Constat E6 : contrôle décimal strict sur employe et ligne_paie', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    // 1. Échec attendu pour 12abc sur salaire_base employé
    expect(() => {
      db.prepare(
        `
        INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
        VALUES ('emp-invalid', 99, 'Test', '', '', '', '', '840', '12abc', 1, 1, datetime('now'))
      `
      ).run();
    }).toThrow(/CHECK constraint failed/);

    // 2. Échec attendu pour 12.3.4, .5, 5., vide sur employe.salaire_base
    for (const invalidVal of ['12.3.4', '.5', '5.', '', '-10']) {
      expect(() => {
        db.prepare(
          `
          INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
          VALUES ('emp-inv-${invalidVal}', 100, 'Test', '', '', '', '', '840', ?, 1, 1, datetime('now'))
        `
        ).run(invalidVal);
      }).toThrow(/CHECK constraint failed/);
    }

    // 3. Insertion salaire_base valide
    db.prepare(
      `
      INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
      VALUES ('emp-ok', 10, 'Test', '', '', '', '', '840', '500.50', 1, 1, datetime('now'))
    `
    ).run();

    // 4. Ligne de paie : tester hs, retrait, et valeurs signées négatives pour salaire_a_payer, jours_prestes, net_global
    db.prepare(
      `
      INSERT INTO operation_paie (id, annee, mois, statut, version, mis_a_jour_le, jours_ouvrables)
      VALUES ('op-1', 2026, 3, 'ouverte', 1, datetime('now'), 22)
    `
    ).run();

    // Rejet de 12abc sur hs
    expect(() => {
      db.prepare(
        `
        INSERT INTO ligne_paie (
          id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
          telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
          jours_maladie, jours_conge, jours_absence, version, mis_a_jour_le
        )
        VALUES ('lig-bad-hs', 'op-1', 'emp-ok', 10, 'Test', '', '', '', '', '840', '500', '12abc', '0', 22, '0', '0', '0', 1, datetime('now'))
      `
      ).run();
    }).toThrow(/CHECK constraint failed/);

    // Acceptation des valeurs signées négatives conformes 0001 (Correction 2)
    db.prepare(
      `
      INSERT INTO ligne_paie (
        id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
        telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
        jours_maladie, jours_conge, jours_absence, salaire_a_payer, jours_prestes,
        net_global, virement, version, mis_a_jour_le
      )
      VALUES (
        'lig-ok-signed', 'op-1', 'emp-ok', 10, 'Test', '', '', '',
        '', '840', '500', '0', '0', 22,
        '0', '0', '0', '-50.00', '-2',
        '-50.000000', '0', 1, datetime('now')
      )
    `
    ).run();

    const inserted = db
      .prepare('SELECT salaire_a_payer, jours_prestes, net_global FROM ligne_paie WHERE id = ?')
      .get('lig-ok-signed') as any;
    expect(inserted.salaire_a_payer).toBe('-50.00');
    expect(inserted.jours_prestes).toBe('-2');
    expect(inserted.net_global).toBe('-50.000000');
  });

  it('Constat E5 : déclencheur BEFORE INSERT interdit toute insertion dans une opération terminée', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    db.prepare(
      `
      INSERT INTO parametre (id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, code_banque_defaut, version, mis_a_jour_le)
      VALUES ('default', 'USD', 22, 3, 10, '840', 1, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET code_banque_defaut = '840';
    `
    ).run();

    db.prepare(
      `
      INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
      VALUES ('emp-1', 1, 'Test', '', '', '', '', '840', '500', 1, 1, datetime('now'))
    `
    ).run();

    db.prepare(
      `
      INSERT INTO operation_paie (id, annee, mois, statut, terminee_le, version, mis_a_jour_le, jours_ouvrables)
      VALUES ('op-closed', 2026, 4, 'terminee', datetime('now'), 1, datetime('now'), 22)
    `
    ).run();

    expect(() => {
      db.prepare(
        `
        INSERT INTO ligne_paie (
          id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
          telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
          jours_maladie, jours_conge, jours_absence, version, mis_a_jour_le
        )
        VALUES ('lig-interdite', 'op-closed', 'emp-1', 1, 'Test', '', '', '', '', '840', '500', '0', '0', 22, '0', '0', '0', 1, datetime('now'))
      `
      ).run();
    }).toThrow(/OPERATION_TERMINEE/);
  });

  it('Constat E4 : ajouterNouveauxEmployes hérite de operation_paie.jours_ouvrables et non du paramètre global', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const employeService = new EmployeService(db);
    const operationService = new OperationService(db);

    // 1. Créer un employé initial
    employeService.creer({
      nom: 'Premier',
      salaire_base: '500',
    });

    // 2. Ouvrir une opération avec 18 jours ouvrables (alors que default est 22)
    const op = operationService.ouvrir(2026, 5, 18);
    expect(op.jours_ouvrables).toBe(18);

    // 3. Créer un deuxième employé après l'ouverture
    const emp2 = employeService.creer({
      nom: 'Second',
      salaire_base: '600',
    });

    // 4. Ajouter les nouveaux employés à l'opération ouverte
    const ajout = operationService.ajouterNouveauxEmployes(op.id);
    expect(ajout.ajoutes).toBe(1);

    // 5. Vérifier que la nouvelle ligne a hérité des 18 jours ouvrables de l'opération
    const detail = operationService.obtenir(op.id);
    const ligneEmp2 = detail.lignes.find((l) => l.employe_id === emp2.id);
    expect(ligneEmp2).toBeDefined();
    expect(ligneEmp2?.jours_ouvrables).toBe(18);
  });

  it('Constat E1 : code banque comme paramètre d école, sans fallback silencieux, avec compteur sans code banque', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const parametreService = new ParametreService(db);
    const employeService = new EmployeService(db);
    const operationService = new OperationService(db);

    // 1. Vérifier paramètre initialisé à 840
    const params = parametreService.lire();
    expect(params.code_banque_defaut).toBe('840');

    // 2. Employé sans code_banque spécifié -> hérite du paramètre de l'école (840)
    const empAvecDefaut = employeService.creer({
      nom: 'Defaut',
      salaire_base: '500',
    });
    expect(empAvecDefaut.code_banque).toBe('840');

    // 3. Modifier le paramètre à 850
    parametreService.modifier({ code_banque_defaut: '850' });
    const empAvecNouveauParam = employeService.creer({
      nom: 'NouveauParam',
      salaire_base: '550',
    });
    expect(empAvecNouveauParam.code_banque).toBe('850');

    // 4. Employé avec code_banque vide explicite -> reste vide (pas de fallback 804 ou 840)
    const empSansCode = employeService.creer({
      nom: 'SansCode',
      code_banque: '',
      salaire_base: '600',
    });
    expect(empSansCode.code_banque).toBe('');

    // 5. Ouvrir une opération et vérifier les compteurs dans les totaux
    const op = operationService.ouvrir(2026, 6);
    const detail = operationService.obtenir(op.id);
    expect(detail.totaux.nombre_sans_code_banque).toBe(1);

    // 6. Terminer la paie : la ligne sans code banque fige une chaîne vide et ne prend aucun 804/840
    operationService.terminer(op.id);
    const ligneSansCode = db
      .prepare('SELECT code_banque FROM ligne_paie WHERE operation_id = ? AND employe_id = ?')
      .get(op.id, empSansCode.id) as { code_banque: string };
    expect(ligneSansCode.code_banque).toBe('');
  });

  it('Doublons et validation téléphone : normalisation (+243, 243, 0), compteur en double dans totaux, pas de journalisation des doublons', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const employeService = new EmployeService(db);
    const operationService = new OperationService(db);
    const journalService = new JournalService(db);

    // 1. Validation de format du téléphone
    expect(() => {
      employeService.creer({
        nom: 'InvalideLettre',
        telephone: '081000001a',
        salaire_base: '500',
      });
    }).toThrow(/numéro de téléphone doit contenir/);

    expect(() => {
      employeService.creer({
        nom: 'TropCourt',
        telephone: '12345',
        salaire_base: '500',
      });
    }).toThrow(/numéro de téléphone doit contenir/);

    // 2. Création de 3 employés avec numéros équivalents (+243, 0, 243)
    const e1 = employeService.creer({
      nom: 'A',
      telephone: '+243 81 000 0010',
      salaire_base: '500',
    });
    const e2 = employeService.creer({
      nom: 'B',
      telephone: '081-000-0010',
      salaire_base: '500',
    });
    const e3 = employeService.creer({
      nom: 'C',
      telephone: '243.81.000.0010',
      salaire_base: '500',
    });
    // 4ème employé avec numéro distinct
    employeService.creer({
      nom: 'D',
      telephone: '+243 99 999 9999',
      salaire_base: '500',
    });

    // 3. Ouvrir l'opération et obtenir les totaux
    const op = operationService.ouvrir(2026, 7);
    const detail = operationService.obtenir(op.id);

    // 3 employés ont le même numéro normalisé
    expect(detail.totaux.nombre_telephones_en_double).toBe(3);

    // 4. Vérifier qu'aucun avertissement de doublon n'a été consigné dans le journal
    const entreesJournal = journalService.lister({ limite: 100 });
    const doublonLogs = entreesJournal.filter((j) => j.detail.toLowerCase().includes('doublon'));
    expect(doublonLogs.length).toBe(0);
  });

  it('Figement du téléphone à la terminaison', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const employeService = new EmployeService(db);
    const operationService = new OperationService(db);

    const emp = employeService.creer({
      nom: 'Mutombo',
      telephone: '+243 81 222 3333',
      salaire_base: '700',
    });

    const op = operationService.ouvrir(2026, 8);
    operationService.terminer(op.id);

    // Modifier le téléphone de l'employé APRÈS la terminaison
    employeService.modifier(emp.id, {
      telephone: '+243 81 999 8888',
    });

    // La ligne terminée doit avoir conservé l'ancien téléphone figé
    const ligne = db
      .prepare('SELECT telephone FROM ligne_paie WHERE operation_id = ? AND employe_id = ?')
      .get(op.id, emp.id) as { telephone: string };
    expect(ligne.telephone).toBe('+243 81 222 3333');
  });
});
