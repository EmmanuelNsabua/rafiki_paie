import { ipcMain, dialog, BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import log from 'electron-log/main';
import {
  CANAUX_IPC,
  type ReponseIpc,
  ipcEmployesListerInput,
  ipcEmployesCreerInput,
  ipcEmployesModifierInput,
  ipcEmployesDesactiverInput,
  ipcEmployesSupprimerInput,
  ipcOperationsOuvrirInput,
  ipcOperationsObtenirInput,
  ipcOperationsTerminerInput,
  ipcOperationsRouvrirInput,
  ipcOperationsSupprimerInput,
  ipcOperationsAnnulerInput,
  ipcOperationsAjouterNouveauxEmployesInput,
  ipcOperationsModifierJoursInput,
  ipcOperationsExporterBordereauInput,
  ipcLignesModifierInput,
  ipcParametresModifierInput,
  ipcJournalListerInput,
} from '@rafiki/contrat';
import {
  EmployeService,
  OperationService,
  LigneService,
  ParametreService,
  JournalService,
  SauvegardeService,
  BordereauService,
  ImportExcelService,
  ExportService,
  UpdateService,
  ErreurMetier,
} from '../domain';
import { ouvrirVisionneuseLogs } from '../logs-viewer';
import {
  executionImportParamsSchema,
  optionsExportEmployesSchema,
  optionsExportOperationSchema,
  optionsExportRecapitulatifSchema,
  optionsExportBulletinSchema,
  optionsExportBordereauSchema,
  optionsSauvegardeExporterSchema,
  optionsSauvegardeRestaurerFichierSchema,
} from '@rafiki/contrat';

/**
 * Contrôle que l'expéditeur de la requête IPC appartient bien à l'application.
 */
export function verifierExpediteur(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  // En dev : localhost:3000 ou 127.0.0.1:3000
  // En prod : file:// ou app://
  return (
    url.startsWith('http://localhost:3000') ||
    url.startsWith('http://127.0.0.1:3000') ||
    url.startsWith('file://') ||
    url.startsWith('app://')
  );
}

/**
 * Enveloppe sécurisée pour gestionnaire IPC avec validation zod,
 * contrôle de sécurité et journalisation sans données personnelles ni montants.
 */
export function creerGestionnaireSecurise<TIn, TOut>(
  nomCanal: string,
  schema: z.ZodType<TIn>,
  action: (data: TIn) => TOut | Promise<TOut>
) {
  return async (event: IpcMainInvokeEvent, donneeBrute: unknown): Promise<ReponseIpc<TOut>> => {
    // 1. Contrôle expéditeur
    if (!verifierExpediteur(event)) {
      log.warn(`[IPC REFUSÉ] Origine non autorisée pour le canal "${nomCanal}"`);
      return {
        ok: false,
        erreur: {
          code: 'ORIGINE_NON_AUTORISEE',
          message: 'Accès non autorisé au pont IPC.',
        },
      };
    }

    // 2. Validation schéma Zod de l'entrée avant tout appel au domaine
    const validation = schema.safeParse(donneeBrute);
    if (!validation.success) {
      const messages = validation.error.issues
        .map((iss) => `${iss.path.join('.')}: ${iss.message}`)
        .join(', ');
      return {
        ok: false,
        erreur: {
          code: 'VALIDATION_ENTREE_ECHOUEE',
          message: `Paramètres invalides : ${messages}`,
        },
      };
    }

    // 3. Exécution métier avec capture des erreurs
    try {
      const resultat = await action(validation.data);
      return {
        ok: true,
        data: resultat,
      };
    } catch (err: any) {
      if (err instanceof ErreurMetier) {
        if (process.env.NODE_ENV !== 'test') {
          log.warn(`[IPC MÉTIER] Canal: ${nomCanal} | Code: ${err.code} | Message: ${err.message}`);
        }
        return {
          ok: false,
          erreur: {
            code: err.code,
            message: err.message,
          },
        };
      }

      // Erreur inattendue : log technique anonymisé (ZÉRO montant, nom, téléphone, code banque)
      const errNom = err?.name || 'Error';
      const errCode = err?.code || 'INATTENDUE';
      if (process.env.NODE_ENV !== 'test') {
        log.error(`[IPC ERREUR TECHNIQUE] Canal: ${nomCanal} | Type: ${errNom} | Code: ${errCode}`);
      }

      return {
        ok: false,
        erreur: {
          code: 'ERREUR_INTERNE',
          message: 'Une erreur inattendue est survenue lors du traitement.',
        },
      };
    }
  };
}

/**
 * Enregistre tous les gestionnaires IPC du contrat dans le processus principal Electron.
 */
export function enregistrerGestionnairesIpc(
  db: Database.Database,
  sauvegardeService?: SauvegardeService,
  updateService?: UpdateService
): void {
  const employeService = new EmployeService(db);
  const operationService = new OperationService(db, undefined, undefined, sauvegardeService);
  const ligneService = new LigneService(db);
  const parametreService = new ParametreService(db);
  const journalService = new JournalService(db);
  const bordereauService = new BordereauService(db, operationService, journalService);
  const importExcelService = new ImportExcelService(
    db,
    employeService,
    operationService,
    ligneService,
    journalService
  );
  const exportService = new ExportService(db, employeService, operationService, journalService);

  // --- Employés ---
  ipcMain.handle(
    CANAUX_IPC.EMPLOYES_LISTER,
    creerGestionnaireSecurise(CANAUX_IPC.EMPLOYES_LISTER, ipcEmployesListerInput, (input) =>
      employeService.lister(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EMPLOYES_CREER,
    creerGestionnaireSecurise(CANAUX_IPC.EMPLOYES_CREER, ipcEmployesCreerInput, (input) =>
      employeService.creer(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EMPLOYES_MODIFIER,
    creerGestionnaireSecurise(CANAUX_IPC.EMPLOYES_MODIFIER, ipcEmployesModifierInput, (input) =>
      employeService.modifier(input.id, input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EMPLOYES_DESACTIVER,
    creerGestionnaireSecurise(CANAUX_IPC.EMPLOYES_DESACTIVER, ipcEmployesDesactiverInput, (input) =>
      employeService.desactiver(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EMPLOYES_SUPPRIMER,
    creerGestionnaireSecurise(CANAUX_IPC.EMPLOYES_SUPPRIMER, ipcEmployesSupprimerInput, (input) =>
      employeService.supprimer(input.id)
    )
  );

  // --- Opérations ---
  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_LISTER,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_LISTER, z.unknown(), () =>
      operationService.lister()
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_OUVRIR,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_OUVRIR, ipcOperationsOuvrirInput, (input) =>
      operationService.ouvrir(input.annee, input.mois, input.jours_ouvrables)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_OBTENIR,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_OBTENIR, ipcOperationsObtenirInput, (input) =>
      operationService.obtenir(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_TERMINER,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_TERMINER, ipcOperationsTerminerInput, (input) =>
      operationService.terminer(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_ROUVRIR,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_ROUVRIR, ipcOperationsRouvrirInput, (input) =>
      operationService.rouvrir(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_SUPPRIMER,
    creerGestionnaireSecurise(
      CANAUX_IPC.OPERATIONS_SUPPRIMER,
      ipcOperationsSupprimerInput,
      (input) => operationService.supprimer(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_ANNULER,
    creerGestionnaireSecurise(CANAUX_IPC.OPERATIONS_ANNULER, ipcOperationsAnnulerInput, (input) =>
      operationService.annuler(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES,
    creerGestionnaireSecurise(
      CANAUX_IPC.OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES,
      ipcOperationsAjouterNouveauxEmployesInput,
      (input) => operationService.ajouterNouveauxEmployes(input.id)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_MODIFIER_JOURS,
    creerGestionnaireSecurise(
      CANAUX_IPC.OPERATIONS_MODIFIER_JOURS,
      ipcOperationsModifierJoursInput,
      (input) => operationService.modifierJours(input.operation_id, input.jours_ouvrables)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.OPERATIONS_EXPORTER_BORDEREAU,
    creerGestionnaireSecurise(
      CANAUX_IPC.OPERATIONS_EXPORTER_BORDEREAU,
      ipcOperationsExporterBordereauInput,
      (input) =>
        bordereauService.exporter(input.operation_id, input.format, input.chemin_destination)
    )
  );

  // --- Lignes de paie ---
  ipcMain.handle(
    CANAUX_IPC.LIGNES_MODIFIER,
    creerGestionnaireSecurise(CANAUX_IPC.LIGNES_MODIFIER, ipcLignesModifierInput, (input) =>
      ligneService.modifier(input.ligne_id, input)
    )
  );

  // --- Paramètres ---
  ipcMain.handle(
    CANAUX_IPC.PARAMETRES_LIRE,
    creerGestionnaireSecurise(CANAUX_IPC.PARAMETRES_LIRE, z.unknown(), () =>
      parametreService.lire()
    )
  );

  ipcMain.handle(
    CANAUX_IPC.PARAMETRES_MODIFIER,
    creerGestionnaireSecurise(CANAUX_IPC.PARAMETRES_MODIFIER, ipcParametresModifierInput, (input) =>
      parametreService.modifier(input)
    )
  );

  // --- Journal d'audit ---
  ipcMain.handle(
    CANAUX_IPC.JOURNAL_LISTER,
    creerGestionnaireSecurise(CANAUX_IPC.JOURNAL_LISTER, ipcJournalListerInput, (input) =>
      journalService.lister(input)
    )
  );

  // --- Phase 3 : Import Excel ---
  ipcMain.handle(
    CANAUX_IPC.IMPORT_EXCEL_PREVISUALISER,
    creerGestionnaireSecurise(
      CANAUX_IPC.IMPORT_EXCEL_PREVISUALISER,
      z.object({ cheminFichier: z.string().min(1) }),
      (input) => importExcelService.previsualiser(input.cheminFichier)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.IMPORT_EXCEL_EXECUTER,
    creerGestionnaireSecurise(
      CANAUX_IPC.IMPORT_EXCEL_EXECUTER,
      executionImportParamsSchema,
      (input) => importExcelService.executer(input)
    )
  );

  // --- Phase 3 : Exports Métier ---
  ipcMain.handle(
    CANAUX_IPC.EXPORTS_EMPLOYES,
    creerGestionnaireSecurise(CANAUX_IPC.EXPORTS_EMPLOYES, optionsExportEmployesSchema, (input) =>
      exportService.exporterEmployes(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EXPORTS_OPERATION,
    creerGestionnaireSecurise(CANAUX_IPC.EXPORTS_OPERATION, optionsExportOperationSchema, (input) =>
      exportService.exporterOperation(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EXPORTS_RECAPITULATIF,
    creerGestionnaireSecurise(
      CANAUX_IPC.EXPORTS_RECAPITULATIF,
      optionsExportRecapitulatifSchema,
      (input) => exportService.exporterRecapitulatif(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EXPORTS_BULLETIN,
    creerGestionnaireSecurise(CANAUX_IPC.EXPORTS_BULLETIN, optionsExportBulletinSchema, (input) =>
      exportService.exporterBulletins(input)
    )
  );

  ipcMain.handle(
    CANAUX_IPC.EXPORTS_BORDEREAU,
    creerGestionnaireSecurise(CANAUX_IPC.EXPORTS_BORDEREAU, optionsExportBordereauSchema, (input) =>
      bordereauService.exporter(input.operationId, input.format, input.cheminDestination)
    )
  );

  // --- Phase 3 : Sauvegarde et Restauration Externe ---
  ipcMain.handle(
    CANAUX_IPC.SAUVEGARDE_EXPORTER,
    creerGestionnaireSecurise(
      CANAUX_IPC.SAUVEGARDE_EXPORTER,
      optionsSauvegardeExporterSchema,
      (input) => {
        if (!sauvegardeService) {
          throw new ErreurMetier('SERVICE_INDISPONIBLE', 'Service de sauvegarde non initialisé.');
        }
        return sauvegardeService.exporterVers(input.cheminDestination);
      }
    )
  );

  ipcMain.handle(
    CANAUX_IPC.SAUVEGARDE_RESTAURER_FICHIER,
    creerGestionnaireSecurise(
      CANAUX_IPC.SAUVEGARDE_RESTAURER_FICHIER,
      optionsSauvegardeRestaurerFichierSchema,
      (input) => {
        if (!sauvegardeService) {
          throw new ErreurMetier('SERVICE_INDISPONIBLE', 'Service de sauvegarde non initialisé.');
        }
        sauvegardeService.restaurer(input.cheminFichier);
      }
    )
  );

  ipcMain.handle(
    CANAUX_IPC.SAUVEGARDE_CHOISIR_DOSSIER_EXPORT,
    creerGestionnaireSecurise(
      CANAUX_IPC.SAUVEGARDE_CHOISIR_DOSSIER_EXPORT,
      z.unknown(),
      async () => {
        if (!sauvegardeService) {
          throw new ErreurMetier('SERVICE_INDISPONIBLE', 'Service de sauvegarde non initialisé.');
        }
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        const res = await dialog.showOpenDialog(win, {
          title: 'Sélectionner un répertoire pour exporter la sauvegarde',
          properties: ['openDirectory', 'createDirectory'],
        });
        if (res.canceled || res.filePaths.length === 0) {
          return { annule: true, chemin: '' };
        }
        const now = new Date();
        const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
        const cheminFichier = path.join(res.filePaths[0], `rafiki_paie_backup_${stamp}.db`);
        await sauvegardeService.exporterVers(cheminFichier);
        return { annule: false, chemin: cheminFichier };
      }
    )
  );

  ipcMain.handle(
    CANAUX_IPC.SAUVEGARDE_REINITIALISER_POINT_ZERO,
    creerGestionnaireSecurise(
      CANAUX_IPC.SAUVEGARDE_REINITIALISER_POINT_ZERO,
      z.unknown(),
      async () => {
        if (!sauvegardeService) {
          throw new ErreurMetier('SERVICE_INDISPONIBLE', 'Service de sauvegarde non initialisé.');
        }
        await sauvegardeService.reinitialiserPointZero();
      }
    )
  );

  ipcMain.handle(
    CANAUX_IPC.SAUVEGARDE_IMPORTER_FICHIER_DIALOG,
    creerGestionnaireSecurise(
      CANAUX_IPC.SAUVEGARDE_IMPORTER_FICHIER_DIALOG,
      z.unknown(),
      async () => {
        if (!sauvegardeService) {
          throw new ErreurMetier('SERVICE_INDISPONIBLE', 'Service de sauvegarde non initialisé.');
        }
        const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
        const res = await dialog.showOpenDialog(win, {
          title: 'Importer un fichier de base de données (.db / .sqlite)',
          filters: [{ name: 'Base de données SQLite', extensions: ['db', 'sqlite'] }],
          properties: ['openFile'],
        });
        if (res.canceled || res.filePaths.length === 0) {
          return { annule: true, chemin: '' };
        }
        const cheminSelectionne = res.filePaths[0];
        sauvegardeService.restaurer(cheminSelectionne);
        return { annule: false, chemin: cheminSelectionne };
      }
    )
  );

  ipcMain.handle(
    CANAUX_IPC.LOGS_OUVRIR_VISIONNEUSE,
    creerGestionnaireSecurise(CANAUX_IPC.LOGS_OUVRIR_VISIONNEUSE, z.unknown(), () => {
      ouvrirVisionneuseLogs();
    })
  );

  // --- Lot 2 : Mises à jour automatiques ---
  ipcMain.handle(CANAUX_IPC.MAJ_VERIFIER, async () => {
    if (!updateService) {
      return {
        ok: false,
        erreur: {
          code: 'SERVICE_INDISPONIBLE',
          message: 'Service de mise à jour non disponible.',
        },
      };
    }
    const info = await updateService.verifierMiseAJour();
    return { ok: true, data: info };
  });

  ipcMain.handle(CANAUX_IPC.MAJ_INSTALLER, async () => {
    if (!updateService) {
      return {
        ok: false,
        erreur: {
          code: 'SERVICE_INDISPONIBLE',
          message: 'Service de mise à jour non disponible.',
        },
      };
    }
    await updateService.installerEtRedemarrer();
    return { ok: true, data: undefined };
  });

  ipcMain.handle(CANAUX_IPC.MAJ_OBTENIR_ETAT, () => {
    if (!updateService) {
      return {
        ok: false,
        erreur: {
          code: 'SERVICE_INDISPONIBLE',
          message: 'Service de mise à jour non disponible.',
        },
      };
    }
    return { ok: true, data: updateService.obtenirEtat() };
  });
}
