import type Database from 'better-sqlite3';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';
import type {
  OperationPaie,
  LignePaie,
  LignePaieCalculee,
  TotauxOperation,
  SyntheseOperation,
  ResumeOperationLister,
  DetailOperationComplet,
  Parametre,
} from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';
import { JournalService } from './journal-service';
import { ParametreService } from './parametre-service';
import type { SauvegardeService } from './sauvegarde-service';
import {
  calculerMontantsLigne,
  calculerTotauxOperation,
  calculerSyntheseOperation,
  calculerVariation,
  ValeursSynthesePrecedente,
} from './calcul-totaux';

export { DetailOperationComplet, ResumeOperationLister };

export class OperationService {
  private journalService: JournalService;
  private parametreService: ParametreService;

  constructor(
    private db: Database.Database,
    journalService?: JournalService,
    parametreService?: ParametreService,
    private sauvegardeService?: SauvegardeService
  ) {
    this.journalService = journalService ?? new JournalService(db);
    this.parametreService = parametreService ?? new ParametreService(db);
  }

  /**
   * Trouve l'opération terminée la plus récente strictement antérieure à la période donnée
   * et retourne ses métriques de synthèse.
   */
  public obtenirPrecedenteTerminee(annee: number, mois: number): ValeursSynthesePrecedente | null {
    const opPrec = this.db
      .prepare(
        `SELECT id, annee, mois
         FROM operation_paie
         WHERE statut = 'terminee' AND supprime_le IS NULL
           AND (annee < ? OR (annee = ? AND mois < ?))
         ORDER BY annee DESC, mois DESC
         LIMIT 1`
      )
      .get(annee, annee, mois) as { id: string } | undefined;

    if (!opPrec) return null;

    const lignesPrec = this.db
      .prepare(
        'SELECT salaire_base, virement FROM ligne_paie WHERE operation_id = ? AND supprime_le IS NULL'
      )
      .all(opPrec.id) as Array<{ salaire_base: string; virement: string | null }>;

    let masseDec = new Decimal(0);
    let totalPayeDec = new Decimal(0);
    for (const l of lignesPrec) {
      masseDec = masseDec.plus(new Decimal(l.salaire_base || '0'));
      totalPayeDec = totalPayeDec.plus(new Decimal(l.virement || '0'));
    }

    const nb = lignesPrec.length;
    const moyenDec = nb > 0 ? masseDec.dividedBy(nb).toDecimalPlaces(2, Decimal.ROUND_HALF_UP) : new Decimal(0);

    return {
      masse_salariale: masseDec.toFixed(2),
      total_paye: totalPayeDec.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toString(),
      salaire_moyen: moyenDec.toFixed(2),
      nombre_employes: nb,
    };
  }

  /**
   * Retourne la liste de toutes les opérations de paie triées par période décroissante,
   * enrichies des totaux, du total payé et de sa variation (Section 5.3).
   */
  lister(): ResumeOperationLister[] {
    const operations = this.db
      .prepare(
        `SELECT id, annee, mois, jours_ouvrables, statut, terminee_le, version, mis_a_jour_le, supprime_le
         FROM operation_paie
         WHERE supprime_le IS NULL
         ORDER BY annee DESC, mois DESC`
      )
      .all() as OperationPaie[];

    const params = this.parametreService.lire();

    return operations.map((op) => {
      const lignesBrutes = this.db
        .prepare(
          'SELECT * FROM ligne_paie WHERE operation_id = ? AND supprime_le IS NULL ORDER BY numero ASC'
        )
        .all(op.id) as LignePaie[];

      const lignesCalculees = lignesBrutes.map((l) =>
        calculerMontantsLigne(l, {
          diviseurRetenue: params.diviseur_retenue,
          uniteArrondi: params.unite_arrondi,
        })
      );

      const totaux = calculerTotauxOperation(lignesCalculees);
      const prec = this.obtenirPrecedenteTerminee(op.annee, op.mois);
      const variationTotalPaye = calculerVariation(new Decimal(totaux.total_virement), prec?.total_paye);

      return {
        ...op,
        total_virement: totaux.total_virement,
        total_paye: totaux.total_virement,
        nombre_employes: totaux.nombre_employes,
        variation: variationTotalPaye,
      };
    });
  }

