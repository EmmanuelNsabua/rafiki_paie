import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { executerMigrations } from '../src/main/db/migrator';
import { OperationService, EmployeService, LigneService } from '../src/main/domain';

describe('Extensions Phase 2 du Domaine et du Contrat (Section 5)', () => {
  let db: Database.Database;
  let opService: OperationService;
  let empService: EmployeService;
  let ligneService: LigneService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);
    opService = new OperationService(db);
    empService = new EmployeService(db);
    ligneService = new LigneService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. modifierJours met à jour l opération et toutes ses lignes', () => {
    empService.creer({
      nom: 'Employe',
      prenom: 'Un',
      salaire_base: '500',
    });
    empService.creer({
      nom: 'Employe',
      prenom: 'Deux',
      salaire_base: '600',
    });

    const op = opService.ouvrir(2026, 11, 22);
    expect(op.jours_ouvrables).toBe(22);

    const maj = opService.modifierJours(op.id, 20);
    expect(maj.operation.jours_ouvrables).toBe(20);
    expect(maj.lignes).toHaveLength(2);
    expect(maj.lignes[0].jours_ouvrables).toBe(20);
    expect(maj.lignes[1].jours_ouvrables).toBe(20);

    // Refus si jours < 1
    expect(() => opService.modifierJours(op.id, 0)).toThrow('Le nombre de jours ouvrables doit être supérieur ou égal à 1');

    // Refus si absences excessives
    ligneService.modifier(maj.lignes[0].id, { jours_absence: '15' });
    expect(() => opService.modifierJours(op.id, 10)).toThrow('dépasse les 10 jours ouvrables');

    // Refus si opération terminée
    opService.terminer(op.id);
    expect(() => opService.modifierJours(op.id, 21)).toThrow('Impossible de modifier les jours ouvrables d une opération terminée');
  });

  it('2. Synthèse et variations calculées correctement par rapport à l opération antérieure terminée', () => {
    const e1 = empService.creer({ nom: 'Alpha', prenom: 'A', salaire_base: '1000' });
    const e2 = empService.creer({ nom: 'Beta', prenom: 'B', salaire_base: '2000' });

    // Opération 1 : Octobre 2026 (terminée)
    const opOct = opService.ouvrir(2026, 10, 22);
    opService.terminer(opOct.id);

    const detailOct = opService.obtenir(opOct.id);
    expect(detailOct.synthese.masse_salariale).toBe('3000.00');
    expect(detailOct.synthese.total_paye).toBe('3000');
    expect(detailOct.synthese.salaire_moyen).toBe('1500.00');
    expect(detailOct.synthese.nombre_employes).toBe(2);
    // Pas d'antérieure pour Octobre
    expect(detailOct.synthese.variations.total_paye.pourcentage).toBeNull();
    expect(detailOct.synthese.variations.total_paye.sens).toBeNull();

    // Opération 2 : Novembre 2026 (ouverte)
    const opNov = opService.ouvrir(2026, 11, 22);
    const detailNov1 = opService.obtenir(opNov.id);
    // Même base => stable 0.0%
    expect(detailNov1.synthese.variations.total_paye.pourcentage).toBe('0.0');
    expect(detailNov1.synthese.variations.total_paye.sens).toBe('stable');

    // Modifions la ligne pour augmenter le salaire de novembre (+100 HS)
    const resModif = ligneService.modifier(detailNov1.lignes[0].id, { hs: '100' });
    // total_paye passe à 3100 (3000 + 100) -> hausse : (3100 - 3000) / 3000 * 100 = 3.333% -> 3.3%
    expect(resModif.synthese.total_paye).toBe('3100');
    expect(resModif.synthese.variations.total_paye.pourcentage).toBe('3.3');
    expect(resModif.synthese.variations.total_paye.sens).toBe('hausse');
  });

  it('3. operations.lister enrichit chaque opération avec total_paye et sa variation', () => {
    empService.creer({ nom: 'Test', prenom: 'T', salaire_base: '1000' });
    const op1 = opService.ouvrir(2026, 1, 20);
    opService.terminer(op1.id);
    const op2 = opService.ouvrir(2026, 2, 20);

    const liste = opService.lister();
    expect(liste).toHaveLength(2);
    const fevrier = liste.find((o) => o.mois === 2)!;
    expect(fevrier.total_paye).toBe('1000');
    expect(fevrier.variation.pourcentage).toBe('0.0');
    expect(fevrier.variation.sens).toBe('stable');
  });
});
