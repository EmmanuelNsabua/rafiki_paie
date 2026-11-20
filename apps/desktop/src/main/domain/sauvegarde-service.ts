import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import log from 'electron-log/main';
import { ErreurMetier } from './erreurs';

if (process.env.NODE_ENV === 'test') {
  log.transports.file.level = false;
}

export interface SauvegardeServiceOptions {
  /** Dossier où sont enregistrées les sauvegardes (ex: userData/sauvegardes) */
  dossierSauvegardes: string;
  /** Instance active de la base SQLite */
  db: Database.Database;
  /** Chemin vers le fichier .sqlite sur disque (facultatif si base en mémoire) */
  cheminFichierDb?: string;
  /** Nombre maximum de sauvegardes conservées (défaut: 10) */
  maxCopies?: number;
}

export interface FichierSauvegarde {
  nom: string;
  cheminComplet: string;
  tailleOctets: number;
  creeLe: Date;
}

/**
 * Formate le nom standardisé d'un fichier de sauvegarde :
 * rafiki_paie_AAAA-MM-JJ_HHMMSS.sqlite
 */
export function formaterNomSauvegarde(date: Date = new Date()): string {
  const annee = date.getFullYear().toString().padStart(4, '0');
  const mois = (date.getMonth() + 1).toString().padStart(2, '0');
  const jour = date.getDate().toString().padStart(2, '0');
  const heures = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const secondes = date.getSeconds().toString().padStart(2, '0');

  return `rafiki_paie_${annee}-${mois}-${jour}_${heures}${minutes}${secondes}.sqlite`;
}

/**
 * Service de gestion des sauvegardes locales automatiques et de leur rotation.
 */
export class SauvegardeService {
  private dossierSauvegardes: string;
  private maxCopies: number;

  constructor(private options: SauvegardeServiceOptions) {
    this.dossierSauvegardes = options.dossierSauvegardes;
    this.maxCopies = options.maxCopies ?? 10;
  }

  get db(): Database.Database {
    return this.options.db;
  }

  set db(nouvelleDb: Database.Database) {
    this.options.db = nouvelleDb;
  }

  private assurerDossierExiste(): void {
    if (!fs.existsSync(this.dossierSauvegardes)) {
      fs.mkdirSync(this.dossierSauvegardes, { recursive: true });
    }
  }

  /**
   * Crée une copie de sauvegarde de la base SQLite active via db.backup().
   * Applique ensuite la rotation pour conserver au maximum `maxCopies` fichiers.
   */
  async creerSauvegarde(date: Date = new Date()): Promise<string> {
    this.assurerDossierExiste();

    let nom = formaterNomSauvegarde(date);
    let cheminComplet = path.join(this.dossierSauvegardes, nom);

    // En cas de sauvegardes multiples créées dans la même seconde
    if (fs.existsSync(cheminComplet)) {
      let counter = 1;
      const base = nom.slice(0, -7); // retirer .sqlite
      while (fs.existsSync(path.join(this.dossierSauvegardes, `${base}_${counter}.sqlite`))) {
        counter++;
      }
      nom = `${base}_${counter}.sqlite`;
      cheminComplet = path.join(this.dossierSauvegardes, nom);
    }

    try {
      await this.options.db.backup(cheminComplet);
      log.info(`[SAUVEGARDE] Nouvelle sauvegarde créée : ${nom}`);
    } catch (err: any) {
      log.error(`[SAUVEGARDE] Échec de la copie de sauvegarde : ${err?.message}`);
      throw new ErreurMetier(
        'SAUVEGARDE_ECHOUEE',
        `Impossible de créer la sauvegarde : ${err?.message}`
      );
    }

    // Appliquer la rotation
    this.appliquerRotation();

    return cheminComplet;
  }

  /**
   * Liste les fichiers de sauvegarde existants, triés du plus récent au plus ancien.
   */
  listerSauvegardes(): FichierSauvegarde[] {
    if (!fs.existsSync(this.dossierSauvegardes)) {
      return [];
    }

    const pattern = /^rafiki_paie_\d{4}-\d{2}-\d{2}_\d{6}.*\.sqlite$/;
    const entrees = fs.readdirSync(this.dossierSauvegardes);

    const fichiers: FichierSauvegarde[] = [];

    for (const nom of entrees) {
      if (pattern.test(nom)) {
        const cheminComplet = path.join(this.dossierSauvegardes, nom);
        try {
          const stat = fs.statSync(cheminComplet);
          let creeLe: Date;
          const match = nom.match(/^rafiki_paie_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/);
          if (match) {
            const [, annee, mois, jour, h, m, s] = match;
            creeLe = new Date(
              Number(annee),
              Number(mois) - 1,
              Number(jour),
              Number(h),
              Number(m),
              Number(s)
            );
          } else {
            creeLe = stat.mtime;
          }

          fichiers.push({
            nom,
            cheminComplet,
            tailleOctets: stat.size,
            creeLe,
          });
        } catch {
          // Fichier inaccessible, ignorer
        }
      }
    }

    // Tri décroissant : les plus récents en premier (tri alphabétique naturel sur le nom AAAA-MM-JJ_HHMMSS)
    fichiers.sort((a, b) => b.nom.localeCompare(a.nom));

    return fichiers;
  }

