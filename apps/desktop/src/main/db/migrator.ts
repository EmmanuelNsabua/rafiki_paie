import type Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface MigrationFichier {
  numero: number;
  nom: number | string;
  nomFichier: string;
  cheminFichier: string;
  sommeControle: string;
  contenuSql: string;
}

export class ErreurMigration extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErreurMigration';
    this.code = code;
  }
}

/**
 * Calcule l'empreinte SHA-256 du contenu d'un fichier en normalisant les fins de ligne (LF)
 * pour éviter les faux positifs entre environnements Windows (CRLF) et Linux (LF).
 */
export function calculerSommeControle(contenu: string): string {
  const normalise = contenu.replace(/\r\n/g, '\n').trim();
  return crypto.createHash('sha256').update(normalise, 'utf8').digest('hex');
}

/**
 * Localise le répertoire des migrations en tenant compte de l'exécution
 * en développement (src/...) ou empaquetée (dist/...).
 */
export function resoudreDossierMigrations(dossierPersonnalise?: string): string {
  if (dossierPersonnalise && fs.existsSync(dossierPersonnalise)) {
    return dossierPersonnalise;
  }

  const candidats = [
    path.join(__dirname, 'migrations'),
    path.join(__dirname, '../migrations'),
    path.join(__dirname, '../../migrations'),
    path.join(process.cwd(), 'apps/desktop/migrations'),
    path.join(process.cwd(), 'migrations'),
  ];

  for (const cand of candidats) {
    if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
      return cand;
    }
  }

  throw new ErreurMigration(
    'DOSSIER_MIGRATIONS_INTROUVABLE',
    `Impossible de trouver le dossier des migrations SQLite parmi les chemins explorés.`
  );
}

/**
 * Applique les migrations SQL dans l'ordre numérique strict.
 * Refuse le démarrage si la somme de contrôle d'une migration déjà appliquée a été altérée.
 */
export function executerMigrations(
  db: Database.Database,
  dossierMigrations?: string
): { appliquees: string[]; dejaAppliquees: number } {
  // 1. Initialiser la table de suivi des migrations
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      numero INTEGER PRIMARY KEY,
      nom TEXT NOT NULL,
      somme_controle TEXT NOT NULL,
      appliquee_le TEXT NOT NULL
    ) STRICT;
  `);

  const dossier = resoudreDossierMigrations(dossierMigrations);
  const fichiers = fs
    .readdirSync(dossier)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();

  const migrationsExistantes = db
    .prepare('SELECT numero, nom, somme_controle FROM schema_migrations ORDER BY numero ASC')
    .all() as Array<{ numero: number; nom: string; somme_controle: string }>;

  const mapExistantes = new Map<number, { nom: string; somme_controle: string }>();
  for (const m of migrationsExistantes) {
    mapExistantes.set(m.numero, { nom: m.nom, somme_controle: m.somme_controle });
  }

  const appliquees: string[] = [];

  for (const fichier of fichiers) {
    const match = fichier.match(/^(\d{4})_(.+)\.sql$/);
    if (!match) continue;

    const numero = parseInt(match[1], 10);
    const nom = match[2];
    const cheminComplet = path.join(dossier, fichier);
    const contenu = fs.readFileSync(cheminComplet, 'utf8');
    const sommeControle = calculerSommeControle(contenu);

    if (mapExistantes.has(numero)) {
      const existante = mapExistantes.get(numero)!;
      if (existante.somme_controle !== sommeControle) {
        throw new ErreurMigration(
          'SOMME_CONTROLE_ALTEREE',
          `La migration ${fichier} a été modifiée après son application initiale ` +
            `(enregistrée: ${existante.somme_controle}, actuelle: ${sommeControle}). Démarrage refusé.`
        );
      }
    } else {
      // Nouvelle migration à appliquer dans une transaction dédiée
      const inserer = db.prepare(`
        INSERT INTO schema_migrations (numero, nom, somme_controle, appliquee_le)
        VALUES (?, ?, ?, ?)
      `);

      const tx = db.transaction(() => {
        db.exec(contenu);
        inserer.run(numero, nom, sommeControle, new Date().toISOString());
      });

      tx();
      appliquees.push(fichier);
    }
  }

  return {
    appliquees,
    dejaAppliquees: mapExistantes.size,
  };
}
