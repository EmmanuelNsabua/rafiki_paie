import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SauvegardeService, UpdateService } from '../src/main/domain';
import { executerMigrations } from '../src/main/db/migrator';

describe('Service de mise à jour et sauvegarde préalable (Lot 2)', () => {
  let tempDir: string;
  let dbPath: string;
  let db: Database.Database;
  let sauvegardeService: SauvegardeService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-update-test-'));
    dbPath = path.join(tempDir, 'active.sqlite');
    db = new Database(dbPath);
    executerMigrations(db);

    sauvegardeService = new SauvegardeService({
      dossierSauvegardes: path.join(tempDir, 'sauvegardes'),
      db,
      cheminFichierDb: dbPath,
    });
  });

  afterEach(() => {
    if (db) db.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('crée une sauvegarde avant mise à jour avec le nommage spécifique ..._avant-maj-<version>.sqlite', async () => {
    const chemin = await sauvegardeService.creerSauvegardeAvantMaj('0.2.0');

    expect(fs.existsSync(chemin)).toBe(true);
    expect(path.basename(chemin)).toBe('rafiki_paie_avant-maj-0.2.0.sqlite');

    // Vérifier que la copie est une base SQLite valide et lisible
    const dbTest = new Database(chemin);
    const row = dbTest.prepare('SELECT count(*) as total FROM schema_migrations').get() as any;
    expect(row.total).toBeGreaterThan(0);
    dbTest.close();
  });

  it('initialise UpdateService et gère la vérification en mode développement sans erreur', async () => {
    const updateService = new UpdateService(sauvegardeService, () => null);

    const etatInitial = updateService.obtenirEtat();
    expect(etatInitial.statut).toBe('inactif');

    const res = await updateService.verifierMiseAJour();
    expect(res.statut).toBe('a-jour');
    expect(res.message).toContain('application empaquetée');
  });
});
