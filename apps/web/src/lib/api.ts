import type {
  ElectronApi,
  Employe,
  OperationPaie,
  ResumeOperationLister,
  DetailOperationComplet,
  ResultatModificationLigne,
  ResultatAjoutEmployes,
  ResultatExportBordereau,
  PrevisualisationImportResult,
  ExecutionImportParams,
  ExecutionImportResult,
  OptionsExportEmployes,
  OptionsExportOperation,
  OptionsExportRecapitulatif,
  OptionsExportBulletin,
  OptionsExportBordereau,
  ResultatExportFichier,
  Parametre,
  Journal,
  ReponseIpc,
  InfosFenetre,
  PreferencesInterface,
  ThemePreference,
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
  InfoMiseAJour,
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

export function obtenirCheminFichier(file: File): string {
  if (typeof window === 'undefined' || !window.api) {
    throw new ErreurMetierClient(
      'ENVIRONNEMENT_INVALIDE',
      'Ouvrez cette page dans l application École RAFIKI'
    );
  }
  if (typeof window.api.obtenirCheminFichier === 'function') {
    const chemin = window.api.obtenirCheminFichier(file);
    if (chemin) return chemin;
  }
  const cheminLegacy = (file as any)?.path;
  if (cheminLegacy) return cheminLegacy;

  throw new ErreurMetierClient(
    'FONCTION_NON_GEREE',
    'Cette version de l application École RAFIKI ne gère pas encore cette fonction, mettez-la à jour'
  );
}

async function executerIpc<T>(appel: (api: ElectronApi) => Promise<ReponseIpc<T>>): Promise<T> {
  if (typeof window === 'undefined' || !window.api) {
    throw new ErreurMetierClient(
      'ENVIRONNEMENT_INVALIDE',
      'Ouvrez cette page dans l application École RAFIKI'
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

    supprimer: (input: { id: string }): Promise<void> =>
      executerIpc((a) => a.operations.supprimer(input)),

    annuler: (input: { id: string }): Promise<OperationPaie> =>
      executerIpc((a) => a.operations.annuler(input)),

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

  importExcel: {
    previsualiser: (cheminFichier: string): Promise<PrevisualisationImportResult> =>
      executerIpc((a) => a.importExcel.previsualiser(cheminFichier)),
    executer: (params: ExecutionImportParams): Promise<ExecutionImportResult> =>
      executerIpc((a) => a.importExcel.executer(params)),
  },

  exports: {
    employes: (options: OptionsExportEmployes): Promise<ResultatExportFichier> =>
      executerIpc((a) => a.exports.employes(options)),
    operation: (options: OptionsExportOperation): Promise<ResultatExportFichier> =>
      executerIpc((a) => a.exports.operation(options)),
    recapitulatif: (options: OptionsExportRecapitulatif): Promise<ResultatExportFichier> =>
      executerIpc((a) => a.exports.recapitulatif(options)),
    bulletin: (options: OptionsExportBulletin): Promise<ResultatExportFichier> =>
      executerIpc((a) => a.exports.bulletin(options)),
    bordereau: (options: OptionsExportBordereau): Promise<ResultatExportBordereau> =>
      executerIpc((a) => a.exports.bordereau(options)),
  },

  sauvegarde: {
    exporter: (cheminDestination: string): Promise<string> =>
      executerIpc((a) => a.sauvegarde.exporter(cheminDestination)),
    restaurerFichier: (cheminFichier: string): Promise<void> =>
      executerIpc((a) => a.sauvegarde.restaurerFichier(cheminFichier)),
  },

  obtenirCheminFichier,

  fenetre: {
    lirePreferences: (): Promise<InfosFenetre> => executerIpc((a) => a.fenetre.lirePreferences()),
    definirTheme: (theme: ThemePreference) => executerIpc((a) => a.fenetre.definirTheme(theme)),
    definirZoom: (zoom: number) => executerIpc((a) => a.fenetre.definirZoom(zoom)),
    definirTailleTexte: (taille: number) =>
      executerIpc((a) => a.fenetre.definirTailleTexte(taille)),
    reduire: () => executerIpc((a) => a.fenetre.reduire()),
    basculerAgrandissement: () => executerIpc((a) => a.fenetre.basculerAgrandissement()),
    fermer: () => executerIpc((a) => a.fenetre.fermer()),
    redemarrer: () => executerIpc((a) => a.fenetre.redemarrer()),
    surChangementEtatAgrandi: (callback: (estAgrandi: boolean) => void) => {
      if (typeof window !== 'undefined' && window.api?.fenetre?.surChangementEtatAgrandi) {
        return window.api.fenetre.surChangementEtatAgrandi(callback);
      }
      return () => {};
    },
    surChangementPreferences: (callback: (prefs: PreferencesInterface) => void) => {
      if (typeof window !== 'undefined' && window.api?.fenetre?.surChangementPreferences) {
        return window.api.fenetre.surChangementPreferences(callback);
      }
      return () => {};
    },
    surChangementThemeSysteme: (callback: (theme: 'sombre' | 'clair') => void) => {
      if (typeof window !== 'undefined' && window.api?.fenetre?.surChangementThemeSysteme) {
        return window.api.fenetre.surChangementThemeSysteme(callback);
      }
      return () => {};
    },
    surAvantFermeture: (callback: () => Promise<void> | void) => {
      if (typeof window !== 'undefined' && window.api?.fenetre?.surAvantFermeture) {
        return window.api.fenetre.surAvantFermeture(callback);
      }
      return () => {};
    },
  },

  maj: {
    verifier: (): Promise<InfoMiseAJour> => executerIpc((a) => a.maj.verifier()),
    installer: (): Promise<void> => executerIpc((a) => a.maj.installer()),
    obtenirEtat: (): Promise<InfoMiseAJour> => executerIpc((a) => a.maj.obtenirEtat()),
    surChangementEtat: (callback: (info: InfoMiseAJour) => void) => {
      if (typeof window !== 'undefined' && window.api?.maj?.surChangementEtat) {
        return window.api.maj.surChangementEtat(callback);
      }
      return () => {};
    },
  },
};
