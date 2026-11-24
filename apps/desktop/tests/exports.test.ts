import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as XLSX from 'xlsx';
import Database from 'better-sqlite3';
import { executerMigrations } from '../src/main/db/migrator';
import { EmployeService } from '../src/main/domain/employe-service';
import { OperationService } from '../src/main/domain/operation-service';
import { LigneService } from '../src/main/domain/ligne-service';
import { JournalService } from '../src/main/domain/journal-service';
import { ParametreService } from '../src/main/domain/parametre-service';
import { BordereauService } from '../src/main/domain/bordereau-service';
import { ExportService } from '../src/main/domain/export-service';

describe('Exports Métier (Phase 3)', () => {
  let db: Database.Database;
  let employeService: EmployeService;
  let operationService: OperationService;
  let ligneService: LigneService;
  let journalService: JournalService;
  let bordereauService: BordereauService;
  let exportService: ExportService;
  let dossierTest: string;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    const parametreService = new ParametreService(db);
    journalService = new JournalService(db);
    employeService = new EmployeService(db, journalService, parametreService);
    operationService = new OperationService(db, journalService, parametreService);
    ligneService = new LigneService(db, journalService);
    bordereauService = new BordereauService(db, operationService, journalService);
    exportService = new ExportService(db, employeService, operationService, journalService);

    dossierTest = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-exports-test-'));
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(dossierTest)) {
      fs.rmSync(dossierTest, { recursive: true, force: true });
    }
  });

  function creerDonneesTest() {
    const emp1 = employeService.creer({
      nom: 'KABONGO',
      postnom: 'ILUNGA',
      prenom: 'GLOIRE',
      fonction: 'PROFESSEUR',
      telephone: '+243810000001',
      salaire_base: '500.00',
    });

    const emp2 = employeService.creer({
      nom: 'MUTOMBO',
      postnom: 'KAZADI',
      prenom: 'JEAN',
      fonction: 'COMPTABLE',
      telephone: '+243810000002',
      salaire_base: '600.00',
    });

    const op = operationService.ouvrir(2026, 11, 22);

    const detailOp = operationService.obtenir(op.id);
    const ligne1 = detailOp.lignes.find((l) => l.employe_id === emp1.id)!;
    ligneService.modifier(ligne1.id, {
      hs: '40.00',
      retrait: '20.00',
      jours_maladie: 2,
      jours_conge: 1,
      jours_absence: 1,
    });

    return { emp1, emp2, opId: op.id };
  }

  it('exporte la liste des employés en XLSX et CSV avec protection anti-injection', () => {
    // Employé avec formule suspecte pour tester l'assainissement
    employeService.creer({
      nom: '=CMD|calc',
      postnom: '+FORMULE',
      prenom: 'TEST',
      salaire_base: '300.00',
    });

    const fichierXlsx = path.join(dossierTest, 'employes.xlsx');
    const resXlsx = exportService.exporterEmployes({
      format: 'xlsx',
      cheminDestination: fichierXlsx,
    });

    expect(resXlsx.succes).toBe(true);
    expect(fs.existsSync(fichierXlsx)).toBe(true);

    const wb = XLSX.readFile(fichierXlsx);
    const ws = wb.Sheets['Employés'];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
    expect(rows[0]).toContain('Salaire de base ($)');
    // Vérification anti-injection : le préfixe = a été neutralisé
    expect(rows[1][1]).toMatch(/^'=CMD/);

    // Test CSV
    const fichierCsv = path.join(dossierTest, 'employes.csv');
    const resCsv = exportService.exporterEmployes({
      format: 'csv',
      cheminDestination: fichierCsv,
    });
    expect(resCsv.succes).toBe(true);
    const contenuCsv = fs.readFileSync(fichierCsv, 'utf-8');
    expect(contenuCsv.startsWith('\uFEFF')).toBe(true); // BOM UTF-8
    expect(contenuCsv).toContain(';Statut');
  });

  it('exporte une opération de paie mensuelle conforme à la maquette Paie Mensuelle', () => {
    const { opId } = creerDonneesTest();

    const fichierXlsx = path.join(dossierTest, 'paie_mensuelle.xlsx');
    const res = exportService.exporterOperation({
      operationId: opId,
      format: 'xlsx',
      cheminDestination: fichierXlsx,
    });

    expect(res.succes).toBe(true);
    expect(fs.existsSync(fichierXlsx)).toBe(true);

    const wb = XLSX.readFile(fichierXlsx);
    const ws = wb.Sheets['Paie Mensuelle'];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // En-têtes complets
    expect(rows[0]).toContain('SALAIRE A PAYER');
    expect(rows[0]).toContain('VIREMENT BANQUE (ARRONDI)');

    // Données KABONGO
    const rowKabongo = rows.find((r) => r[1] === 'KABONGO')!;
    expect(rowKabongo[5]).toBe(500); // Salaire
    expect(rowKabongo[6]).toBe(40); // HS
    expect(rowKabongo[7]).toBe(20); // Retrait
    expect(rowKabongo[8]).toBe(520); // Salaire à payer
    expect(rowKabongo[19]).toBe(470); // Virement arrondi

    // Ligne de total général
    const rowTotal = rows.find((r) => r[0] === 'TOTAL GÉNÉRAL PAIE MENSUELLE')!;
    expect(rowTotal).toBeDefined();
    expect(rowTotal[5]).toBe(1100); // 500 + 600
  });

  it('exporte la synthèse Récapitulatif & Contrôle avec l écart d arrondi corrigé', () => {
    const { opId } = creerDonneesTest();

    const fichierXlsx = path.join(dossierTest, 'recap.xlsx');
    const res = exportService.exporterRecapitulatif({
      operationId: opId,
      format: 'xlsx',
      cheminDestination: fichierXlsx,
    });

    expect(res.succes).toBe(true);
    const wb = XLSX.readFile(fichierXlsx);
    const ws = wb.Sheets['Récapitulatif & Contrôle'];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Ligne Écart d'arrondissement global
    const rowEcart = rows.find((r) => r[0] === 'Écart d arrondissement global')!;
    expect(rowEcart).toBeDefined();
    expect(rowEcart[2]).toContain('Virements - Globaux');
  });

  it('exporte les bulletins individuels et collectifs en format officiel', () => {
    const { opId, emp1 } = creerDonneesTest();

    // 1. Individuel
    const fichierIndividuel = path.join(dossierTest, 'bulletin_kabongo.html');
    const resIndiv = exportService.exporterBulletins({
      operationId: opId,
      employeId: emp1.id,
      format: 'html',
      cheminDestination: fichierIndividuel,
    });

    expect(resIndiv.succes).toBe(true);
    const contenuIndiv = fs.readFileSync(fichierIndividuel, 'utf-8');
    expect(contenuIndiv).toContain('École Rafiki — Bulletin de paie individuel');
    expect(contenuIndiv).toContain('République Démocratique du Congo');
    expect(contenuIndiv).toContain('KABONGO');
    expect(contenuIndiv).toContain('470 $'); // Virement net

    // 2. Collectif (tous les employés)
    const fichierCollectif = path.join(dossierTest, 'bulletins_collectifs.html');
    const resColl = exportService.exporterBulletins({
      operationId: opId,
      format: 'html',
      cheminDestination: fichierCollectif,
    });
    expect(resColl.succes).toBe(true);
    expect(resColl.nombreLignes).toBe(2);
  });

  it('génère le bordereau bancaire en XLSX via BordereauService avec colonnes exactes et total', () => {
    const { opId } = creerDonneesTest();

    const fichierBordereau = path.join(dossierTest, 'bordereau.xlsx');
    const res = bordereauService.exporter(opId, 'xlsx', fichierBordereau);

    expect(res.cheminFichier).toBe(fichierBordereau);
    expect(fs.existsSync(fichierBordereau)).toBe(true);

    const wb = XLSX.readFile(fichierBordereau);
    const ws = wb.Sheets['Bordereau de virement'];
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

    // Colonnes exactes : N°, nom, postnom, prénom, téléphone, code banque, virement
    expect(rows[0]).toEqual([
      'N°',
      'Nom',
      'Postnom',
      'Prénom',
      'Téléphone',
      'Code banque',
      'Virement',
    ]);

    // Ligne Total à provisionner
    const rowTotal = rows.find((r) => r[0] === 'Total à provisionner')!;
    expect(rowTotal).toBeDefined();
    expect(rowTotal[6]).toBe(1070); // 470 (Kabongo) + 600 (Mutombo)
  });
});
