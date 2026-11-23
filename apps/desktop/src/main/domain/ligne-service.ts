import type Database from 'better-sqlite3';
import Decimal from 'decimal.js';
import type { LignePaie, LignePaieCalculee, TotauxOperation, SyntheseOperation } from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';
import { ParametreService } from './parametre-service';
import { OperationService } from './operation-service';
import { calculerMontantsLigne, calculerTotauxOperation } from './calcul-totaux';

export interface LigneVariablesModification {
  hs?: string;
  retrait?: string;
  jours_ouvrables?: number;
  jours_maladie?: string;
  jours_conge?: string;
  jours_absence?: string;
}

export interface ResultatModificationLigne {
  ligne: LignePaieCalculee;
  totaux: TotauxOperation;
  synthese: SyntheseOperation;
}

export class LigneService {
  private parametreService: ParametreService;

  constructor(private db: Database.Database) {
    this.parametreService = new ParametreService(db);
  }

  /**
   * Obtient une ligne de paie brute par son identifiant.
   */
  obtenir(ligneId: string): LignePaie {
    const ligne = this.db
      .prepare('SELECT * FROM ligne_paie WHERE id = ? AND supprime_le IS NULL')
      .get(ligneId) as LignePaie | undefined;

    if (!ligne) {
      throw new ErreurMetier('LIGNE_INTROUVABLE', `Ligne de paie introuvable (${ligneId}).`);
    }

    return ligne;
  }

  /**
   * Modifie les variables de paie d'une ligne.
   * - Refusé si l'opération est terminée.
   * - Contrôle : valeurs >= 0.
   * - Contrôle : maladie + congé + absence <= jours_ouvrables.
   * - Retourne la ligne recalculée et les totaux actualisés de l'opération.
   */
  modifier(ligneId: string, variables: LigneVariablesModification): ResultatModificationLigne {
    const ligneActuelle = this.obtenir(ligneId);

    // Vérifier le statut de l'opération
    const op = this.db
      .prepare('SELECT statut FROM operation_paie WHERE id = ?')
      .get(ligneActuelle.operation_id) as { statut: string } | undefined;

    if (op?.statut === 'terminee') {
      throw new ErreurMetier(
        'OPERATION_TERMINEE',
        'Impossible de modifier une ligne de paie d une opération terminée. Veuillez la rouvrir d abord.'
      );
    }

    const hsFinal = variables.hs ?? ligneActuelle.hs;
    const retraitFinal = variables.retrait ?? ligneActuelle.retrait;
    const ouvrablesFinal = variables.jours_ouvrables ?? ligneActuelle.jours_ouvrables;
    const maladieFinal = variables.jours_maladie ?? ligneActuelle.jours_maladie;
    const congeFinal = variables.jours_conge ?? ligneActuelle.jours_conge;
    const absenceFinal = variables.jours_absence ?? ligneActuelle.jours_absence;

    // Validation des valeurs numériques
    if (ouvrablesFinal < 1) {
      throw new ErreurMetier(
        'JOURS_INVALIDES',
        'Le nombre de jours ouvrables doit être supérieur ou égal à 1.'
      );
    }

    const dMaladie = new Decimal(maladieFinal);
    const dConge = new Decimal(congeFinal);
    const dAbsence = new Decimal(absenceFinal);

    if (dMaladie.isNegative() || dConge.isNegative() || dAbsence.isNegative()) {
      throw new ErreurMetier(
        'VALEURS_NEGATIVES_INTERDITES',
        'Les jours de maladie, de congé ou d absence ne peuvent pas être négatifs.'
      );
    }

    const totalAbsences = dMaladie.plus(dConge).plus(dAbsence);
    if (totalAbsences.greaterThan(ouvrablesFinal)) {
      throw new ErreurMetier(
        'ABSENCES_DEPASSEES',
        `Le total des absences (${totalAbsences.toString()} j) dépasse le nombre de jours ouvrables (${ouvrablesFinal} j).`
      );
    }

    const dHs = new Decimal(hsFinal);
    const dRetrait = new Decimal(retraitFinal);
    if (dHs.isNegative() || dRetrait.isNegative()) {
      throw new ErreurMetier(
        'MONTANTS_NEGATIFS_INTERDITS',
        'Les heures supplémentaires et les retraits ne peuvent pas être négatifs.'
      );
    }

    const maintenant = new Date().toISOString();
    const nouvelleVersion = ligneActuelle.version + 1;

    this.db
      .prepare(
        `UPDATE ligne_paie
         SET hs = ?,
             retrait = ?,
             jours_ouvrables = ?,
             jours_maladie = ?,
             jours_conge = ?,
             jours_absence = ?,
             version = ?,
             mis_a_jour_le = ?
         WHERE id = ?`
      )
      .run(
        hsFinal,
        retraitFinal,
        ouvrablesFinal,
        maladieFinal,
        congeFinal,
        absenceFinal,
        nouvelleVersion,
        maintenant,
        ligneId
      );

    // Calculer la ligne mise à jour et les totaux
    const ligneMaj = this.obtenir(ligneId);
    const params = this.parametreService.lire();

    const ligneCalculee = calculerMontantsLigne(ligneMaj, {
      diviseurRetenue: params.diviseur_retenue,
      uniteArrondi: params.unite_arrondi,
    });

    const opService = new OperationService(this.db);
    const opDetail = opService.obtenir(ligneActuelle.operation_id);

    return {
      ligne: ligneCalculee,
      totaux: opDetail.totaux,
      synthese: opDetail.synthese,
    };
  }
}
