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
  Parametre,
  Journal,
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
};

contextBridge.exposeInMainWorld('api', api);
