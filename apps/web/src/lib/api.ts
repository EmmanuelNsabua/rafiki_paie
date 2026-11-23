import type {
  ElectronApi,
  Employe,
  OperationPaie,
  ResumeOperationLister,
  DetailOperationComplet,
  ResultatModificationLigne,
  ResultatAjoutEmployes,
  ResultatExportBordereau,
  Parametre,
  Journal,
  ReponseIpc,
  ipcEmployesListerInput,
  ipcEmployesCreerInput,
  ipcEmployesModifierInput,
  ipcEmployesDesactiverInput,
  ipcOperationsOuvrirInput,
  ipcOperationsObtenirInput,
  ipcOperationsTerminerInput,
  ipcOperationsRouvrirInput,
  ipcOperationsAjouterNouveauxEmployesInput,
  ipcOperationsModifierJoursInput,
  ipcOperationsExporterBordereauInput,
  ipcLignesModifierInput,
  ipcParametresModifierInput,
  ipcJournalListerInput,
} from '@rafiki/contrat';
import { z } from 'zod';

export class ErreurMetierClient extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ErreurMetierClient';
    this.code = code;
  }
}

export function estDansElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.api !== 'undefined';
}

async function executerIpc<T>(appel: (api: ElectronApi) => Promise<ReponseIpc<T>>): Promise<T> {
  if (typeof window === 'undefined' || !window.api) {
    throw new ErreurMetierClient(
      'ENVIRONNEMENT_INVALIDE',
      'Cette page doit être ouverte dans l application Paie Rafiki.'
    );
  }

  const reponse = await appel(window.api);
  if (!reponse.ok) {
    throw new ErreurMetierClient(reponse.erreur.code, reponse.erreur.message);
  }

  return reponse.data;
}

export const api = {
  estDansElectron,

  pingDb: async () => {
    if (typeof window === 'undefined' || !window.api || !window.api.pingDb) {
      return { success: false, sqlite_version: '' };
    }
    return window.api.pingDb();
  },

  employes: {
    lister: (input?: z.infer<typeof ipcEmployesListerInput>): Promise<Employe[]> =>
      executerIpc((a) => a.employes.lister(input)),

    creer: (input: z.infer<typeof ipcEmployesCreerInput>): Promise<Employe> =>
      executerIpc((a) => a.employes.creer(input)),

    modifier: (input: z.infer<typeof ipcEmployesModifierInput>): Promise<Employe> =>
      executerIpc((a) => a.employes.modifier(input)),

    desactiver: (input: z.infer<typeof ipcEmployesDesactiverInput>): Promise<Employe> =>
      executerIpc((a) => a.employes.desactiver(input)),
  },

  operations: {
    lister: (): Promise<ResumeOperationLister[]> => executerIpc((a) => a.operations.lister()),

    ouvrir: (input: z.infer<typeof ipcOperationsOuvrirInput>): Promise<OperationPaie> =>
      executerIpc((a) => a.operations.ouvrir(input)),

    obtenir: (input: z.infer<typeof ipcOperationsObtenirInput>): Promise<DetailOperationComplet> =>
      executerIpc((a) => a.operations.obtenir(input)),

    terminer: (input: z.infer<typeof ipcOperationsTerminerInput>): Promise<OperationPaie> =>
      executerIpc((a) => a.operations.terminer(input)),

    rouvrir: (input: z.infer<typeof ipcOperationsRouvrirInput>): Promise<OperationPaie> =>
      executerIpc((a) => a.operations.rouvrir(input)),

    ajouterNouveauxEmployes: (
      input: z.infer<typeof ipcOperationsAjouterNouveauxEmployesInput>
    ): Promise<ResultatAjoutEmployes> =>
      executerIpc((a) => a.operations.ajouterNouveauxEmployes(input)),

    modifierJours: (
      input: z.infer<typeof ipcOperationsModifierJoursInput>
    ): Promise<DetailOperationComplet> => executerIpc((a) => a.operations.modifierJours(input)),

    exporterBordereau: (
      input: z.infer<typeof ipcOperationsExporterBordereauInput>
    ): Promise<ResultatExportBordereau> =>
      executerIpc((a) => a.operations.exporterBordereau(input)),
  },

  lignes: {
    modifier: (input: z.infer<typeof ipcLignesModifierInput>): Promise<ResultatModificationLigne> =>
      executerIpc((a) => a.lignes.modifier(input)),
  },

  parametres: {
    lire: (): Promise<Parametre> => executerIpc((a) => a.parametres.lire()),

    modifier: (input: z.infer<typeof ipcParametresModifierInput>): Promise<Parametre> =>
      executerIpc((a) => a.parametres.modifier(input)),
  },

  journal: {
    lister: (input?: z.infer<typeof ipcJournalListerInput>): Promise<Journal[]> =>
      executerIpc((a) => a.journal.lister(input)),
  },
};
