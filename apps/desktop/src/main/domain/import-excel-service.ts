import type Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import {
  type PrevisualisationImportResult,
  type LignePrevisualisationImport,
  type DonneesLigneImportExcel,
  type ExecutionImportParams,
  type ExecutionImportResult,
  telephoneSchema,
} from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';
import { EmployeService } from './employe-service';
import { OperationService } from './operation-service';
import { LigneService } from './ligne-service';
import { JournalService } from './journal-service';

function normaliserTexte(texte: string | null | undefined): string {
  if (!texte) return '';
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Service d'importation robuste et transactionnelle du classeur Excel historique.
 */
export class ImportExcelService {
  constructor(
    private db: Database.Database,
    private employeService: EmployeService,
    private operationService: OperationService,
    private ligneService: LigneService,
    private journalService: JournalService
  ) {}

  /**
   * Valide le format et l'intégrité du fichier Excel (.xlsx) avant toute lecture.
   */
  private validerFichier(cheminFichier: string): void {
    if (!fs.existsSync(cheminFichier)) {
      throw new ErreurMetier(
        'FICHIER_INTROUVABLE',
        `Le fichier spécifié est introuvable : ${cheminFichier}`
      );
    }

    const stats = fs.statSync(cheminFichier);
    if (!stats.isFile()) {
      throw new ErreurMetier('FICHIER_INVALIDE', 'Le chemin ne pointe pas vers un fichier valide.');
    }

    // Limite de taille à 15 Mo pour éviter les dénis de service mémoire
    const TAILLE_MAX = 15 * 1024 * 1024;
    if (stats.size > TAILLE_MAX) {
      throw new ErreurMetier(
        'FICHIER_TROP_VOLUMINEUX',
        'Le fichier dépasse la limite maximale autorisée (15 Mo).'
      );
    }

    const ext = path.extname(cheminFichier).toLowerCase();
    if (ext !== '.xlsx') {
      throw new ErreurMetier(
        'FORMAT_NON_SUPPORTE',
        'Seuls les classeurs Excel au format .xlsx sont acceptés.'
      );
    }

    if (stats.size < 100) {
      throw new ErreurMetier('FICHIER_CORROMPU', 'Le fichier est trop petit ou vide.');
    }

    // Vérification des magic bytes ZIP (PK\x03\x04 ou 0x50 0x4B 0x03 0x04)
    const fd = fs.openSync(cheminFichier, 'r');
    const buffer = Buffer.alloc(4);
    try {
      fs.readSync(fd, buffer, 0, 4, 0);
      if (
        buffer[0] !== 0x50 ||
        buffer[1] !== 0x4b ||
        (buffer[2] !== 0x03 && buffer[2] !== 0x05 && buffer[2] !== 0x07)
      ) {
        throw new ErreurMetier(
          'FORMAT_NON_CONFORME',
          'Le fichier ne correspond pas à un document Excel valide.'
        );
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Prévisualise les données du classeur Excel avant validation, détecte les anomalies et doublons.
   */
  previsualiser(cheminFichier: string): PrevisualisationImportResult {
    this.validerFichier(cheminFichier);

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.readFile(cheminFichier, {
        cellFormula: false,
        cellHTML: false,
        sheetStubs: true,
      });
    } catch (err: any) {
      throw new ErreurMetier(
        'LECTURE_EXCEL_ECHOUEE',
        `Impossible de lire le classeur Excel : ${err?.message || err}`
      );
    }

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      throw new ErreurMetier(
        'CLASSEUR_VIDE',
        'Le classeur Excel ne contient aucune feuille de calcul.'
      );
    }

    // Recherche de la feuille de paie principale
    const nomFeuille =
      wb.SheetNames.find((nom) => normaliserTexte(nom).includes('paie mensuelle')) ||
      wb.SheetNames[0];

    const ws = wb.Sheets[nomFeuille];
    if (!ws) {
      throw new ErreurMetier('FEUILLE_INTROUVABLE', `La feuille "${nomFeuille}" est introuvable.`);
    }

    const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!rawRows || rawRows.length === 0) {
      throw new ErreurMetier('FEUILLE_VIDE', 'La feuille de calcul ne contient aucune donnée.');
    }

    // Détection de la ligne d'en-tête (cherche NOM et SALAIRE)
    let headerRowIndex = -1;
    const colIndices: Record<string, number> = {};

    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const rowNorm = row.map((cell) => normaliserTexte(String(cell)));

      const idxNom = rowNorm.findIndex((val) => val === 'nom' || val.startsWith('nom '));
      const idxSalaire = rowNorm.findIndex(
        (val) => val.includes('salaire') && !val.includes('payer')
      );

      if (idxNom !== -1 && idxSalaire !== -1) {
        headerRowIndex = r;
        // Cartographie des colonnes
        rowNorm.forEach((val, idx) => {
          if (val === 'n°' || val === 'no' || val === 'numero') colIndices['numero'] = idx;
          else if (val === 'nom') colIndices['nom'] = idx;
          else if (val === 'postnom') colIndices['postnom'] = idx;
          else if (val === 'prenom') colIndices['prenom'] = idx;
          else if (val === 'fonction') colIndices['fonction'] = idx;
          else if (
            (val === 'salaire' || val === 'salaire base' || val === 'salaire de base') &&
            !val.includes('payer')
          )
            colIndices['salaire'] = idx;
          else if (val === 'hs' || val.includes('supplementaire')) colIndices['hs'] = idx;
          else if (val === 'retrait' || val.includes('avance')) colIndices['retrait'] = idx;
          else if (val.includes('ouvrable')) colIndices['jours_ouvrables'] = idx;
          else if ((val === 'maladie' || val.includes('maladie')) && !val.includes('net'))
            colIndices['maladie'] = idx;
          else if (val.includes('conge') && !val.includes('net')) colIndices['conge'] = idx;
          else if (val.includes('absence') && !val.includes('net')) colIndices['absence'] = idx;
          else if (val.includes('tel') || val.includes('telephone')) colIndices['telephone'] = idx;
        });
        break;
      }
    }

    if (headerRowIndex === -1 || colIndices['nom'] === undefined) {
      throw new ErreurMetier(
        'STRUCTURE_INVALIDE',
        'Impossible d identifier les colonnes obligatoires (NOM, SALAIRE) dans le classeur.'
      );
    }

    // Récupérer les employés existants pour détecter les doublons
    const employesExistants = this.employeService.lister();
    const mapEmployesParNom = new Map<string, string>();
    const mapEmployesParTel = new Map<string, string>();

    employesExistants.forEach((emp) => {
      const cleNom = `${normaliserTexte(emp.nom)}|${normaliserTexte(emp.postnom)}|${normaliserTexte(emp.prenom)}`;
      mapEmployesParNom.set(cleNom, emp.id);
      if (emp.telephone) {
        const telNettoye = emp.telephone.replace(/[\s.-]/g, '');
        mapEmployesParTel.set(telNettoye, emp.id);
      }
    });

    const lignes: LignePrevisualisationImport[] = [];
    let totalSalaire = new Decimal(0);
    let totalHs = new Decimal(0);
    let totalRetrait = new Decimal(0);

    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const nomBrut = String(row[colIndices['nom']] ?? '').trim();
      const premierCell = String(row[0] ?? '')
        .trim()
        .toUpperCase();

      // Arrêt si ligne de totalisation
      if (
        premierCell.includes('TOTAL') ||
        nomBrut.toUpperCase().includes('TOTAL') ||
        nomBrut.toUpperCase().includes('SYNTHESE')
      ) {
        break;
      }

      // Si le nom est vide, ignorer (ligne de modèle Excel vide)
      if (!nomBrut) {
        continue;
      }

      const postnomBrut =
        colIndices['postnom'] !== undefined ? String(row[colIndices['postnom']] ?? '').trim() : '';
      const prenomBrut =
        colIndices['prenom'] !== undefined ? String(row[colIndices['prenom']] ?? '').trim() : '';
      const fonctionBrut =
        colIndices['fonction'] !== undefined
          ? String(row[colIndices['fonction']] ?? '').trim()
          : '';
      const telBrut =
        colIndices['telephone'] !== undefined
          ? String(row[colIndices['telephone']] ?? '').trim()
          : '';

      const salaireVal = colIndices['salaire'] !== undefined ? row[colIndices['salaire']] : 0;
      const hsVal = colIndices['hs'] !== undefined ? row[colIndices['hs']] : 0;
      const retraitVal = colIndices['retrait'] !== undefined ? row[colIndices['retrait']] : 0;
      const joursOuvrablesVal =
        colIndices['jours_ouvrables'] !== undefined ? row[colIndices['jours_ouvrables']] : 22;
      const maladieVal = colIndices['maladie'] !== undefined ? row[colIndices['maladie']] : 0;
      const congeVal = colIndices['conge'] !== undefined ? row[colIndices['conge']] : 0;
      const absenceVal = colIndices['absence'] !== undefined ? row[colIndices['absence']] : 0;

      const erreurs: string[] = [];
      const avertissements: string[] = [];

      // Validation salaire de base
      let salaireBase = '0.00';
      try {
        const dec = new Decimal(Number(salaireVal) || 0);
        if (dec.isNegative()) {
          erreurs.push('Le salaire de base ne peut pas être négatif.');
        } else {
          salaireBase = dec.toFixed(2);
          totalSalaire = totalSalaire.plus(dec);
        }
      } catch {
        erreurs.push('Format du salaire de base invalide.');
      }

      // Validation HS
      let hs = '0.00';
      try {
        const dec = new Decimal(Number(hsVal) || 0);
        if (dec.isNegative()) erreurs.push('Les HS/primes ne peuvent pas être négatives.');
        else {
          hs = dec.toFixed(2);
          totalHs = totalHs.plus(dec);
        }
      } catch {
        avertissements.push('HS non numériques réinitialisées à 0.');
      }

      // Validation Retrait
      let retrait = '0.00';
      try {
        const dec = new Decimal(Number(retraitVal) || 0);
        if (dec.isNegative()) erreurs.push('Le retrait ne peut pas être négatif.');
        else {
          retrait = dec.toFixed(2);
          totalRetrait = totalRetrait.plus(dec);
        }
      } catch {
        avertissements.push('Retrait non numérique réinitialisé à 0.');
      }

      // Validation jours ouvrables et absences
      const joursOuvrables = Math.round(Number(joursOuvrablesVal)) || 22;
      if (joursOuvrables < 1) {
        erreurs.push('Les jours ouvrables doivent être au moins égaux à 1.');
      }

      const joursMaladie = Math.max(0, Number(maladieVal) || 0);
      const joursConge = Math.max(0, Number(congeVal) || 0);
      const joursAbsence = Math.max(0, Number(absenceVal) || 0);

      if (joursMaladie + joursConge + joursAbsence > joursOuvrables) {
        erreurs.push('Le total des absences dépasse le nombre de jours ouvrables.');
      }

      // Validation téléphone
      if (telBrut) {
        const validationTel = telephoneSchema.safeParse(telBrut);
        if (!validationTel.success) {
          avertissements.push(`Format de téléphone non standard : "${telBrut}"`);
        }
      }

      // Détection de doublons
      const cleNom = `${normaliserTexte(nomBrut)}|${normaliserTexte(postnomBrut)}|${normaliserTexte(prenomBrut)}`;
      let employeExistantId = mapEmployesParNom.get(cleNom);
      if (!employeExistantId && telBrut) {
        const telNettoye = telBrut.replace(/[\s.-]/g, '');
        employeExistantId = mapEmployesParTel.get(telNettoye);
      }

      const estDoublon = !!employeExistantId;
      if (estDoublon) {
        avertissements.push('Employé déjà existant dans la base.');
      }

      const donnees: DonneesLigneImportExcel = {
        numero: undefined, // Laisser l'auto-incrémentation à SQLite
        nom: nomBrut,
        postnom: postnomBrut || undefined,
        prenom: prenomBrut || undefined,
        fonction: fonctionBrut || undefined,
        salaire_base: salaireBase,
        telephone: telBrut || undefined,
        jours_ouvrables: joursOuvrables,
        heures_supplementaires: hs,
        retrait: retrait,
        jours_maladie: joursMaladie,
        jours_conge: joursConge,
        jours_absence: joursAbsence,
      };

      lignes.push({
        indexLigne: r + 1,
        donnees,
        valide: erreurs.length === 0,
        erreurs,
        avertissements,
        estDoublon,
        employeExistantId,
        action: estDoublon ? 'mettre_a_jour' : 'importer',
      });
    }

    const lignesValides = lignes.filter((l) => l.valide).length;
    const lignesInvalides = lignes.length - lignesValides;

    return {
      valide: lignes.length > 0 && lignesInvalides === 0,
      feuilleNom: nomFeuille,
      totalLignes: lignes.length,
      lignesValides,
      lignesInvalides,
      lignes,
      recapitulatif: {
        totalSalaireBase: totalSalaire.toFixed(2),
        totalHs: totalHs.toFixed(2),
        totalRetrait: totalRetrait.toFixed(2),
      },
    };
  }

  /**
   * Exécute l'importation de manière atomique dans une transaction SQLite unique.
   * En cas d'erreur fatale, un rollback intégral est opéré.
   */
  executer(params: ExecutionImportParams): ExecutionImportResult {
    const prev = this.previsualiser(params.cheminFichier);
    const lignesAExclureSet = new Set(params.lignesAExclure || []);

    const lignesAImporter = prev.lignes.filter(
      (l) => l.valide && !lignesAExclureSet.has(l.indexLigne)
    );

    if (lignesAImporter.length === 0) {
      throw new ErreurMetier(
        'AUCUNE_LIGNE_A_IMPORTER',
        'Aucune ligne valide sélectionnée pour l importation.'
      );
    }

    let employesCrees = 0;
    let employesMisAJour = 0;
    let operationId: string | undefined;
    let lignesPaieCrees = 0;
    let lignesPaieIgnorees = 0;

    // Transaction atomique exclusive
    const transaction = this.db.transaction(() => {
      // 1. Traitement des employés
      const mapLigneVersEmployeId = new Map<number, string>();

      for (const ligne of lignesAImporter) {
        const { donnees, estDoublon, employeExistantId } = ligne;

        if (estDoublon && employeExistantId) {
          if (params.modeDoublon === 'refuser') {
            throw new ErreurMetier(
              'DOUBLON_REFUSE',
              `L employé "${donnees.nom} ${donnees.postnom || ''}" existe déjà et le mode doublon est "refuser".`
            );
          } else if (params.modeDoublon === 'mettre_a_jour') {
            this.employeService.modifier(employeExistantId, {
              nom: donnees.nom,
              postnom: donnees.postnom || undefined,
              prenom: donnees.prenom || undefined,
              fonction: donnees.fonction || undefined,
              salaire_base: donnees.salaire_base,
              telephone: donnees.telephone || undefined,
            });
            employesMisAJour++;
            mapLigneVersEmployeId.set(ligne.indexLigne, employeExistantId);
          } else {
            // mode "ignorer" : on réutilise l'employé existant tel quel
            mapLigneVersEmployeId.set(ligne.indexLigne, employeExistantId);
          }
        } else {
          // Création du nouvel employé (numéro auto-incrémenté par SQLite)
          const nouvelEmploye = this.employeService.creer({
            nom: donnees.nom,
            postnom: donnees.postnom,
            prenom: donnees.prenom,
            fonction: donnees.fonction,
            salaire_base: donnees.salaire_base,
            telephone: donnees.telephone,
          });
          employesCrees++;
          mapLigneVersEmployeId.set(ligne.indexLigne, nouvelEmploye.id);
        }
      }

      // 2. Création de l'opération de paie si demandée
      if (params.creerOperation) {
        // Vérifier si une opération existe déjà pour cette période
        const operationsExistantes = this.operationService.lister();
        const op = operationsExistantes.find(
          (o) => o.annee === params.annee && o.mois === params.mois
        );

        if (op) {
          if (op.statut === 'terminee') {
            throw new ErreurMetier(
              'OPERATION_DEJA_TERMINEE',
              `L opération ${params.mois}/${params.annee} est déjà clôturée et ne peut pas recevoir d import.`
            );
          }
          operationId = op.id;
          // Ajouter les éventuels employés nouvellement créés à l'opération ouverte
          this.operationService.ajouterNouveauxEmployes(operationId);
        } else {
          // Déterminer jours ouvrables par défaut de l'opération
          const joursOuvrablesPremier = lignesAImporter[0]?.donnees.jours_ouvrables || 22;
          const nouvelleOp = this.operationService.ouvrir(
            params.annee,
            params.mois,
            joursOuvrablesPremier
          );
          operationId = nouvelleOp.id;
        }

        // Récupérer les lignes de paie existantes pour l'opération
        const detailOp = this.operationService.obtenir(operationId);
        const mapLignesExistantes = new Map<string, string>(); // employeId -> ligneId
        detailOp.lignes.forEach((l) => mapLignesExistantes.set(l.employe_id, l.id));

        for (const ligne of lignesAImporter) {
          const employeId = mapLigneVersEmployeId.get(ligne.indexLigne);
          if (!employeId) continue;

          const ligneId = mapLignesExistantes.get(employeId);
          if (ligneId) {
            // Mettre à jour les variables de paie importées
            this.ligneService.modifier(ligneId, {
              hs: ligne.donnees.heures_supplementaires || '0.00',
              retrait: ligne.donnees.retrait || '0.00',
              jours_maladie: String(ligne.donnees.jours_maladie || 0),
              jours_conge: String(ligne.donnees.jours_conge || 0),
              jours_absence: String(ligne.donnees.jours_absence || 0),
            });
            lignesPaieCrees++;
          } else {
            lignesPaieIgnorees++;
          }
        }
      }

      // 3. Journalisation de l'opération dans l'audit (sans PII)
      this.journalService.ajouter({
        action: 'IMPORTER_EXCEL',
        entite: 'operation',
        entite_id: operationId,
        detail: JSON.stringify({
          nom_fichier: path.basename(params.cheminFichier),
          annee: params.annee,
          mois: params.mois,
          employes_crees: employesCrees,
          employes_mis_a_jour: employesMisAJour,
          lignes_paie_importees: lignesPaieCrees,
        }),
      });
    });

    transaction();

    return {
      succes: true,
      employesCrees,
      employesMisAJour,
      operationCreeeId: operationId,
      lignesPaieCrees,
      lignesPaieIgnorees,
    };
  }
}
