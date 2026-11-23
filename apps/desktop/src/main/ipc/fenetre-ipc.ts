import { app, BrowserWindow, ipcMain, nativeTheme } from 'electron';
import { z } from 'zod';
import log from 'electron-log/main';
import {
  CANAUX_IPC,
  type ReponseIpc,
  type InfosFenetre,
  type ThemePreference,
  ipcFenetreDefinirThemeInput,
  ipcFenetreDefinirZoomInput,
  ipcFenetreDefinirTailleTexteInput,
} from '@rafiki/contrat';
import {
  obtenirPreferences,
  modifierPreferences,
  forcerSauvegardePreferences,
} from '../preferences';
import { creerGestionnaireSecurise } from './index';

let fermetureEnCours = false;

export function appliquerThemeSurFenetre(theme: ThemePreference, win?: BrowserWindow | null): void {
  if (theme === 'systeme') {
    nativeTheme.themeSource = 'system';
  } else if (theme === 'clair') {
    nativeTheme.themeSource = 'light';
  } else {
    nativeTheme.themeSource = 'dark';
  }

  const couleurFond = nativeTheme.shouldUseDarkColors ? '#202020' : '#F3F3F3';
  if (win && !win.isDestroyed()) {
    win.setBackgroundColor(couleurFond);
  }
}

/**
 * Exécute la procédure de fermeture ou de redémarrage sans perte :
 * 1. Notifie le renderer via le canal "avant-fermeture"
 * 2. Attend au plus 2000 ms la confirmation ou le timeout
 * 3. Enregistre les préférences de manière synchrone
 * 4. Quitte ou relance l'application
 */
export async function executerFermetureSansPerte(
  win: BrowserWindow | null,
  relancer: boolean = false
): Promise<void> {
  if (fermetureEnCours) return;
  fermetureEnCours = true;

  log.info(`[MAIN] Procédure avant-fermeture démarrée (relance = ${relancer})`);

  if (win && !win.isDestroyed()) {
    try {
      const promesseReponse = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          log.warn('[MAIN] Délai avant-fermeture expiré (2000ms), continuation...');
          resolve();
        }, 2000);

        ipcMain.once('avant-fermeture:reponse', () => {
          clearTimeout(timeout);
          log.info('[MAIN] Réponse avant-fermeture reçue du renderer');
          resolve();
        });

        win.webContents.send('avant-fermeture');
      });

      await promesseReponse;
    } catch (err: any) {
      log.warn(`[MAIN] Erreur lors de la notification avant-fermeture : ${err?.message}`);
    }
  }

  // Sauvegarde synchrone des préférences
  forcerSauvegardePreferences();

  if (relancer) {
    log.info("[MAIN] Relance de l'application (app.relaunch)");
    app.relaunch();
    app.exit(0);
  } else {
    log.info("[MAIN] Fermeture de l'application");
    if (win && !win.isDestroyed()) {
      win.destroy();
    }
    app.quit();
  }
}

export function enregistrerGestionnairesFenetreIpc(
  obtenirFenetre: () => BrowserWindow | null
): void {
  // 1. Lire préférences
  ipcMain.handle(
    CANAUX_IPC.FENETRE_LIRE_PREFERENCES,
    creerGestionnaireSecurise(CANAUX_IPC.FENETRE_LIRE_PREFERENCES, z.unknown(), () => {
      const win = obtenirFenetre();
      const prefs = obtenirPreferences();
      const estAgrandi = win ? win.isMaximized() : false;
      const reponse: InfosFenetre = {
        preferences: prefs,
        estAgrandi,
        version: app.getVersion(),
      };
      return reponse;
    })
  );

  // 2. Définir thème
  ipcMain.handle(
    CANAUX_IPC.FENETRE_DEFINIR_THEME,
    creerGestionnaireSecurise(
      CANAUX_IPC.FENETRE_DEFINIR_THEME,
      ipcFenetreDefinirThemeInput,
      (input) => {
        const win = obtenirFenetre();
        modifierPreferences({ theme: input.theme });
        appliquerThemeSurFenetre(input.theme, win);
        return { theme: input.theme };
      }
    )
  );

  // 3. Définir zoom
  ipcMain.handle(
    CANAUX_IPC.FENETRE_DEFINIR_ZOOM,
    creerGestionnaireSecurise(
      CANAUX_IPC.FENETRE_DEFINIR_ZOOM,
      ipcFenetreDefinirZoomInput,
      (input) => {
        const win = obtenirFenetre();
        const facteurArrondi = Math.round(input.zoom * 10) / 10;
        if (win && !win.isDestroyed()) {
          win.webContents.setZoomFactor(facteurArrondi);
        }
        modifierPreferences({ zoom: facteurArrondi });
        return { zoom: facteurArrondi };
      }
    )
  );

  // 4. Définir taille du texte
  ipcMain.handle(
    CANAUX_IPC.FENETRE_DEFINIR_TAILLE_TEXTE,
    creerGestionnaireSecurise(
      CANAUX_IPC.FENETRE_DEFINIR_TAILLE_TEXTE,
      ipcFenetreDefinirTailleTexteInput,
      (input) => {
        modifierPreferences({ tailleTexte: input.tailleTexte });
        return { tailleTexte: input.tailleTexte };
      }
    )
  );

  // 5. Réduire
  ipcMain.handle(
    CANAUX_IPC.FENETRE_REDUIRE,
    creerGestionnaireSecurise(CANAUX_IPC.FENETRE_REDUIRE, z.unknown(), () => {
      const win = obtenirFenetre();
      if (win && !win.isDestroyed()) {
        win.minimize();
      }
    })
  );

  // 6. Basculer agrandissement
  ipcMain.handle(
    CANAUX_IPC.FENETRE_BASCULER_AGRANDISSEMENT,
    creerGestionnaireSecurise(CANAUX_IPC.FENETRE_BASCULER_AGRANDISSEMENT, z.unknown(), () => {
      const win = obtenirFenetre();
      if (!win || win.isDestroyed()) {
        return { estAgrandi: false };
      }
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      const estAgrandi = win.isMaximized();
      return { estAgrandi };
    })
  );

  // 7. Fermer
  ipcMain.handle(
    CANAUX_IPC.FENETRE_FERMER,
    creerGestionnaireSecurise(CANAUX_IPC.FENETRE_FERMER, z.unknown(), async () => {
      const win = obtenirFenetre();
      await executerFermetureSansPerte(win, false);
    })
  );

  // 8. Redémarrer
  ipcMain.handle(
    CANAUX_IPC.FENETRE_REDEMARRER,
    creerGestionnaireSecurise(CANAUX_IPC.FENETRE_REDEMARRER, z.unknown(), async () => {
      const win = obtenirFenetre();
      await executerFermetureSansPerte(win, true);
    })
  );
}
