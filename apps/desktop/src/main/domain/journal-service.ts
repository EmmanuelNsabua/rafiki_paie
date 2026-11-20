import type Database from 'better-sqlite3';
import * as crypto from 'crypto';
import type { Journal } from '@rafiki/contrat';

export interface EntreeJournalCreation {
  action: string;
  entite: string;
  entite_id?: string;
  detail?: string;
}

export interface FiltresJournal {
  limite?: number;
  entite?: string;
}

export class JournalService {
  constructor(private db: Database.Database) {}

  /**
   * Enregistre un événement dans le journal d'audit (ajout seul).
   */
  ajouter(entree: EntreeJournalCreation): Journal {
    const id = crypto.randomUUID();
    const horodatage = new Date().toISOString();
    const entiteId = entree.entite_id ?? '';
    const detail = entree.detail ?? '';

    const stmt = this.db.prepare(`
      INSERT INTO journal (id, horodatage, action, entite, entite_id, detail)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, horodatage, entree.action, entree.entite, entiteId, detail);

    return {
      id,
      horodatage,
      action: entree.action,
      entite: entree.entite,
      entite_id: entiteId,
      detail,
    };
  }

  /**
   * Récupère la liste des événements du journal d'audit triés du plus récent au plus ancien.
   */
  lister(filtres: FiltresJournal = {}): Journal[] {
    const limite = filtres.limite ?? 100;

    if (filtres.entite) {
      const stmt = this.db.prepare(`
        SELECT id, horodatage, action, entite, entite_id, detail
        FROM journal
        WHERE entite = ?
        ORDER BY horodatage DESC
        LIMIT ?
      `);
      return stmt.all(filtres.entite, limite) as Journal[];
    }

    const stmt = this.db.prepare(`
      SELECT id, horodatage, action, entite, entite_id, detail
      FROM journal
      ORDER BY horodatage DESC
      LIMIT ?
    `);
    return stmt.all(limite) as Journal[];
  }
}
