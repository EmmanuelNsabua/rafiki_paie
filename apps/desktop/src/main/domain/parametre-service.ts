import type Database from 'better-sqlite3';
import type { Parametre } from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';

export interface ParametreModifications {
  jours_ouvrables_defaut?: number;
  diviseur_retenue?: number;
  unite_arrondi?: number;
}

export class ParametreService {
  constructor(private db: Database.Database) {}

  /**
   * Lit les paramètres actuels de l'application.
   */
  lire(): Parametre {
    const row = this.db
      .prepare(
        `SELECT id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, version, mis_a_jour_le
         FROM parametre
         WHERE id = 'default'`
      )
      .get() as Parametre | undefined;

    if (!row) {
      throw new ErreurMetier(
        'PARAMETRES_INTROUVABLES',
        'La configuration des paramètres par défaut est introuvable.'
      );
    }

    return row;
  }

  /**
   * Met à jour les paramètres de calcul.
   */
  modifier(modifs: ParametreModifications): Parametre {
    const actuel = this.lire();

    const nouveauxJours = modifs.jours_ouvrables_defaut ?? actuel.jours_ouvrables_defaut;
    const nouveauDiviseur = modifs.diviseur_retenue ?? actuel.diviseur_retenue;
    const nouvelleUnite = modifs.unite_arrondi ?? actuel.unite_arrondi;

    if (nouveauxJours < 1) {
      throw new ErreurMetier(
        'JOURS_OUVRABLES_INVALIDES',
        'Le nombre de jours ouvrables par défaut doit être supérieur ou égal à 1.'
      );
    }
    if (nouveauDiviseur < 1) {
      throw new ErreurMetier(
        'DIVISEUR_INVALID',
        'Le diviseur de retenue doit être supérieur ou égal à 1.'
      );
    }
    if (nouvelleUnite < 1) {
      throw new ErreurMetier(
        'UNITE_ARRONDI_INVALIDE',
        'L unité d arrondi doit être supérieure ou égale à 1.'
      );
    }

    const maintenant = new Date().toISOString();
    const nouvelleVersion = actuel.version + 1;

    this.db
      .prepare(
        `UPDATE parametre
         SET jours_ouvrables_defaut = ?,
             diviseur_retenue = ?,
             unite_arrondi = ?,
             version = ?,
             mis_a_jour_le = ?
         WHERE id = 'default'`
      )
      .run(nouveauxJours, nouveauDiviseur, nouvelleUnite, nouvelleVersion, maintenant);

    return this.lire();
  }
}
