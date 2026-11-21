import type Database from 'better-sqlite3';
import type { Parametre } from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';

export interface ParametreModifications {
  jours_ouvrables_defaut?: number;
  diviseur_retenue?: number;
  unite_arrondi?: number;
  code_banque_defaut?: string;
}

export class ParametreService {
  constructor(private db: Database.Database) {}

  /**
   * Lit les paramètres actuels de l'application.
   */
  lire(): Parametre {
    const row = this.db
      .prepare(
        `SELECT id, devise, jours_ouvrables_defaut, diviseur_retenue, unite_arrondi, code_banque_defaut, version, mis_a_jour_le
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
    const nouveauCodeBanque = (modifs.code_banque_defaut ?? actuel.code_banque_defaut).trim();

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
    if (nouveauCodeBanque === '') {
      throw new ErreurMetier(
        'CODE_BANQUE_INVALIDE',
        'Le code banque par défaut ne peut pas être vide.'
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
             code_banque_defaut = ?,
             version = ?,
             mis_a_jour_le = ?
         WHERE id = 'default'`
      )
      .run(
        nouveauxJours,
        nouveauDiviseur,
        nouvelleUnite,
        nouveauCodeBanque,
        nouvelleVersion,
        maintenant
      );

    return this.lire();
  }
}