  /**
   * Obtient les détails d'une opération avec toutes ses lignes calculées, ses totaux et sa synthèse (Section 5.2).
   */
  obtenir(id: string): DetailOperationComplet {
    const operation = this.db
      .prepare(
        `SELECT id, annee, mois, jours_ouvrables, statut, terminee_le, version, mis_a_jour_le, supprime_le
         FROM operation_paie
         WHERE id = ? AND supprime_le IS NULL`
      )
      .get(id) as OperationPaie | undefined;

    if (!operation) {
      throw new ErreurMetier(
        'OPERATION_INTROUVABLE',
        `Opération introuvable avec l identifiant ${id}.`
      );
    }

    const parametres = this.parametreService.lire();

    const lignesBrutes = this.db
      .prepare(
        `SELECT *
         FROM ligne_paie
         WHERE operation_id = ? AND supprime_le IS NULL
         ORDER BY numero ASC`
      )
      .all(id) as LignePaie[];

    const lignes = lignesBrutes.map((l) =>
      calculerMontantsLigne(l, {
        diviseurRetenue: parametres.diviseur_retenue,
        uniteArrondi: parametres.unite_arrondi,
      })
    );

    const totaux = calculerTotauxOperation(lignes);
    const prec = this.obtenirPrecedenteTerminee(operation.annee, operation.mois);
    const synthese = calculerSyntheseOperation(lignes, totaux, prec);

    return {
      operation,
      lignes,
      totaux,
      synthese,
      parametres,
    };
  }

  /**
   * Modifie les jours ouvrables d'une opération ouverte et de toutes ses lignes (Section 5.1).
   */
  modifierJours(operationId: string, joursOuvrables: number): DetailOperationComplet {
    if (joursOuvrables < 1) {
      throw new ErreurMetier(
        'JOURS_INVALIDES',
        'Le nombre de jours ouvrables doit être supérieur ou égal à 1.'
      );
    }

    const op = this.db
      .prepare('SELECT * FROM operation_paie WHERE id = ? AND supprime_le IS NULL')
      .get(operationId) as OperationPaie | undefined;

    if (!op) {
      throw new ErreurMetier('OPERATION_INTROUVABLE', `Opération introuvable (${operationId}).`);
    }

    if (op.statut === 'terminee') {
      throw new ErreurMetier(
        'OPERATION_TERMINEE',
        'Impossible de modifier les jours ouvrables d une opération terminée.'
      );
    }

    // Cohérence avec les absences saisies : maladie + conge + absence <= joursOuvrables
    const lignes = this.db
      .prepare(
        'SELECT id, numero, nom, jours_maladie, jours_conge, jours_absence FROM ligne_paie WHERE operation_id = ? AND supprime_le IS NULL'
      )
      .all(operationId) as Array<{
      id: string;
      numero: number;
      nom: string;
      jours_maladie: string;
      jours_conge: string;
      jours_absence: string;
    }>;

    for (const l of lignes) {
      const totAbs = new Decimal(l.jours_maladie || '0')
        .plus(new Decimal(l.jours_conge || '0'))
        .plus(new Decimal(l.jours_absence || '0'));
      if (totAbs.greaterThan(joursOuvrables)) {
        throw new ErreurMetier(
          'ABSENCES_EXCESSIVES',
          `L employé ${l.nom} (#${l.numero}) a ${totAbs.toString()} jours d absence, ce qui dépasse les ${joursOuvrables} jours ouvrables.`
        );
      }
    }

    const maintenant = new Date().toISOString();
    this.db.transaction(() => {
      this.db
        .prepare('UPDATE operation_paie SET jours_ouvrables = ?, mis_a_jour_le = ? WHERE id = ?')
        .run(joursOuvrables, maintenant, operationId);
      this.db
        .prepare(
          'UPDATE ligne_paie SET jours_ouvrables = ?, mis_a_jour_le = ? WHERE operation_id = ? AND supprime_le IS NULL'
        )
        .run(joursOuvrables, maintenant, operationId);
      this.journalService.ajouter({
        action: 'MODIFICATION_JOURS_OUVRABLES',
        entite: 'OPERATION_PAIE',
        entite_id: operationId,
        detail: `Modification des jours ouvrables à ${joursOuvrables} pour l opération ${op.mois}/${op.annee}.`,
      });
    })();

    return this.obtenir(operationId);
  }

