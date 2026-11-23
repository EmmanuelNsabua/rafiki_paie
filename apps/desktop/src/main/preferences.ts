import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log/main';
import { type PreferencesInterface, preferencesInterfaceSchema } from '@rafiki/contrat';

const PREFERENCES_PAR_DEFAUT: PreferencesInterface = {
  theme: 'systeme',
  zoom: 1.0,
  tailleTexte: 14,
  fenetre: {
    largeur: 1440,
    hauteur: 900,
    estAgrandi: false,
  },
};

let preferencesActuelles: PreferencesInterface = { ...PREFERENCES_PAR_DEFAUT };
let timerSauvegarde: NodeJS.Timeout | null = null;
let cheminFichierPreferencesCache: string | null = null;

export function obtenirCheminFichierPreferences(): string {
  if (!cheminFichierPreferencesCache) {
    cheminFichierPreferencesCache = path.join(
      app.getPath('userData'),
      'preferences-interface.json'
    );
  }
  return cheminFichierPreferencesCache;
}

export function chargerPreferences(): PreferencesInterface {
  const chemin = obtenirCheminFichierPreferences();
  try {
    if (fs.existsSync(chemin)) {
      const brut = fs.readFileSync(chemin, 'utf-8');
      const json = JSON.parse(brut);
      const validation = preferencesInterfaceSchema.safeParse(json);
      if (validation.success) {
        preferencesActuelles = validation.data;
        return preferencesActuelles;
      }
      log.warn('[PREFERENCES] Fichier de préférences invalide, repli sur valeurs par défaut');
    }
  } catch (err: any) {
    log.warn(`[PREFERENCES] Erreur de lecture (${err?.message}), repli sur valeurs par défaut`);
  }

  preferencesActuelles = { ...PREFERENCES_PAR_DEFAUT };
  return preferencesActuelles;
}

export function obtenirPreferences(): PreferencesInterface {
  return preferencesActuelles;
}

export function modifierPreferences(
  partielles: Partial<PreferencesInterface>
): PreferencesInterface {
  preferencesActuelles = {
    ...preferencesActuelles,
    ...partielles,
    fenetre: {
      ...preferencesActuelles.fenetre,
      ...(partielles.fenetre || {}),
    },
  };

  programmerSauvegardePreferences();
  return preferencesActuelles;
}

function programmerSauvegardePreferences(): void {
  if (timerSauvegarde) {
    clearTimeout(timerSauvegarde);
  }

  timerSauvegarde = setTimeout(() => {
    forcerSauvegardePreferences();
  }, 300);
}

export function forcerSauvegardePreferences(): void {
  if (timerSauvegarde) {
    clearTimeout(timerSauvegarde);
    timerSauvegarde = null;
  }

  const chemin = obtenirCheminFichierPreferences();
  try {
    const dossier = path.dirname(chemin);
    if (!fs.existsSync(dossier)) {
      fs.mkdirSync(dossier, { recursive: true });
    }
    const contenu = JSON.stringify(preferencesActuelles, null, 2);
    // Écriture synchrone pour garantir la persistance avant fermeture
    fs.writeFileSync(chemin, contenu, 'utf-8');
    log.info('[PREFERENCES] Préférences enregistrées dans', chemin);
  } catch (err: any) {
    log.error(`[PREFERENCES] Erreur lors de l'enregistrement : ${err?.message}`);
  }
}
