import { contextBridge, ipcRenderer } from 'electron';
import { CANAUX_IPC } from '@rafiki/contrat/canaux';
import type {
  ElectronApi,
  ReponseIpc,
  Employe,
  OperationPaie,
  ResumeOperationLister,
  DetailOperationComplet,
  ResultatModificationLigne,
  ResultatAjoutEmployes,
  ResultatExportBordereau,
  Parametre,
  Journal,
  InfosFenetre,
  PreferencesInterface,
  ThemePreference,
} from '@rafiki/contrat';

// Calcul de estDev transmis par additionalArguments depuis le processus principal
const isDevArg = process.argv?.find((arg) => arg.startsWith('--is-dev='));
const estDev = isDevArg ? isDevArg.split('=')[1] === 'true' : false;

const api: ElectronApi = {
  env: {
    estDev,
  },
  pingDb: () => ipcRenderer.invoke('db:ping'),
  employes: {
    lister: (input): Promise<ReponseIpc<Employe[]>> => {
      return ipcRenderer.invoke(CANAUX_IPC.EMPLOYES_LISTER, input);
    },
    creer: (input): Promise<ReponseIpc<Employe>> => {
      return ipcRenderer.invoke(CANAUX_IPC.EMPLOYES_CREER, input);
    },
    modifier: (input): Promise<ReponseIpc<Employe>> => {
      return ipcRenderer.invoke(CANAUX_IPC.EMPLOYES_MODIFIER, input);
    },
    desactiver: (input): Promise<ReponseIpc<Employe>> => {
      return ipcRenderer.invoke(CANAUX_IPC.EMPLOYES_DESACTIVER, input);
    },
  },
  operations: {
    lister: (): Promise<ReponseIpc<ResumeOperationLister[]>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_LISTER);
    },
    ouvrir: (input): Promise<ReponseIpc<OperationPaie>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_OUVRIR, input);
    },
    obtenir: (input): Promise<ReponseIpc<DetailOperationComplet>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_OBTENIR, input);
    },
    terminer: (input): Promise<ReponseIpc<OperationPaie>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_TERMINER, input);
    },
    rouvrir: (input): Promise<ReponseIpc<OperationPaie>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_ROUVRIR, input);
    },
    ajouterNouveauxEmployes: (input): Promise<ReponseIpc<ResultatAjoutEmployes>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_AJOUTER_NOUVEAUX_EMPLOYES, input);
    },
    modifierJours: (input): Promise<ReponseIpc<DetailOperationComplet>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_MODIFIER_JOURS, input);
    },
    exporterBordereau: (input): Promise<ReponseIpc<ResultatExportBordereau>> => {
      return ipcRenderer.invoke(CANAUX_IPC.OPERATIONS_EXPORTER_BORDEREAU, input);
    },
  },
  lignes: {
    modifier: (input): Promise<ReponseIpc<ResultatModificationLigne>> => {
      return ipcRenderer.invoke(CANAUX_IPC.LIGNES_MODIFIER, input);
    },
  },
  parametres: {
    lire: (): Promise<ReponseIpc<Parametre>> => {
      return ipcRenderer.invoke(CANAUX_IPC.PARAMETRES_LIRE);
    },
    modifier: (input): Promise<ReponseIpc<Parametre>> => {
      return ipcRenderer.invoke(CANAUX_IPC.PARAMETRES_MODIFIER, input);
    },
  },
  journal: {
    lister: (input): Promise<ReponseIpc<Journal[]>> => {
      return ipcRenderer.invoke(CANAUX_IPC.JOURNAL_LISTER, input);
    },
  },
  importExcel: {
    previsualiser: (cheminFichier) => {
      return ipcRenderer.invoke(CANAUX_IPC.IMPORT_EXCEL_PREVISUALISER, { cheminFichier });
    },
    executer: (params) => {
      return ipcRenderer.invoke(CANAUX_IPC.IMPORT_EXCEL_EXECUTER, params);
    },
  },
  exports: {
    employes: (options) => {
      return ipcRenderer.invoke(CANAUX_IPC.EXPORTS_EMPLOYES, options);
    },
    operation: (options) => {
      return ipcRenderer.invoke(CANAUX_IPC.EXPORTS_OPERATION, options);
    },
    recapitulatif: (options) => {
      return ipcRenderer.invoke(CANAUX_IPC.EXPORTS_RECAPITULATIF, options);
    },
    bulletin: (options) => {
      return ipcRenderer.invoke(CANAUX_IPC.EXPORTS_BULLETIN, options);
    },
    bordereau: (options) => {
      return ipcRenderer.invoke(CANAUX_IPC.EXPORTS_BORDEREAU, options);
    },
  },
  sauvegarde: {
    exporter: (cheminDestination) => {
      return ipcRenderer.invoke(CANAUX_IPC.SAUVEGARDE_EXPORTER, { cheminDestination });
    },
    restaurerFichier: (cheminFichier) => {
      return ipcRenderer.invoke(CANAUX_IPC.SAUVEGARDE_RESTAURER_FICHIER, { cheminFichier });
    },
  },
  fenetre: {
    lirePreferences: (): Promise<ReponseIpc<InfosFenetre>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_LIRE_PREFERENCES);
    },
    definirTheme: (theme: ThemePreference): Promise<ReponseIpc<{ theme: ThemePreference }>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_DEFINIR_THEME, { theme });
    },
    definirZoom: (zoom: number): Promise<ReponseIpc<{ zoom: number }>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_DEFINIR_ZOOM, { zoom });
    },
    definirTailleTexte: (tailleTexte: number): Promise<ReponseIpc<{ tailleTexte: number }>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_DEFINIR_TAILLE_TEXTE, { tailleTexte });
    },
    reduire: (): Promise<ReponseIpc<void>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_REDUIRE);
    },
    basculerAgrandissement: (): Promise<ReponseIpc<{ estAgrandi: boolean }>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_BASCULER_AGRANDISSEMENT);
    },
    fermer: (): Promise<ReponseIpc<void>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_FERMER);
    },
    redemarrer: (): Promise<ReponseIpc<void>> => {
      return ipcRenderer.invoke(CANAUX_IPC.FENETRE_REDEMARRER);
    },
    surChangementEtatAgrandi: (callback: (estAgrandi: boolean) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, estAgrandi: boolean) =>
        callback(estAgrandi);
      ipcRenderer.on('fenetre:etatAgrandi', handler);
      return () => {
        ipcRenderer.removeListener('fenetre:etatAgrandi', handler);
      };
    },
    surChangementPreferences: (callback: (prefs: PreferencesInterface) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, prefs: PreferencesInterface) =>
        callback(prefs);
      ipcRenderer.on('fenetre:changementPreferences', handler);
      return () => {
        ipcRenderer.removeListener('fenetre:changementPreferences', handler);
      };
    },
    surChangementThemeSysteme: (callback: (theme: 'sombre' | 'clair') => void) => {
      const handler = (_event: Electron.IpcRendererEvent, theme: 'sombre' | 'clair') =>
        callback(theme);
      ipcRenderer.on('fenetre:themeSysteme', handler);
      return () => {
        ipcRenderer.removeListener('fenetre:themeSysteme', handler);
      };
    },
    surAvantFermeture: (callback: () => Promise<void> | void) => {
      const handler = async () => {
        try {
          await callback();
        } catch {
          // Ignorer pour ne pas bloquer la fermeture
        } finally {
          ipcRenderer.send('avant-fermeture:reponse');
        }
      };
      ipcRenderer.on('avant-fermeture', handler);
      return () => {
        ipcRenderer.removeListener('avant-fermeture', handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
