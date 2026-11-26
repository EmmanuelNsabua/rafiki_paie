import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { executerMigrations, ErreurMigration } from '../src/main/db/migrator';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Migrateur SQLite (schema_migrations & intégrité)', () => {
  it('applique les migrations avec succès sur une base vierge', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    const res = executerMigrations(db);
    expect(res.appliquees.length).toBeGreaterThan(0);
    expect(res.dejaAppliquees).toBe(0);

    // Vérifier les tables créées
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC")
      .all()
      .map((r: any) => r.name);

    expect(tables).toContain('schema_migrations');
    expect(tables).toContain('parametre');
    expect(tables).toContain('employe');
    expect(tables).toContain('operation_paie');
    expect(tables).toContain('ligne_paie');
    expect(tables).toContain('journal');

    db.close();
  });

  it('est idempotent : réexécuter les migrations ne fait rien', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    const premierPassage = executerMigrations(db);
    expect(premierPassage.appliquees.length).toBeGreaterThan(0);

    const secondPassage = executerMigrations(db);
    expect(secondPassage.appliquees.length).toBe(0);
    expect(secondPassage.dejaAppliquees).toBe(premierPassage.appliquees.length);

    db.close();
  });

  it('refuse le démarrage si la somme de contrôle d une migration déjà appliquée a changé', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-mig-test-'));
    const migFile = path.join(tempDir, '0001_test.sql');

    fs.writeFileSync(migFile, 'CREATE TABLE test_table (id INTEGER PRIMARY KEY);', 'utf8');

    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Première exécution normale
    const res1 = executerMigrations(db, tempDir);
    expect(res1.appliquees).toContain('0001_test.sql');

    // Altération du fichier de migration
    fs.writeFileSync(
      migFile,
      'CREATE TABLE test_table (id INTEGER PRIMARY KEY, modifie TEXT);',
      'utf8'
    );

    // Deuxième exécution : doit refuser
    expect(() => executerMigrations(db, tempDir)).toThrow(ErreurMigration);
    try {
      executerMigrations(db, tempDir);
    } catch (e: any) {
      expect(e.code).toBe('SOMME_CONTROLE_ALTEREE');
    }

    db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('active le mode STRICT et refuse les types incohérents', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    executerMigrations(db);

    // Tentative d'insertion d'un numéro non entier dans employe (STRICT)
    expect(() => {
      db.prepare(
        `INSERT INTO employe (id, numero, nom, salaire_base, mis_a_jour_le)
         VALUES (?, ?, ?, ?, ?)`
      ).run('e1', 'pas-un-nombre', 'Test', '500', new Date().toISOString());
    }).toThrow();

    db.close();
  });

  it('refuse d ouvrir une base plus récente que l application (protection du schéma Lot 2)', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    // Appliquer les migrations normales
    executerMigrations(db);

    // Simuler l'insertion d'une migration future (ex: 9999) issue d'une version ultérieure de Starclip
    db.prepare(
      `INSERT INTO schema_migrations (numero, nom, somme_controle, appliquee_le)
       VALUES (?, ?, ?, ?)`
    ).run(9999, 'future_migration', 'fake_hash', new Date().toISOString());

    // Vérifier que toute tentative d'exécution ultérieure refuse strictement la base
    expect(() => executerMigrations(db)).toThrow(ErreurMigration);
    try {
      executerMigrations(db);
    } catch (e: any) {
      expect(e.code).toBe('BASE_TROP_RECENTE');
      expect(e.message).toContain('Cette version de Starclip est plus ancienne que vos données');
    }

    db.close();
  });
});
