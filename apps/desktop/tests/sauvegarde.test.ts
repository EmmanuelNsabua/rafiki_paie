import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Database from 'better-sqlite3';
import {
  SauvegardeService,
  formaterNomSauvegarde,
  OperationService,
  EmployeService,
  ErreurMetier,
} from '../src/main/domain';
import { executerMigrations } from '../src/main/db/migrator';

describe('SauvegardeService (Étape 6)', () => {
  let tempDir: string;
  let dbPath: string;
  let backupsDir: string;
  let db: Database.Database;
  let activeSauvegardeService: SauvegardeService | null = null;

  beforeEach(() => {
    activeSauvegardeService = null;
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-backup-test-'));
    dbPath = path.join(tempDir, 'rafiki_paie.sqlite');
    backupsDir = path.join(tempDir, 'sauvegardes');

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const migrationsDir = path.resolve(__dirname, '../migrations');
    executerMigrations(db, migrationsDir);
  });

  afterEach(() => {
    try {
      if (activeSauvegardeService?.db) {
        activeSauvegardeService.db.close();
      }
    } catch {}
    try {
      db.close();
    } catch {}
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('formate correctement le nom standardisé de sauvegarde', () => {
    const date = new Date(2026, 10, 20, 14, 5, 9); // 20 novembre 2026 14:05:09
    const nom = formaterNomSauvegarde(date);
    expect(nom).toBe('rafiki_paie_2026-11-20_140509.sqlite');
  });

  it('crée une copie de sauvegarde lisible, intègre et identique aux données sources', async () => {
    // Insérer un employé pour avoir des données
    const employeService = new EmployeService(db);
    employeService.creer({
      nom: 'KABILA',
      postnom: 'MUKENDI',
      prenom: 'Joseph',
      fonction: 'Enseignant',
      telephone: '+243999999999',
      code_banque: '804',
      salaire_base: '600.00',
    });

    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
    });

    const backupFile = await sauvegardeService.creerSauvegarde();

    expect(fs.existsSync(backupFile)).toBe(true);
    expect(path.basename(backupFile)).toMatch(/^rafiki_paie_\d{4}-\d{2}-\d{2}_\d{6}.*\.sqlite$/);

    // Vérifier l'intégrité et le contenu de la copie
    const dbBackup = new Database(backupFile, { readonly: true });
    const rowsIntegrity = dbBackup.pragma('integrity_check') as Array<{
      integrity_check: string;
    }>;
    expect(rowsIntegrity[0].integrity_check).toBe('ok');

    const empBackup = dbBackup
      .prepare('SELECT nom, salaire_base FROM employe WHERE nom = ?')
      .get('KABILA') as { nom: string; salaire_base: string };

    expect(empBackup).toBeDefined();
    expect(empBackup.nom).toBe('KABILA');
    expect(empBackup.salaire_base).toBe('600.00');

    dbBackup.close();
  });

  it('applique la rotation et conserve exactement les 10 dernières sauvegardes', async () => {
    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
      maxCopies: 10,
    });

    fs.mkdirSync(backupsDir, { recursive: true });

    // Simuler 12 sauvegardes à des dates différentes (du jour 1 au jour 12)
    for (let i = 1; i <= 12; i++) {
      const jourStr = i.toString().padStart(2, '0');
      const date = new Date(2026, 10, i, 12, 0, 0);
      const nom = `rafiki_paie_2026-11-${jourStr}_120000.sqlite`;
      const filePath = path.join(backupsDir, nom);

      // Créer une copie valide de la base
      await db.backup(filePath);
    }

    let sauvegardes = sauvegardeService.listerSauvegardes();
    expect(sauvegardes.length).toBe(12);

    // Appliquer la rotation
    sauvegardeService.appliquerRotation();

    sauvegardes = sauvegardeService.listerSauvegardes();
    expect(sauvegardes.length).toBe(10);

    // Les fichiers des jours 01 et 02 doivent être supprimés
    expect(fs.existsSync(path.join(backupsDir, 'rafiki_paie_2026-11-01_120000.sqlite'))).toBe(
      false
    );
    expect(fs.existsSync(path.join(backupsDir, 'rafiki_paie_2026-11-02_120000.sqlite'))).toBe(
      false
    );

    // Les fichiers du jour 03 au jour 12 doivent être conservés
    expect(fs.existsSync(path.join(backupsDir, 'rafiki_paie_2026-11-03_120000.sqlite'))).toBe(true);
    expect(fs.existsSync(path.join(backupsDir, 'rafiki_paie_2026-11-12_120000.sqlite'))).toBe(true);
  });

  it('vérifie et déclenche la sauvegarde au démarrage selon la règle des 24h', async () => {
    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
    });

    // Cas 1 : aucune sauvegarde -> doit créer une sauvegarde
    const premiere = await sauvegardeService.verifierEtSauvegarderAuDemarrage();
    expect(premiere).not.toBeNull();
    expect(fs.existsSync(premiere!)).toBe(true);

    // Cas 2 : sauvegarde récente (< 24h) -> ne doit rien créer
    const deuxieme = await sauvegardeService.verifierEtSauvegarderAuDemarrage();
    expect(deuxieme).toBeNull();

    // Cas 3 : sauvegarde de plus de 24h -> doit créer une nouvelle sauvegarde
    const ilYaDeuxJours = new Date(Date.now() - 48 * 3600 * 1000);
    const nomAncien = formaterNomSauvegarde(ilYaDeuxJours);
    const cheminAncien = path.join(backupsDir, nomAncien);
    fs.renameSync(premiere!, cheminAncien);

    const troisieme = await sauvegardeService.verifierEtSauvegarderAuDemarrage();
    expect(troisieme).not.toBeNull();
    expect(troisieme).not.toBe(cheminAncien);
  });

  it('restaure avec succès une sauvegarde valide et remplace la base active', async () => {
    const empService = new EmployeService(db);
    empService.creer({
      nom: 'INITIAL',
      postnom: 'TEST',
      prenom: 'Jean',
      fonction: 'Directeur',
      telephone: '+243888888888',
      code_banque: '804',
      salaire_base: '1000.00',
    });

    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
    });
    activeSauvegardeService = sauvegardeService;

    // 1. Faire une sauvegarde contenant l'employé INITIAL
    const backupFile = await sauvegardeService.creerSauvegarde();

    // 2. Modifier la base active en ajoutant un deuxième employé
    empService.creer({
      nom: 'APRES_BACKUP',
      postnom: 'TEST',
      prenom: 'Paul',
      fonction: 'Comptable',
      telephone: '+243777777777',
      code_banque: '804',
      salaire_base: '800.00',
    });

    expect(empService.lister().length).toBe(2);

    // 3. Restaurer la sauvegarde
    sauvegardeService.restaurer(backupFile);

    // 4. Vérifier que la base restaurée ne contient que l'employé INITIAL
    const dbRestaurée = new Database(dbPath, { readonly: true });
    const empList = dbRestaurée.prepare('SELECT nom FROM employe').all() as Array<{
      nom: string;
    }>;
    expect(empList.length).toBe(1);
    expect(empList[0].nom).toBe('INITIAL');
    dbRestaurée.close();
  });

  it('refuse de restaurer un fichier corrompu et préserve la base intacte', () => {
    const empService = new EmployeService(db);
    empService.creer({
      nom: 'NON_TOUCHE',
      postnom: 'BASE',
      prenom: 'Marc',
      fonction: 'Gardien',
      telephone: '+243666666666',
      code_banque: '804',
      salaire_base: '300.00',
    });

    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
    });

    // Créer un fichier de sauvegarde corrompu (octets aléatoires / texte bidon)
    fs.mkdirSync(backupsDir, { recursive: true });
    const fichierCorrompu = path.join(backupsDir, 'rafiki_paie_corrompue.sqlite');
    fs.writeFileSync(fichierCorrompu, 'Ceci n est pas une base de donnees SQLite valide du tout !');

    let erreurCapturee: any = null;
    try {
      sauvegardeService.restaurer(fichierCorrompu);
    } catch (err) {
      erreurCapturee = err;
    }

    expect(erreurCapturee).toBeInstanceOf(ErreurMetier);
    expect(erreurCapturee.code).toBe('FICHIER_CORROMPU');

    // Vérifier que la base active n'a pas été altérée
    const empActuel = db.prepare('SELECT nom FROM employe WHERE nom = ?').get('NON_TOUCHE') as {
      nom: string;
    };
    expect(empActuel).toBeDefined();
    expect(empActuel.nom).toBe('NON_TOUCHE');
  });

  it('déclenche automatiquement la sauvegarde lors de la terminaison d une opération', async () => {
    const empService = new EmployeService(db);
    empService.creer({
      nom: 'MUTOMBO',
      postnom: 'DIKEMBE',
      prenom: 'Jean',
      fonction: 'Professeur',
      telephone: '+243123456789',
      code_banque: '804',
      salaire_base: '500.00',
    });

    const sauvegardeService = new SauvegardeService({
      dossierSauvegardes: backupsDir,
      db,
      cheminFichierDb: dbPath,
    });

    const opService = new OperationService(db, undefined, undefined, sauvegardeService);

    const op = opService.ouvrir(2026, 11, 22);

    expect(sauvegardeService.listerSauvegardes().length).toBe(0);

    // Clôture de l'opération
    opService.terminer(op.id);

    // Attendre un court instant que la promesse asynchrone db.backup() se termine
    await new Promise((resolve) => setTimeout(resolve, 150));

    const sauvegardes = sauvegardeService.listerSauvegardes();
    expect(sauvegardes.length).toBe(1);
    expect(sauvegardes[0].tailleOctets).toBeGreaterThan(0);
  });
});
