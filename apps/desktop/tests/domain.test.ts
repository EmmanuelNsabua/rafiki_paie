import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { executerMigrations } from '../src/main/db/migrator';
import {
  EmployeService,
  OperationService,
  LigneService,
  ParametreService,
  JournalService,
  ErreurMetier,
} from '../src/main/domain';

describe('Règles Métier du Domaine (Paie Rafiki)', () => {
  let db: Database.Database;
  let employeService: EmployeService;
  let operationService: OperationService;
  let ligneService: LigneService;
  let parametreService: ParametreService;
  let journalService: JournalService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    employeService = new EmployeService(db);
    operationService = new OperationService(db);
    ligneService = new LigneService(db);
    parametreService = new ParametreService(db);
    journalService = new JournalService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('gère le CRUD Employé avec numérotation automatique et journalisation des données sensibles', () => {
    // 1. Création employé sans numéro -> attribué à 1
    const emp1 = employeService.creer({
      nom: 'Kabongo',
      postnom: 'Ilunga',
      prenom: 'Gloire',
      fonction: 'Professeur',
      telephone: '+243 81 000 0010',
      code_banque: '840',
      salaire_base: '500',
    });

    expect(emp1.numero).toBe(1);
    expect(emp1.nom).toBe('Kabongo');
    expect(emp1.salaire_base).toBe('500');
    expect(emp1.code_banque).toBe('840');

    // 2. Création deuxième employé sans numéro -> attribué à 2
    const emp2 = employeService.creer({
      nom: 'Mutombo',
      salaire_base: '450',
    });
    expect(emp2.numero).toBe(2);

    // 3. Modification sensible (salaire et téléphone)
    employeService.modifier(emp1.id, {
      salaire_base: '550',
      telephone: '+243 81 999 9999',
    });

    const emp1Maj = employeService.obtenir(emp1.id);
    expect(emp1Maj.salaire_base).toBe('550');
    expect(emp1Maj.telephone).toBe('+243 81 999 9999');

    // Vérifier l'inscription au journal avec valeurs avant/après
    const logs = journalService.lister({ entite: 'employe' });
    const logSensible = logs.find((l) => l.action === 'MODIFIER_DONNEES_SENSIBLES_EMPLOYE');
    expect(logSensible).toBeDefined();
    expect(logSensible?.detail).toContain('salaire_base: "500" -> "550"');
    expect(logSensible?.detail).toContain('telephone: "+243 81 000 0010" -> "+243 81 999 9999"');
  });

  it('ouvre une opération, refuse les doublons et les jours invalides', () => {
    employeService.creer({ nom: 'Agent1', salaire_base: '500' });
    employeService.creer({ nom: 'Agent2', salaire_base: '600' });

    // Ouverture normale
    const op = operationService.ouvrir(2026, 10, 22);
    expect(op.annee).toBe(2026);
    expect(op.mois).toBe(10);
    expect(op.statut).toBe('ouverte');

    // Les lignes doivent être créées pour chaque employé actif
    const detail = operationService.obtenir(op.id);
    expect(detail.lignes.length).toBe(2);
    expect(detail.lignes[0].jours_ouvrables).toBe(22);
    expect(detail.lignes[0].salaire_a_payer).toBe('500.00'); // Calculé dynamiquement

    // Refus doublon de mois
    expect(() => operationService.ouvrir(2026, 10)).toThrow(ErreurMetier);
    try {
      operationService.ouvrir(2026, 10);
    } catch (e: any) {
      expect(e.code).toBe('OPERATION_DEJA_EXISTANTE');
    }

    // Refus jours ouvrables < 1
    expect(() => operationService.ouvrir(2026, 11, 0)).toThrow(ErreurMetier);
  });

  it('exécute le cas de référence de bout en bout (500 $, HS 40, ret 20, mal 2, con 1, abs 1)', () => {
    // 500 $, HS 40, retrait 20, 22 jours, 2 de maladie, 1 de congé, 1 d'absence
    // Attendu : net_global = "474.545455", virement = "470"
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

    // Modification des variables
    const modif = ligneService.modifier(ligneId, {
      hs: '40',
      retrait: '20',
      jours_maladie: '2',
      jours_conge: '1',
      jours_absence: '1',
    });

    expect(modif.ligne.net_global).toBe('474.545455');
    expect(modif.ligne.virement).toBe('470');
    expect(modif.totaux.total_virement).toBe('470');
    expect(modif.totaux.total_net_global).toBe('474.55');
    expect(modif.totaux.ecart_arrondi).toBe('-4.55');

    // Terminaison de l'opération
    const opTerminee = operationService.terminer(op.id);
    expect(opTerminee.statut).toBe('terminee');

    // Vérifier que les résultats sont désormais figés dans SQLite
    const ligneStockee = db.prepare('SELECT * FROM ligne_paie WHERE id = ?').get(ligneId) as any;
    expect(ligneStockee.net_global).toBe('474.545455');
    expect(ligneStockee.virement).toBe('470');
    expect(ligneStockee.telephone).toBe('+243 81 000 0010');
    expect(ligneStockee.code_banque).toBe('840');
  });

  it('interdit la modification et suppression d une ligne dont l opération est terminée', () => {
    const emp = employeService.creer({ nom: 'Test', salaire_base: '500' });
    const op = operationService.ouvrir(2026, 10, 22);
    const detail = operationService.obtenir(op.id);
    const ligneId = detail.lignes[0].id;

    operationService.terminer(op.id);

    // 1. Refus dans le domaine (LigneService)
    expect(() => ligneService.modifier(ligneId, { hs: '50' })).toThrow(ErreurMetier);

    // 2. Refus au niveau du déclencheur SQL (Triggers SQLite)
    expect(() => {
      db.prepare('UPDATE ligne_paie SET hs = ? WHERE id = ?').run('50', ligneId);
    }).toThrow(/OPERATION_TERMINEE/);

    expect(() => {
      db.prepare('DELETE FROM ligne_paie WHERE id = ?').run(ligneId);
    }).toThrow(/OPERATION_TERMINEE/);

    // Réouverture de l'opération
    operationService.rouvrir(op.id);
    const opRouverte = operationService.obtenir(op.id);
    expect(opRouverte.operation.statut).toBe('ouverte');

    // La modification redevient autorisée
    expect(() => ligneService.modifier(ligneId, { hs: '50' })).not.toThrow();
  });

  it('refuse la suppression d un employé apparaissant dans une opération', () => {
    const emp = employeService.creer({ nom: 'Permanent', salaire_base: '500' });
    operationService.ouvrir(2026, 10, 22);

    expect(() => employeService.supprimer(emp.id)).toThrow(ErreurMetier);
    try {
      employeService.supprimer(emp.id);
    } catch (e: any) {
      expect(e.code).toBe('SUPPRESSION_EMPLOYE_INTERDITE');
    }
  });

  it('permet d ajouter les nouveaux employés actifs à une opération ouverte', () => {
    const emp1 = employeService.creer({ nom: 'Ancien', salaire_base: '500' });
    const op = operationService.ouvrir(2026, 10, 22);

    // Créer un nouvel employé après ouverture de l'opération
    const emp2 = employeService.creer({ nom: 'Nouveau', salaire_base: '400' });

    const avant = operationService.obtenir(op.id);
    expect(avant.lignes.length).toBe(1);

    const res = operationService.ajouterNouveauxEmployes(op.id);
    expect(res.ajoutes).toBe(1);

    const apres = operationService.obtenir(op.id);
    expect(apres.lignes.length).toBe(2);
    expect(apres.lignes.some((l) => l.employe_id === emp2.id)).toBe(true);
  });
});
