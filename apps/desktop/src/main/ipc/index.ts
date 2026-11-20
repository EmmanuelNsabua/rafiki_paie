import { ipcMain, type IpcMainInvokeEvent } from 'electron';
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
  ipcOperationsOuvrirInput,
  ipcOperationsObtenirInput,
  ipcOperationsTerminerInput,
  ipcOperationsRouvrirInput,
  ipcOperationsAjouterNouveauxEmployesInput,
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
  ErreurMetier,
} from '../domain';

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
  sauvegardeService?: SauvegardeService
): void {
  const employeService = new EmployeService(db);
  const operationService = new OperationService(db, undefined, undefined, sauvegardeService);
  const ligneService = new LigneService(db);
  const parametreService = new ParametreService(db);
  const journalService = new JournalService(db);

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
    CANAUX_IPC.OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES,
    creerGestionnaireSecurise(
      CANAUX_IPC.OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES,
      ipcOperationsAjouterNouveauxEmployesInput,
      (input) => operationService.ajouterNouveauxEmployes(input.id)
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
}
