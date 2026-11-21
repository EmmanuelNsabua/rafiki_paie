import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { executerMigrations } from '../src/main/db/migrator';
import { executerSeed, DONNEES_PROTOTYPE_EMPLOYES } from '../src/main/db/seed';
import { OperationService, EmployeService, ErreurMetier } from '../src/main/domain';

describe('Seeder de Données d Exemple (Étape 5)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  it('charge les 6 employés du prototype et l opération d octobre 2026 clôturée', () => {
    executerSeed(db);

    const employeService = new EmployeService(db);
    const operationService = new OperationService(db);

    // 1. Vérifier les 6 employés
    const employes = employeService.lister();
    expect(employes.length).toBe(6);
    expect(employes[0].nom).toBe('Kabongo');
    expect(employes[0].code_banque).toBe('840');
    expect(employes[0].telephone).toBe('+243 81 000 0010');

    // Tous les employés doivent avoir le code banque 840
    for (const emp of employes) {
      expect(emp.code_banque).toBe('840');
      expect(emp.telephone).toMatch(/^\+243 81/);
    }

    // 2. Vérifier l'opération d'octobre 2026
    const operations = operationService.lister();
    expect(operations.length).toBe(1);
    const op = operations[0];
    expect(op.annee).toBe(2026);
    expect(op.mois).toBe(10);
    expect(op.statut).toBe('terminee');

    // 3. Vérifier le détail et les montants figés
    const detail = operationService.obtenir(op.id);
    expect(detail.lignes.length).toBe(6);

    // Ligne 1 : Kabongo (500 $, HS 40, ret 20, mal 2, con 1, abs 1)
    const ligneKabongo = detail.lignes.find((l) => l.nom === 'Kabongo')!;
    expect(ligneKabongo.net_global).toBe('474.545455');
    expect(ligneKabongo.virement).toBe('470');
    expect(ligneKabongo.telephone).toBe('+243 81 000 0010');
    expect(ligneKabongo.code_banque).toBe('840');
  });

  it('refuse de s exécuter si la base n est pas vide sans option force', () => {
    executerSeed(db);

    expect(() => executerSeed(db)).toThrow(ErreurMetier);
    try {
      executerSeed(db);
    } catch (e: any) {
      expect(e.code).toBe('BASE_NON_VIDE');
    }

    // Avec force: true, l'exécution est autorisée et réinitialise
    expect(() => executerSeed(db, { force: true })).not.toThrow();
  });
});