  /**
   * Ouvre une nouvelle opération de paie pour un mois et une année donnés.
   * - Refuse un doublon de mois
   * - Refuse jours_ouvrables < 1
   * - Crée une ligne par employé actif avec les copies d'identité et le salaire de base.
   */
  ouvrir(annee: number, mois: number, joursOuvrablesPersonnalises?: number): OperationPaie {
    if (mois < 1 || mois > 12) {
      throw new ErreurMetier('MOIS_INVALIDE', 'Le mois doit être compris entre 1 et 12.');
    }
    if (annee < 2000 || annee > 2100) {
      throw new ErreurMetier('ANNEE_INVALIDE', 'L année doit être comprise entre 2000 et 2100.');
    }

    // Vérifier l'unicité de la période
    const existante = this.db
      .prepare('SELECT id FROM operation_paie WHERE annee = ? AND mois = ? AND supprime_le IS NULL')
      .get(annee, mois);
    if (existante) {
      throw new ErreurMetier(
        'OPERATION_DEJA_EXISTANTE',
        `Une opération de paie existe déjà pour la période ${mois}/${annee}.`
      );
    }

    const params = this.parametreService.lire();
    const joursOuvrables = joursOuvrablesPersonnalises ?? params.jours_ouvrables_defaut;
    if (joursOuvrables < 1) {
      throw new ErreurMetier(
        'JOURS_INVALIDES',
        'Le nombre de jours ouvrables doit être supérieur ou égal à 1.'
      );
    }

    // Récupérer tous les employés actifs
    const employesActifs = this.db
      .prepare(
        `SELECT id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base
         FROM employe
         WHERE actif = 1 AND supprime_le IS NULL
         ORDER BY numero ASC`
      )
      .all() as Array<{
      id: string;
      numero: number;
      nom: string;
      postnom: string;
      prenom: string;
      fonction: string;
      telephone: string;
      code_banque: string;
      salaire_base: string;
    }>;

    const opId = crypto.randomUUID();
    const maintenant = new Date().toISOString();

    const tx = this.db.transaction(() => {
      // 1. Insérer l'opération
      this.db
        .prepare(
          `INSERT INTO operation_paie (id, annee, mois, jours_ouvrables, statut, terminee_le, version, mis_a_jour_le, supprime_le)
           VALUES (?, ?, ?, ?, 'ouverte', NULL, 1, ?, NULL)`
        )
        .run(opId, annee, mois, joursOuvrables, maintenant);

      // 2. Insérer une ligne par employé actif
      const stmtLigne = this.db.prepare(`
        INSERT INTO ligne_paie (
          id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
          telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
          jours_maladie, jours_conge, jours_absence,
          salaire_a_payer, jours_prestes, retenue_maladie, retenue_conge, retenue_absence,
          net_global, virement, version, mis_a_jour_le, supprime_le
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '0', ?, '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, ?, NULL)
      `);

      for (const e of employesActifs) {
        stmtLigne.run(
          crypto.randomUUID(),
          opId,
          e.id,
          e.numero,
          e.nom,
          e.postnom,
          e.prenom,
          e.fonction,
          e.telephone,
          e.code_banque ?? '',
          e.salaire_base,
          joursOuvrables,
          maintenant
        );
      }

      this.journalService.ajouter({
        action: 'OUVRIR_OPERATION',
        entite: 'operation_paie',
        entite_id: opId,
        detail: `Ouverture de la paie ${mois}/${annee} avec ${employesActifs.length} employé(s) (${joursOuvrables} jours ouvrables)`,
      });
    });

    tx();
    return this.obtenir(opId).operation;
  }

