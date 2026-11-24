import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import { executerMigrations } from '../src/main/db/migrator';
import { EmployeService } from '../src/main/domain/employe-service';
import { OperationService } from '../src/main/domain/operation-service';
import { LigneService } from '../src/main/domain/ligne-service';
import { JournalService } from '../src/main/domain/journal-service';
import { ParametreService } from '../src/main/domain/parametre-service';
import { ImportExcelService } from '../src/main/domain/import-excel-service';

describe('ImportExcelService (Phase 3)', () => {
  let db: Database.Database;
  let employeService: EmployeService;
  let operationService: OperationService;
  let ligneService: LigneService;
  let journalService: JournalService;
  let importService: ImportExcelService;

  const cheminClasseurReel = path.resolve(
    __dirname,
    '../../../docs/annexes/02-GESTION_PAIE_ECOLE_RAFIKI_COMPLET.xlsx'
  );

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const parametreService = new ParametreService(db);
    journalService = new JournalService(db);
    employeService = new EmployeService(db, journalService, parametreService);
    operationService = new OperationService(db, journalService, parametreService);
    ligneService = new LigneService(db, journalService);

    importService = new ImportExcelService(
      db,
      employeService,
      operationService,
      ligneService,
      journalService
    );
  });

  afterEach(() => {
    db.close();
  });

  it('refuse les fichiers inexistants ou non conformes', () => {
    expect(() => importService.previsualiser('fichier_fantome.xlsx')).toThrow(/introuvable/i);

    const fauxFichier = path.join(__dirname, 'faux.txt');
    fs.writeFileSync(fauxFichier, 'ceci n est pas un excel');
    try {
      expect(() => importService.previsualiser(fauxFichier)).toThrow(/Seuls les classeurs Excel/i);
    } finally {
      if (fs.existsSync(fauxFichier)) fs.unlinkSync(fauxFichier);
    }
  });

  it('prévisualise avec succès le classeur historique réel de l école', () => {
    const prev = importService.previsualiser(cheminClasseurReel);

    expect(prev.valide).toBe(true);
    expect(prev.feuilleNom).toBe('Paie Mensuelle');
    expect(prev.totalLignes).toBeGreaterThanOrEqual(1);

    const ligne1 = prev.lignes[0];
    expect(ligne1.donnees.nom).toBe('KABONGO');
    expect(ligne1.donnees.postnom).toBe('ILUNGA');
    expect(ligne1.donnees.prenom).toBe('GLOIRE');
    expect(ligne1.donnees.fonction).toBe('PROFESSEUR (DISCIPLINE)');
    expect(ligne1.donnees.salaire_base).toBe('500.00');
    expect(ligne1.donnees.heures_supplementaires).toBe('40.00');
    expect(ligne1.donnees.retrait).toBe('20.00');
    expect(ligne1.donnees.jours_ouvrables).toBe(22);
    expect(ligne1.donnees.jours_maladie).toBe(2);
    expect(ligne1.donnees.jours_conge).toBe(1);
    expect(ligne1.donnees.jours_absence).toBe(1);
    expect(ligne1.estDoublon).toBe(false);
  });

  it('détecte les doublons avec les employés déjà enregistrés en base', () => {
    // Insérer d'abord KABONGO ILUNGA GLOIRE
    employeService.creer({
      nom: 'KABONGO',
      postnom: 'ILUNGA',
      prenom: 'GLOIRE',
      salaire_base: '500.00',
    });

    const prev = importService.previsualiser(cheminClasseurReel);
    const ligne1 = prev.lignes[0];
    expect(ligne1.estDoublon).toBe(true);
    expect(ligne1.employeExistantId).toBeDefined();
    expect(ligne1.action).toBe('mettre_a_jour');
  });

  it('importe de manière atomique les employés et l opération de paie', () => {
    const res = importService.executer({
      cheminFichier: cheminClasseurReel,
      annee: 2026,
      mois: 11,
      modeDoublon: 'mettre_a_jour',
      creerOperation: true,
      lignesAExclure: [],
    });

    expect(res.succes).toBe(true);
    expect(res.employesCrees).toBe(1);
    expect(res.operationCreeeId).toBeDefined();

    // Vérifier l'employé en base
    const employes = employeService.lister();
    expect(employes).toHaveLength(1);
    expect(employes[0].nom).toBe('KABONGO');
    expect(employes[0].salaire_base).toBe('500.00');

    // Vérifier l'opération et le calcul exact de la ligne
    const op = operationService.obtenir(res.operationCreeeId!);
    expect(op.lignes).toHaveLength(1);
    const ligne = op.lignes[0];
    expect(ligne.salaire_base).toBe('500.00');
    expect(ligne.hs).toBe('40.00');
    expect(ligne.retrait).toBe('20.00');
    expect(ligne.salaire_a_payer).toBe('520.00');
    expect(Number(ligne.net_global).toFixed(2)).toBe('474.55');
    expect(Number(ligne.virement)).toBe(470);

    // Vérifier le journal d'audit (sans PII)
    const journal = journalService.lister();
    const entryImport = journal.find((j) => j.action === 'IMPORTER_EXCEL');
    expect(entryImport).toBeDefined();
    expect(entryImport?.detail).not.toContain('KABONGO');
  });

  it('respecte le mode doublon refuser en rejetant l opération sans effet partiel', () => {
    // Créer un employé en avance
    employeService.creer({
      nom: 'KABONGO',
      postnom: 'ILUNGA',
      prenom: 'GLOIRE',
      salaire_base: '400.00',
    });

    expect(() =>
      importService.executer({
        cheminFichier: cheminClasseurReel,
        annee: 2026,
        mois: 11,
        modeDoublon: 'refuser',
        creerOperation: true,
        lignesAExclure: [],
      })
    ).toThrow(/existe déjà et le mode doublon est "refuser"/i);

    // Vérifier qu'aucune opération partielle n'a été créée
    const operations = operationService.lister();
    expect(operations).toHaveLength(0);

    // Le salaire de l'employé initial n'a pas été altéré
    const employes = employeService.lister();
    expect(employes[0].salaire_base).toBe('400.00');
  });
});