  /**
   * Conserve uniquement les N dernières copies (maxCopies, défaut 10).
   * Supprime les plus anciennes.
   */
  appliquerRotation(): void {
    const fichiers = this.listerSauvegardes();
    if (fichiers.length > this.maxCopies) {
      const aSupprimer = fichiers.slice(this.maxCopies);
      for (const f of aSupprimer) {
        try {
          fs.unlinkSync(f.cheminComplet);
          log.info(`[SAUVEGARDE] Rotation : ancienne sauvegarde supprimée (${f.nom})`);
        } catch (err: any) {
          log.warn(`[SAUVEGARDE] Impossible de supprimer la sauvegarde ${f.nom} : ${err?.message}`);
        }
      }
    }
  }

  /**
   * Vérifie au démarrage si une sauvegarde doit être déclenchée :
   * - Si aucune sauvegarde n'existe
   * - Si la plus récente date de plus de 24 heures
   */
  async verifierEtSauvegarderAuDemarrage(): Promise<string | null> {
    const fichiers = this.listerSauvegardes();
    if (fichiers.length === 0) {
      log.info('[SAUVEGARDE] Aucune sauvegarde existante. Création au démarrage.');
      return await this.creerSauvegarde();
    }

    const derniere = fichiers[0];
    const ageMs = Date.now() - derniere.creeLe.getTime();
    const vingtQuatreHeuresMs = 24 * 60 * 60 * 1000;

    if (ageMs > vingtQuatreHeuresMs) {
      log.info(
        `[SAUVEGARDE] Dernière sauvegarde vieille de plus de 24h (${derniere.nom}). Création au démarrage.`
      );
      return await this.creerSauvegarde();
    }

    log.info(`[SAUVEGARDE] Sauvegarde récente disponible (< 24h: ${derniere.nom}).`);
    return null;
  }

  /**
   * Restaure la base de données à partir d'un fichier de sauvegarde :
   * 1. Vérifie l'existence du fichier
   * 2. Exécute PRAGMA integrity_check sur la sauvegarde
   * 3. Met de côté la base actuelle dans un fichier fallback
   * 4. Remplace la base actuelle par la sauvegarde
   * 5. Vérifie la nouvelle base restaurée
   */
  restaurer(fichierBackup: string): void {
    if (!fs.existsSync(fichierBackup)) {
      throw new ErreurMetier(
        'FICHIER_INTROUVABLE',
        `Le fichier de sauvegarde spécifié est introuvable : ${path.basename(fichierBackup)}`
      );
    }

    // 1. Contrôle d'intégrité de la sauvegarde à restaurer
    let checkDb: Database.Database | null = null;
    try {
      checkDb = new Database(fichierBackup, { readonly: true });
      const rows = checkDb.pragma('integrity_check') as Array<{ integrity_check: string }>;
      if (!rows || rows.length === 0 || rows[0].integrity_check !== 'ok') {
        throw new Error(`Contrôle d'intégrité échoué: ${JSON.stringify(rows)}`);
      }
    } catch {
      throw new ErreurMetier(
        'FICHIER_CORROMPU',
        'Le fichier de sauvegarde est corrompu ou invalide et ne peut pas être restauré.'
      );
    } finally {
      if (checkDb) {
        try {
          checkDb.close();
        } catch {}
      }
    }

    const cheminDb = this.options.cheminFichierDb;
    if (!cheminDb || cheminDb === ':memory:') {
      // Pour une base sans fichier disque (mémoire), le contrôle d'intégrité suffit
      return;
    }

    // 2. Mise de côté de la base actuelle (fallback de sécurité)
    const cheminFallback = `${cheminDb}.restore_bak_${Date.now()}`;
    let fallbackCree = false;

    try {
      // Fermer la base active si encore ouverte
      try {
        this.options.db.close();
      } catch {}

      if (fs.existsSync(cheminDb)) {
        fs.copyFileSync(cheminDb, cheminFallback);
        fallbackCree = true;
      }

      // Supprimer d'éventuels journaux WAL résiduels
      for (const ext of ['-wal', '-shm']) {
        const walShm = cheminDb + ext;
        if (fs.existsSync(walShm)) {
          try {
            fs.unlinkSync(walShm);
          } catch {}
        }
      }

      // 3. Remplacement physique
      fs.copyFileSync(fichierBackup, cheminDb);

      // 4. Vérification de la base restaurée
      const verif = new Database(cheminDb, { readonly: true });
      const rowsVerif = verif.pragma('integrity_check') as Array<{ integrity_check: string }>;
      verif.close();

      if (!rowsVerif || rowsVerif.length === 0 || rowsVerif[0].integrity_check !== 'ok') {
        throw new Error('La base restaurée a échoué au contrôle d intégrité');
      }

      // Réouvrir la base
      this.options.db = new Database(cheminDb);
      this.options.db.pragma('journal_mode = WAL');
      this.options.db.pragma('foreign_keys = ON');

      // Nettoyer le fallback
      if (fallbackCree && fs.existsSync(cheminFallback)) {
        try {
          fs.unlinkSync(cheminFallback);
        } catch {}
      }

      log.info(`[SAUVEGARDE] Restauration avec succès depuis ${path.basename(fichierBackup)}`);
    } catch (err: any) {
      log.error(
        `[SAUVEGARDE] Échec restauration : ${err?.message}. Tentative de restauration du fallback.`
      );
      if (fallbackCree && fs.existsSync(cheminFallback)) {
        try {
          fs.copyFileSync(cheminFallback, cheminDb);
          fs.unlinkSync(cheminFallback);
        } catch {}
      }
      throw new ErreurMetier(
        'RESTAURATION_ECHOUEE',
        `Échec de la restauration de la base : ${err?.message}`
      );
    }
  }
}