  /**
   * Ajoute à une opération ouverte les employés actifs qui n'y figurent pas encore.
   */
  ajouterNouveauxEmployes(operationId: string): { ajoutes: number } {
    const detail = this.obtenir(operationId);
    if (detail.operation.statut === 'terminee') {
      throw new ErreurMetier(
        'OPERATION_TERMINEE',
        'Impossible d ajouter des employés à une opération de paie terminée.'
      );
    }

    const employesPresents = new Set(detail.lignes.map((l) => l.employe_id));

    const employesManquants = this.db
      .prepare(
        `SELECT id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base
         FROM employe
         WHERE actif = 1 AND supprime_le IS NULL
         ORDER BY numero ASC`
      )
      .all() as Array<{
      id: string;
      numero: number;
      nom: string;
      postnom: string;
      prenom: string;
      fonction: string;
      telephone: string;
      code_banque: string;
      salaire_base: string;
    }>;

    const aAjouter = employesManquants.filter((e) => !employesPresents.has(e.id));
    if (aAjouter.length === 0) {
      return { ajoutes: 0 };
    }

    const joursOperation = detail.operation.jours_ouvrables;
    const maintenant = new Date().toISOString();

    const tx = this.db.transaction(() => {
      const stmt = this.db.prepare(`
        INSERT INTO ligne_paie (
          id, operation_id, employe_id, numero, nom, postnom, prenom, fonction,
          telephone, code_banque, salaire_base, hs, retrait, jours_ouvrables,
          jours_maladie, jours_conge, jours_absence,
          salaire_a_payer, jours_prestes, retenue_maladie, retenue_conge, retenue_absence,
          net_global, virement, version, mis_a_jour_le, supprime_le
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '0', '0', ?, '0', '0', '0', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, ?, NULL)
      `);

      for (const e of aAjouter) {
        stmt.run(
          crypto.randomUUID(),
          operationId,
          e.id,
          e.numero,
          e.nom,
          e.postnom,
          e.prenom,
          e.fonction,
          e.telephone,
          e.code_banque ?? '',
          e.salaire_base,
          joursOperation,
          maintenant
        );
      }

      this.journalService.ajouter({
        action: 'AJOUTER_EMPLOYES_OPERATION',
        entite: 'operation_paie',
        entite_id: operationId,
        detail: `Ajout de ${aAjouter.length} nouvel/nouveaux employé(s) à la paie`,
      });
    });

    tx();
    return { ajoutes: aAjouter.length };
  }

