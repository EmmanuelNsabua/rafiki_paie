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
  BordereauService,
  ErreurMetier,
} from '../src/main/domain';
import { executerSeed } from '../src/main/db/seed';
import { validerTelephoneBeneficiaire, telephoneBeneficiaireSchema } from '@rafiki/contrat';

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
    // Employés : 2 avec 804, 1 avec code spécifique 999, 1 avec coordonnées vides
    db.exec(`
      INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le)
      VALUES 
        ('emp-1', 1, 'Mukendi', 'Tshimanga', 'Jean', 'Directeur', '+243 81 000 0001', '804', '800', 1, 1, '2026-01-01T00:00:00.000Z'),
        ('emp-2', 2, 'Kabongo', 'Ilunga', 'Gloire', 'Professeur', '0810000002', '804', '500', 1, 1, '2026-01-01T00:00:00.000Z'),
        ('emp-3', 3, 'Kalonji', 'Mwamba', 'Paul', 'Comptable', '243810000003', '999', '600', 1, 1, '2026-01-01T00:00:00.000Z'),
        ('emp-vide', 4, 'Anonyme', '', '', '', '', '804', '400', 1, 1, '2026-01-01T00:00:00.000Z');
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
    expect(nbEmployes.c).toBe(4);

    const nbOperations = db.prepare('SELECT count(*) as c FROM operation_paie').get() as {
      c: number;
    };
    expect(nbOperations.c).toBe(2);

    const nbLignes = db.prepare('SELECT count(*) as c FROM ligne_paie').get() as { c: number };
    expect(nbLignes.c).toBe(3);

    const nbJournal = db.prepare('SELECT count(*) as c FROM journal').get() as { c: number };
    expect(nbJournal.c).toBe(1);

    // 5. Comparaison détaillée des données (NULL, coordonnées vides, codes bancaires)
    const empVide = db.prepare('SELECT * FROM employe WHERE id = ?').get('emp-vide') as any;
    expect(empVide.postnom).toBe('');
    expect(empVide.prenom).toBe('');
    expect(empVide.fonction).toBe('');
    expect(empVide.telephone).toBe('');
    expect(empVide.code_banque).toBe('840'); // converti de 804 à 840
    expect(empVide.supprime_le).toBeNull();

    // 6. Conversion 804 -> 840 et préservation des codes personnalisés
    const emp1 = db.prepare('SELECT * FROM employe WHERE id = ?').get('emp-1') as any;
    expect(emp1.code_banque).toBe('840');
    expect(emp1.supprime_le).toBeNull();

    const emp3 = db.prepare('SELECT * FROM employe WHERE id = ?').get('emp-3') as any;
    expect(emp3.code_banque).toBe('999'); // code bancaire personnalisé préservé
    expect(emp3.supprime_le).toBeNull();

    const lig1 = db.prepare('SELECT * FROM ligne_paie WHERE id = ?').get('lig-1') as any;
    expect(lig1.code_banque).toBe('840');
    expect(lig1.salaire_a_payer).toBeNull(); // opération ouverte : résultats calculés restent NULL
    expect(lig1.net_global).toBeNull();
    expect(lig1.virement).toBeNull();
    expect(lig1.supprime_le).toBeNull();

    const lig3 = db.prepare('SELECT * FROM ligne_paie WHERE id = ?').get('lig-3') as any;
    expect(lig3.code_banque).toBe('840');
    // Paie terminée : tous les montants et fractions figés sont strictement conservés
    expect(lig3.salaire_a_payer).toBe('800.00');
    expect(lig3.jours_prestes).toBe('22');
    expect(lig3.retenue_maladie).toBe('0.00');
    expect(lig3.retenue_conge).toBe('0.00');
    expect(lig3.retenue_absence).toBe('0.00');
    expect(lig3.net_global).toBe('800.000000');
    expect(lig3.virement).toBe('800');
    expect(lig3.supprime_le).toBeNull();

    // 7. Rétro-remplissage operation_paie.jours_ouvrables et préservation des NULL / dates
    const op1 = db.prepare('SELECT * FROM operation_paie WHERE id = ?').get('op-ouverte') as any;
    expect(op1.jours_ouvrables).toBe(20);
    expect(op1.terminee_le).toBeNull(); // NULL préservé
    expect(op1.supprime_le).toBeNull();

    const op2 = db.prepare('SELECT * FROM operation_paie WHERE id = ?').get('op-terminee') as any;
    expect(op2.jours_ouvrables).toBe(22);
    expect(op2.terminee_le).toBe('2026-02-28T00:00:00.000Z'); // horodatage de terminaison préservé
    expect(op2.supprime_le).toBeNull();

    // 8. Relations entre les tables et intégrité référentielle
    expect(() => {
      db.prepare(
        `
        INSERT INTO ligne_paie (
          id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
          telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
          jours_maladie, jours_conge, jours_absence, version, mis_a_jour_le
        )
        VALUES ('lig-bad-fk', 'op-ouverte', 'emp-fantome', 99, 'Nom', '', '', '', '', '840', '100', '0', '0', 20, '0', '0', '0', 1, datetime('now'))
      `
      ).run();
    }).toThrow(/FOREIGN KEY constraint failed/);

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

  it('B1 : executerSeed utilise le paramètre de l école (sans code en dur) et s adapte à un code modifié (ex: 850)', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const parametreService = new ParametreService(db);
    parametreService.modifier({ code_banque_defaut: '850' });

    // Exécuter le seed
    executerSeed(db);

    const employeService = new EmployeService(db);
    const employes = employeService.lister();
    expect(employes.length).toBe(6);

    // Tous les employés du seed doivent avoir reçu 850 du paramètre d'école
    for (const emp of employes) {
      expect(emp.code_banque).toBe('850');
    }
  });

  it('B2 : la colonne parametre.code_banque_defaut n a pas de DEFAULT permanent dans le schéma SQL, mais conserve la valeur 840', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    // Vérifier le schéma de la table parametre dans sqlite_master
    const schemaRow = db
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'parametre'")
      .get() as { sql: string };

    // Le schéma ne doit pas contenir de DEFAULT sur code_banque_defaut
    expect(schemaRow.sql).not.toMatch(/code_banque_defaut[^,)]*DEFAULT/i);

    // La valeur 840 doit être préservée dans les données
    const param = db
      .prepare("SELECT code_banque_defaut FROM parametre WHERE id = 'default'")
      .get() as { code_banque_defaut: string };
    expect(param.code_banque_defaut).toBe('840');
  });

  it('B3 : téléphone obligatoire pour le bordereau (vide refusé, formats valides, invalides et cas limites)', () => {
    // 1. Numéros vides ou espaces : refusés
    expect(validerTelephoneBeneficiaire('')).toEqual({
      valide: false,
      erreur:
        'Le numéro de téléphone est obligatoire pour figurer comme bénéficiaire au bordereau.',
    });
    expect(validerTelephoneBeneficiaire('   ')).toEqual({
      valide: false,
      erreur:
        'Le numéro de téléphone est obligatoire pour figurer comme bénéficiaire au bordereau.',
    });
    expect(telephoneBeneficiaireSchema.safeParse('').success).toBe(false);
    expect(telephoneBeneficiaireSchema.safeParse('   ').success).toBe(false);

    // 2. Numéros invalides
    const invalides = [
      '081000001a',
      'abc',
      '++243810000010',
      '12345678', // 8 chiffres (trop court)
      '1234567890123456', // 16 chiffres (trop long)
      '+12345678', // 8 chiffres avec +
      '+1234567890123456', // 16 chiffres avec +
      '081@000#010',
    ];
    for (const inv of invalides) {
      const res = validerTelephoneBeneficiaire(inv);
      expect(res.valide).toBe(false);
      expect(res.erreur).toMatch(/entre 9 et 15 chiffres/);
      expect(telephoneBeneficiaireSchema.safeParse(inv).success).toBe(false);
    }

    // 3. Numéros valides et cas limites (bornes 9 et 15)
    const valides = [
      '+243 81 000 0010',
      '0810000010',
      '243810000010',
      '081-000-0010',
      '081.000.0010',
      '123456789', // Borne minimale exacte : 9 chiffres
      '+123456789', // 9 chiffres avec +
      '123 456 789', // 9 chiffres avec espaces
      '123456789012345', // Borne maximale exacte : 15 chiffres
      '+123456789012345', // 15 chiffres avec +
      '123.456.789.012.345', // 15 chiffres avec points
      '+243 99 123 45 67', // Opérateur Airtel / autre que Vodacom (aucun filtrage opérateur)
      '0991234567', // Opérateur Orange
    ];
    for (const val of valides) {
      const res = validerTelephoneBeneficiaire(val);
      expect(res.valide).toBe(true);
      expect(res.erreur).toBeUndefined();
      expect(telephoneBeneficiaireSchema.safeParse(val).success).toBe(true);
    }
  });

  it('B4 : exports réels PDF et Excel/CSV conformes, non-vides, avec journalisation anonymisée et reproductibilité', async () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const paramService = new ParametreService(db);
    const empService = new EmployeService(db, paramService);
    const journalService = new JournalService(db);
    const opService = new OperationService(db, journalService, paramService);
    const bordereauService = new BordereauService(db, opService, journalService);

    // 1. Créer quelques employés (avec tel, sans tel, avec code banque, sans code banque)
    const emp1 = empService.creer({
      nom: 'KABAMBA',
      postnom: 'TSHILOMBO',
      prenom: 'Felix',
      telephone: '+243810000001',
      code_banque: '840',
      salaire_base: '1000',
    });

    const emp2 = empService.creer({
      nom: 'MUKENDI',
      postnom: 'KANKU',
      prenom: 'Jean',
      telephone: '', // sans téléphone -> doit donner "—" au bordereau
      code_banque: '840',
      salaire_base: '500',
    });

    const emp3 = empService.creer({
      nom: 'ILUNGA',
      postnom: 'MBAYA',
      prenom: 'Marie',
      telephone: '0812345678',
      code_banque: '', // sans code banque -> doit donner "—" au bordereau
      salaire_base: '654.50',
    });

    // 2. Ouvrir une opération de paie pour Mars 2026
    const op = opService.ouvrir(2026, 3, 22);

    // 3. Test génération CSV
    const csvData = bordereauService.genererCsv(op.id);
    expect(csvData.nomFichier).toBe('Bordereau-virement-Mars-2026.csv');
    expect(csvData.nombreLignes).toBe(3);
    // Vérification UTF-8 BOM
    expect(csvData.contenu.startsWith('\uFEFF')).toBe(true);
    // En-têtes exacts
    expect(csvData.contenu).toContain('N°;Nom;Postnom;Prénom;Téléphone;Code banque;Virement');
    // Vérifier les employés
    expect(csvData.contenu).toContain('KABAMBA;TSHILOMBO;Felix;+243810000001;840');
    expect(csvData.contenu).toContain('MUKENDI;KANKU;Jean;—;840');
    expect(csvData.contenu).toContain('ILUNGA;MBAYA;Marie;0812345678;—');
    // Vérifier ligne finale Total à provisionner
    expect(csvData.contenu).toContain('Total à provisionner;;;;;;');
    expect(csvData.totalVirement).toBeDefined();

    // 4. Test génération PDF
    const pdfData = bordereauService.genererPdf(op.id);
    expect(pdfData.nomFichier).toBe('Bordereau-virement-Mars-2026.pdf');
    expect(pdfData.nombreLignes).toBe(3);
    expect(pdfData.buffer.length).toBeGreaterThan(1000);
    // Signature PDF 1.4
    const pdfStr = pdfData.buffer.toString('latin1');
    expect(pdfStr.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfStr).toContain('%%EOF');
    expect(pdfStr).toContain('/MediaBox [ 0 0 595.28 841.89 ]'); // A4 Portrait
    expect(pdfStr).toContain('Total \\340 provisionner');

    // 5. Test export réel physique sur disque
    const tmpDir = path.join(process.cwd(), 'apps', 'desktop', 'out-test-exports');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const cheminCsv = path.join(tmpDir, 'test-export.csv');
    const cheminPdf = path.join(tmpDir, 'test-export.pdf');

    const resExportCsv = bordereauService.exporter(op.id, 'csv', cheminCsv);
    expect(resExportCsv.cheminFichier).toBe(cheminCsv);
    expect(fs.existsSync(cheminCsv)).toBe(true);
    expect(fs.statSync(cheminCsv).size).toBeGreaterThan(0);

    const resExportPdf = bordereauService.exporter(op.id, 'pdf', cheminPdf);
    expect(resExportPdf.cheminFichier).toBe(cheminPdf);
    expect(fs.existsSync(cheminPdf)).toBe(true);
    expect(fs.statSync(cheminPdf).size).toBeGreaterThan(0);

    // 6. Vérifier la journalisation dans la table journal :
    // Chaque export doit être journalisé (EXPORTER_BORDEREAU, format, nombre_lignes, total_virement)
    // SANS téléphone ni code banque dans le détail !
    const logsExport = db
      .prepare("SELECT * FROM journal WHERE action = 'EXPORTER_BORDEREAU' ORDER BY horodatage ASC")
      .all() as any[];
    expect(logsExport.length).toBe(2);

    for (const logItem of logsExport) {
      expect(logItem.entite).toBe('operation_paie');
      expect(logItem.entite_id).toBe(op.id);
      const detail = JSON.parse(logItem.detail);
      expect(detail.format).toMatch(/^(csv|pdf)$/);
      expect(detail.nombre_lignes).toBe(3);
      expect(detail.total_virement).toBe(csvData.totalVirement);

      // SÉCURITÉ STRICTE : AUCUN téléphone ni code banque dans le détail !
      expect(logItem.detail).not.toContain('+243810000001');
      expect(logItem.detail).not.toContain('0812345678');
      expect(logItem.detail).not.toContain('840');
    }

    // 7. Reproductibilité des exports après clôture
    opService.terminer(op.id);
    const csvApresCloture = bordereauService.genererCsv(op.id);
    const pdfApresCloture = bordereauService.genererPdf(op.id);
    expect(csvApresCloture.contenu).toBe(csvData.contenu);
    expect(csvApresCloture.totalVirement).toBe(csvData.totalVirement);
    expect(pdfApresCloture.totalVirement).toBe(pdfData.totalVirement);
  });

  it('B6 : annulation d une migration en cas de violation de clé étrangère (rollback complet et maintien intégrité)', () => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    // Vérifier l'état initial : 3 migrations appliquées
    const migrationsAvant = db
      .prepare('SELECT numero FROM schema_migrations ORDER BY numero ASC')
      .all() as Array<{ numero: number }>;
    expect(migrationsAvant.map((m) => m.numero)).toEqual([1, 2, 3]);

    // Préparer un dossier temporaire contenant les migrations existantes plus une migration 0004 fautive
    const dossierTemp = path.join(process.cwd(), 'apps', 'desktop', 'tmp-test-migrations-rollback');
    if (!fs.existsSync(dossierTemp)) {
      fs.mkdirSync(dossierTemp, { recursive: true });
    }

    const dossierMigrations = path.join(__dirname, '../migrations');
    for (const f of fs.readdirSync(dossierMigrations)) {
      fs.copyFileSync(path.join(dossierMigrations, f), path.join(dossierTemp, f));
    }

    // Migration 0004 qui tente d'insérer une ligne avec employe_id inexistant
    const sqlFautif = `
      -- Migration créant une violation de clé étrangère
      INSERT INTO ligne_paie (
        id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
        telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
        jours_maladie, jours_conge, jours_absence, version, mis_a_jour_le
      )
      VALUES ('lig-invalide', 'op-inexistante', 'emp-inexistant', 1, 'Test', '', '', '', '', '840', '100', '0', '0', 20, '0', '0', '0', 1, datetime('now'));
    `;
    fs.writeFileSync(path.join(dossierTemp, '0004_violation_fk.sql'), sqlFautif);

    try {
      // Exécuter la migration fautive : doit échouer avec ErreurMigration('VIOLATION_CLES_ETRANGERES')
      expect(() => {
        executerMigrations(db, dossierTemp);
      }).toThrow(/violation de cl[ée] [ée]trang[èe]re/i);

      // Vérifier le rollback complet dans SQLite :
      // 1. schema_migrations ne contient TOUJOURS QUE [1, 2, 3]
      const migrationsApres = db
        .prepare('SELECT numero FROM schema_migrations ORDER BY numero ASC')
        .all() as Array<{ numero: number }>;
      expect(migrationsApres.map((m) => m.numero)).toEqual([1, 2, 3]);

      // 2. La ligne fautive n'existe pas
      const ligneExiste = db
        .prepare("SELECT count(*) as c FROM ligne_paie WHERE id = 'lig-invalide'")
        .get() as { c: number };
      expect(ligneExiste.c).toBe(0);

      // 3. foreign_keys est bien réactivé (PRAGMA foreign_keys = 1)
      const fkActif = db.pragma('foreign_keys', { simple: true }) as number;
      expect(fkActif).toBe(1);

      // 4. L'intégrité de la base reste parfaite
      const integrity = db.pragma('integrity_check') as Array<{ integrity_check: string }>;
      expect(integrity).toEqual([{ integrity_check: 'ok' }]);
    } finally {
      fs.rmSync(dossierTemp, { recursive: true, force: true });
    }
  });

  it('Migrations : fonctionnent sur une base vierge et sur une base issue de la migration 0002', () => {
    // 1. Base vierge -> 0001, 0002, 0003
    const dbVierge = new Database(':memory:');
    dbVierge.pragma('foreign_keys = ON');
    const resVierge = executerMigrations(dbVierge);
    expect(resVierge.appliquees).toEqual([
      '0001_initial.sql',
      '0002_donnees_banque_et_contraintes.sql',
      '0003_retrait_defaut_code_banque.sql',
    ]);
    expect(dbVierge.pragma('foreign_key_check')).toEqual([]);
    expect(dbVierge.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
    dbVierge.close();

    // 2. Base issue de 0002 (0001 et 0002 déjà appliquées) -> 0003
    const dbMigree = new Database(':memory:');
    dbMigree.pragma('foreign_keys = ON');
    const dossierMigrations = path.join(__dirname, '../migrations');

    const sql0001 = fs.readFileSync(path.join(dossierMigrations, '0001_initial.sql'), 'utf8');
    const sql0002 = fs.readFileSync(
      path.join(dossierMigrations, '0002_donnees_banque_et_contraintes.sql'),
      'utf8'
    );
    dbMigree.exec(sql0001);
    dbMigree.exec(sql0002);

    dbMigree
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        numero INTEGER PRIMARY KEY,
        nom TEXT NOT NULL,
        somme_controle TEXT NOT NULL,
        appliquee_le TEXT NOT NULL
      ) STRICT;
    `
      )
      .run();
    dbMigree
      .prepare('INSERT INTO schema_migrations VALUES (?, ?, ?, ?)')
      .run(1, 'initial', calculerSommeControle(sql0001), new Date().toISOString());
    dbMigree
      .prepare('INSERT INTO schema_migrations VALUES (?, ?, ?, ?)')
      .run(
        2,
        'donnees_banque_et_contraintes',
        calculerSommeControle(sql0002),
        new Date().toISOString()
      );

    // Données avant 0003
    dbMigree.prepare("UPDATE parametre SET code_banque_defaut = '840' WHERE id = 'default'").run();

    // Appliquer les migrations
    const resMigree = executerMigrations(dbMigree);
    expect(resMigree.dejaAppliquees).toBe(2);
    expect(resMigree.appliquees).toEqual(['0003_retrait_defaut_code_banque.sql']);

    // Vérifier intégrité et FK
    expect(dbMigree.pragma('foreign_key_check')).toEqual([]);
    expect(dbMigree.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);

    // Vérifier la suppression du DEFAULT SQL et la préservation de 840
    const schemaParam = dbMigree
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'parametre'")
      .get() as { sql: string };
    expect(schemaParam.sql).not.toMatch(/code_banque_defaut[^,)]*DEFAULT/i);

    const paramVal = dbMigree
      .prepare("SELECT code_banque_defaut FROM parametre WHERE id = 'default'")
      .get() as { code_banque_defaut: string };
    expect(paramVal.code_banque_defaut).toBe('840');

    dbMigree.close();
  });
});
