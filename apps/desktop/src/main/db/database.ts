import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { executerMigrations } from './migrator';
import log from 'electron-log/main';

export interface OptionsOuvertureBase {
  cheminBase?: string;
  enMemoire?: boolean;
  cleChiffrement?: string;
  dossierMigrations?: string;
}

export function obtenirCheminBaseParDefaut(): string {
  const userDataPath = app?.getPath ? app.getPath('userData') : process.cwd();
  return path.join(userDataPath, 'rafiki_paie.sqlite');
}

/**
 * Ouvre et initialise la base de données SQLite locale avec application automatique des migrations.
 *
 * Décision de conception :
 * Le paramètre `cleChiffrement` est prévu dès maintenant dans la signature.
 * En l'absence de module SQLCipher compilé, cette clé n'altère pas le fonctionnement actuel
 * mais permettra une intégration future de SQLCipher ou du chiffrement au repos sans modifier
 * l'architecture d'appel.
 */
export function ouvrirBaseDeDonnees(options: OptionsOuvertureBase = {}): Database.Database {
  let cheminFinal: string;

  if (options.enMemoire) {
    cheminFinal = ':memory:';
  } else if (options.cheminBase) {
    cheminFinal = options.cheminBase;
  } else if (process.env.RAFIKI_DB_PATH) {
    cheminFinal = process.env.RAFIKI_DB_PATH;
  } else {
    // Chemin standard dans userData de l'application
    const userDataPath = app?.getPath ? app.getPath('userData') : process.cwd();
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    cheminFinal = path.join(userDataPath, 'rafiki_paie.sqlite');
  }

  // Création du répertoire parent si nécessaire
  if (cheminFinal !== ':memory:') {
    const dir = path.dirname(cheminFinal);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(cheminFinal);

  // Clé de chiffrement (support architectural pour SQLCipher)
  if (options.cleChiffrement) {
    // Si SQLCipher est lié, l'instruction PRAGMA key chiffre la base
    try {
      db.pragma(`key = '${options.cleChiffrement.replace(/'/g, "''")}'`);
    } catch {
      // Ignoré si le binaire SQLite standard ne dispose pas du pragma key
    }
  }

  // Pragmas obligatoires
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  if (cheminFinal !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }

  // Application des migrations
  const res = executerMigrations(db, options.dossierMigrations);
  if (res.appliquees.length > 0) {
    log.info(
      `[DATABASE] Migrations appliquées avec succès (${res.appliquees.length}) :`,
      res.appliquees.join(', ')
    );
  }

  return db;
}