  /**
   * Termine une opération de paie en figeant les calculs et coordonnées.
   * - Refuse si une ligne est en erreur.
   * - Calcule et enregistre les résultats exacts.
   * - Fige telephone et code_banque.
   * - Tout s'exécute dans UNE SEULE transaction atomique.
   */
  terminer(operationId: string): OperationPaie {
    const detail = this.obtenir(operationId);
    if (detail.operation.statut === 'terminee') {
      throw new ErreurMetier('OPERATION_DEJA_TERMINEE', 'L opération est déjà terminée.');
    }

    // Vérifier si des lignes sont en erreur
    const lignesEnErreur = detail.lignes.filter((l) => l.erreur !== null);
    if (lignesEnErreur.length > 0) {
      throw new ErreurMetier(
        'LIGNES_EN_ERREUR',
        `Impossible de clôturer l opération : ${lignesEnErreur.length} ligne(s) comportent des erreurs (absences excessives ou jours invalides).`
      );
    }

    const params = detail.parametres;
    const maintenant = new Date().toISOString();

    const tx = this.db.transaction(() => {
      // Pour chaque ligne, recalculer avec exactitude et figer
      const stmtMaj = this.db.prepare(`
        UPDATE ligne_paie
        SET telephone = ?,
            code_banque = ?,
            salaire_a_payer = ?,
            jours_prestes = ?,
            retenue_maladie = ?,
            retenue_conge = ?,
            retenue_absence = ?,
            net_global = ?,
            virement = ?,
            version = version + 1,
            mis_a_jour_le = ?
        WHERE id = ?
      `);

      for (const ligne of detail.lignes) {
        // Obtenir coordonnées actuelles de la fiche employé
        const empActuel = this.db
          .prepare('SELECT telephone, code_banque FROM employe WHERE id = ?')
          .get(ligne.employe_id) as { telephone: string; code_banque: string } | undefined;

        const telFinal = empActuel?.telephone ?? ligne.telephone ?? '';
        const bkFinal = empActuel?.code_banque ?? ligne.code_banque ?? '';

        const calc = calculerMontantsLigne(ligne, {
          diviseurRetenue: params.diviseur_retenue,
          uniteArrondi: params.unite_arrondi,
        });

        stmtMaj.run(
          telFinal,
          bkFinal,
          calc.salaire_a_payer,
          calc.jours_prestes,
          calc.retenue_maladie,
          calc.retenue_conge,
          calc.retenue_absence,
          calc.net_global,
          calc.virement,
          maintenant,
          ligne.id
        );
      }

      // Clôturer l'opération
      this.db
        .prepare(
          `UPDATE operation_paie
           SET statut = 'terminee',
               terminee_le = ?,
               version = version + 1,
               mis_a_jour_le = ?
           WHERE id = ?`
        )
        .run(maintenant, maintenant, operationId);

      this.journalService.ajouter({
        action: 'TERMINER_OPERATION',
        entite: 'operation_paie',
        entite_id: operationId,
        detail: `Clôture de la paie ${detail.operation.mois}/${detail.operation.annee} : total viré ${detail.totaux.total_virement} USD (${detail.totaux.nombre_employes} agents)`,
      });
    });

    tx();

    if (this.sauvegardeService) {
      this.sauvegardeService.creerSauvegarde().catch(() => {
        // Enregistré dans le logger de SauvegardeService
      });
    }

    return this.obtenir(operationId).operation;
  }

  /**
   * Rouvre une opération de paie terminée.
   * - Remet les résultats à NULL.
   * - Passe le statut à 'ouverte'.
   * - Journalise l'action.
   */
  rouvrir(operationId: string): OperationPaie {
    const detail = this.obtenir(operationId);
    if (detail.operation.statut === 'ouverte') {
      throw new ErreurMetier('OPERATION_DEJA_OUVERTE', 'L opération est déjà ouverte.');
    }

    const maintenant = new Date().toISOString();

    const tx = this.db.transaction(() => {
      // 1. Réouverture de l'opération (pour autoriser les déclencheurs sur les lignes)
      this.db
        .prepare(
          `UPDATE operation_paie
           SET statut = 'ouverte',
               terminee_le = NULL,
               version = version + 1,
               mis_a_jour_le = ?
           WHERE id = ?`
        )
        .run(maintenant, operationId);

      // 2. Remise à NULL des résultats figés
      this.db
        .prepare(
          `UPDATE ligne_paie
           SET salaire_a_payer = NULL,
               jours_prestes = NULL,
               retenue_maladie = NULL,
               retenue_conge = NULL,
               retenue_absence = NULL,
               net_global = NULL,
               virement = NULL,
               version = version + 1,
               mis_a_jour_le = ?
           WHERE operation_id = ?`
        )
        .run(maintenant, operationId);

      this.journalService.ajouter({
        action: 'ROUVRIR_OPERATION',
        entite: 'operation_paie',
        entite_id: operationId,
        detail: `Réouverture de la paie ${detail.operation.mois}/${detail.operation.annee}`,
      });
    });

    tx();
    return this.obtenir(operationId).operation;
  }
}
