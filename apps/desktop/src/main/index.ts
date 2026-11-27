import { app, BrowserWindow, Menu, ipcMain, nativeTheme, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import log from 'electron-log/main';
import { ouvrirBaseDeDonnees, obtenirCheminBaseParDefaut } from './db/database';
import { enregistrerGestionnairesIpc } from './ipc';
import {
  enregistrerGestionnairesFenetreIpc,
  appliquerThemeSurFenetre,
  executerFermetureSansPerte,
} from './ipc/fenetre-ipc';
import {
  chargerPreferences,
  obtenirPreferences,
  modifierPreferences,
  forcerSauvegardePreferences,
} from './preferences';
import { SauvegardeService, UpdateService } from './domain';
import { enregistrerSchemaApp, enregistrerGestionnaireApp, obtenirDossierWebOut } from './protocol';
import { creerSplashScreen, mettreAJourSplashScreen } from './splash';
import {
  obtenirCheminFichierLog,
  assurerRaccourciLogsSurBureau,
  ouvrirVisionneuseLogs,
} from './logs-viewer';

log.initialize();
log.transports.console.level = 'info';

// Stabilisation absolue du dossier userData pour préserver la base SQLite et les sauvegardes
if (app?.getPath && app?.setPath) {
  try {
    const customUserData = process.env.ELECTRON_USER_DATA || process.env.RAFIKI_USER_DATA;
    const dossierUserDataStable =
      customUserData || path.join(app.getPath('appData'), 'rafiki-paie');
    app.setPath('userData', dossierUserDataStable);
    log.info(`[MAIN] Chemin userData stabilisé : ${dossierUserDataStable}`);
  } catch (err: any) {
    log.warn('[MAIN] Impossible de stabiliser userData :', err?.message);
  }
}

// Identifiant d'application permanent dans la barre des tâches Windows
if (app?.setAppUserModelId) {
  app.setAppUserModelId('com.starclip.paie');
}

// Verrou d'instance unique pour empêcher les conflits SQLite
const verrouInstanceUnique =
  typeof app?.requestSingleInstanceLock === 'function' ? app.requestSingleInstanceLock() : true;
if (!verrouInstanceUnique) {
  log.warn(
    '[MAIN] Une instance de l École RAFIKI est déjà en cours d exécution. Fermeture immédiate.'
  );
  app.quit();
}

// Configuration du schéma de protocole privilégié AVANT app.whenReady()
enregistrerSchemaApp();

// Configuration du fichier de log pour audit et vérification (dans userData/logs)
try {
  log.transports.file.resolvePathFn = () => obtenirCheminFichierLog();
} catch {
  // Ignorer si échec
}

process.on('uncaughtException', (err) => {
  log.error('[MAIN] Exception non capturée :', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  log.error('[MAIN] Promesse rejetée non gérée :', reason?.stack || reason?.message || reason);
});

log.info('[MAIN] Process starting up');

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;
let fermetureAutorisee = false;

function initDatabase(): Database.Database {
  return ouvrirBaseDeDonnees();
}

function ajusterZoom(delta: number): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const prefs = obtenirPreferences();
  const nouveauZoom = Math.max(0.5, Math.min(2.0, Math.round((prefs.zoom + delta) * 10) / 10));
  mainWindow.webContents.setZoomFactor(nouveauZoom);
  const maj = modifierPreferences({ zoom: nouveauZoom });
  mainWindow.webContents.send('fenetre:changementPreferences', maj);
}

function reinitialiserZoom(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.setZoomFactor(1.0);
  const maj = modifierPreferences({ zoom: 1.0 });
  mainWindow.webContents.send('fenetre:changementPreferences', maj);
}

function createWindow(splashWindow: BrowserWindow | null = null): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const preferences = obtenirPreferences();

  // Définition de themeSource dès l'initialisation
  appliquerThemeSurFenetre(preferences.theme);
  const initialBgColor = nativeTheme.shouldUseDarkColors ? '#202020' : '#F3F3F3';

  // Supprime tout menu d'application par défaut (plus de bande File Edit...)
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    title: 'École RAFIKI',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    width: preferences.fenetre.largeur || 1440,
    height: preferences.fenetre.hauteur || 900,
    x: preferences.fenetre.x,
    y: preferences.fenetre.y,
    minWidth: 1100,
    minHeight: 650,
    backgroundColor: initialBgColor,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--is-dev=${isDev ? 'true' : 'false'}`],
    },
  });

  let fenetreRevelee = false;
  const revelerFenetrePrincipale = () => {
    if (fenetreRevelee || !mainWindow || mainWindow.isDestroyed()) return;
    fenetreRevelee = true;

    if (preferences.fenetre.estAgrandi) {
      mainWindow.maximize();
    }
    mainWindow.show();
    mainWindow.focus();

    if (splashWindow && !splashWindow.isDestroyed()) {
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.destroy();
        }
      }, 350);
    }
  };

  mainWindow.once('ready-to-show', async () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      await mettreAJourSplashScreen(splashWindow, 'Prêt ! Lancement de l application...', 100);
    }
    revelerFenetrePrincipale();
  });

  // Sécurité : si ready-to-show tarde, affichage forcé
  setTimeout(() => {
    revelerFenetrePrincipale();
  }, 6000);

  // Écoute de l'événement système de thème pour mettre à jour backgroundColor et renderer
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const estSombre = nativeTheme.shouldUseDarkColors;
      const couleur = estSombre ? '#202020' : '#F3F3F3';
      mainWindow.setBackgroundColor(couleur);
      mainWindow.webContents.send('fenetre:themeSysteme', estSombre ? 'sombre' : 'clair');
    }
  });

  // Empêche le menu contextuel système sur la barre de titre sous Windows
  mainWindow.on('system-context-menu' as any, (event: any) => {
    event.preventDefault();
  });

  // Gestion des raccourcis clavier de zoom et blocage des outils de dev en empaqueté
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (app.isPackaged) {
      const key = input.key.toLowerCase();
      const ctrlOrMeta = input.control || input.meta;
      if (
        key === 'f12' ||
        (ctrlOrMeta && input.shift && ['i', 'j', 'c'].includes(key)) ||
        (ctrlOrMeta && key === 'u') ||
        key === 'f5' ||
        (ctrlOrMeta && key === 'r')
      ) {
        event.preventDefault();
        return;
      }
    }

    if (input.type === 'keyDown' && (input.control || input.meta)) {
      if (input.key === '=' || input.key === '+' || input.code === 'NumpadAdd') {
        event.preventDefault();
        ajusterZoom(0.1);
      } else if (input.key === '-' || input.code === 'NumpadSubtract') {
        event.preventDefault();
        ajusterZoom(-0.1);
      } else if (input.key === '0' || input.code === 'Numpad0') {
        event.preventDefault();
        reinitialiserZoom();
      }
    }
  });

  mainWindow.webContents.on('zoom-changed', (_event, direction) => {
    if (direction === 'in') {
      ajusterZoom(0.1);
    } else if (direction === 'out') {
      ajusterZoom(-0.1);
    }
  });

  // Mémorisation de la géométrie de la fenêtre
  const enregistrerGeometrie = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const estAgrandi = mainWindow.isMaximized();
    if (!estAgrandi) {
      const bounds = mainWindow.getBounds();
      modifierPreferences({
        fenetre: {
          x: bounds.x,
          y: bounds.y,
          largeur: bounds.width,
          hauteur: bounds.height,
          estAgrandi: false,
        },
      });
    } else {
      modifierPreferences({
        fenetre: {
          ...obtenirPreferences().fenetre,
          estAgrandi: true,
        },
      });
    }
  };

  mainWindow.on('resize', enregistrerGeometrie);
  mainWindow.on('move', enregistrerGeometrie);

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('fenetre:etatAgrandi', true);
    enregistrerGeometrie();
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('fenetre:etatAgrandi', false);
    enregistrerGeometrie();
  });

  // Procédure avant-fermeture sans perte lors de Alt+F4 ou croix
  mainWindow.on('close', (event) => {
    if (!fermetureAutorisee) {
      event.preventDefault();
      executerFermetureSansPerte(mainWindow, false).then(() => {
        fermetureAutorisee = true;
        mainWindow?.close();
      });
    }
  });

  // Transmission des messages de console du renderer dans les logs principaux
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    const msgNettoye = message.startsWith('[RENDERER]') ? message.slice(10).trim() : message;
    log.info(`[RENDERER] ${msgNettoye}`);
  });

  // Vérification did-finish-load et application du zoom initial
  mainWindow.webContents.on('did-finish-load', async () => {
    if (preferences.zoom && preferences.zoom !== 1.0) {
      mainWindow?.webContents.setZoomFactor(preferences.zoom);
    }
    try {
      const apiDefini = await mainWindow?.webContents.executeJavaScript(
        'typeof window.api !== "undefined" && typeof window.api.pingDb === "function"'
      );
      log.info(`[MAIN] Vérification did-finish-load : window.api défini = ${apiDefini}`);
    } catch (err: any) {
      log.warn('[MAIN] Impossible de vérifier window.api au did-finish-load :', err.message);
    }
  });

  // Strict Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: http://localhost:3000;",
        ],
      },
    });
  });

  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl).catch((err) => {
      log.warn('[MAIN] Impossible de charger devUrl, bascule vers app://rafiki/ :', err.message);
      mainWindow?.loadURL('app://rafiki/');
    });
  } else {
    mainWindow.loadURL('app://rafiki/').catch((err) => {
      log.error('[MAIN] Impossible de charger app://rafiki/ :', err.message);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

log.info('[MAIN] Registering app.whenReady');

app.whenReady().then(async () => {
  const modeLogsSeulement = process.argv.includes('--logs');
  log.info(`[MAIN] app.whenReady resolved! (modeLogs=${modeLogsSeulement})`);

  // Assurer la présence du raccourci Journal Logs sur le Bureau Windows
  assurerRaccourciLogsSurBureau();

  if (modeLogsSeulement) {
    Menu.setApplicationMenu(null);
    ouvrirVisionneuseLogs();
    return;
  }

  // 1. Affichage immédiat du Splash Screen inspiré de DBeaver
  const splashWindow = creerSplashScreen();
  await mettreAJourSplashScreen(splashWindow, 'Chargement des préférences...', 20);

  // Chargement des préférences avant toute création de fenêtre
  chargerPreferences();

  // Suppression absolue du menu d'application
  Menu.setApplicationMenu(null);

  await mettreAJourSplashScreen(splashWindow, 'Connexion à la base de données...', 40);
  try {
    db = initDatabase();
  } catch (err: any) {
    if (err?.code === 'BASE_TROP_RECENTE') {
      log.error(`[MAIN] Échec démarrage : ${err.message}`);
      dialog.showErrorBox(
        'Version de l École RAFIKI obsolète',
        err.message ||
          'Cette version de l application École RAFIKI est plus ancienne que vos données. Installez la dernière version.'
      );
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
      app.quit();
      return;
    }
    throw err;
  }

  // Enregistrer le gestionnaire du protocole app:// servant resources/web/out
  const dossierWebOut = obtenirDossierWebOut();
  enregistrerGestionnaireApp(dossierWebOut);

  await mettreAJourSplashScreen(splashWindow, 'Vérification des sauvegardes locales...', 60);
  // Initialisation du service de sauvegarde locale
  const dbPath = obtenirCheminBaseParDefaut();
  const dossierSauvegardes = path.join(path.dirname(dbPath), 'sauvegardes');
  const sauvegardeService = new SauvegardeService({
    dossierSauvegardes,
    db,
    cheminFichierDb: dbPath,
  });

  sauvegardeService.verifierEtSauvegarderAuDemarrage().catch((err: any) => {
    log.warn(`[SAUVEGARDE] Erreur lors de la vérification au démarrage : ${err?.message}`);
  });

  // Initialisation du service de mise à jour automatique (Lot 2)
  const updateService = new UpdateService(sauvegardeService, () => mainWindow);
  updateService.planifierVerificationInitiale();

  await mettreAJourSplashScreen(splashWindow, 'Initialisation des services métier...', 80);
  // Enregistrer les gestionnaires IPC du domaine
  enregistrerGestionnairesIpc(db, sauvegardeService, updateService);

  // Enregistrer les gestionnaires IPC de la fenêtre
  enregistrerGestionnairesFenetreIpc(() => mainWindow);

  ipcMain.handle('db:ping', () => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const row = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
    log.info('[MAIN] IPC db:ping received. SQLite version:', row.version);
    return {
      success: true,
      sqlite_version: row.version,
    };
  });

  await mettreAJourSplashScreen(splashWindow, 'Ouverture du tableau de bord...', 92);
  createWindow(splashWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('second-instance', (_event, argv) => {
    if (argv.includes('--logs')) {
      ouvrirVisionneuseLogs();
      return;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    forcerSauvegardePreferences();
    if (db) {
      db.close();
      db = null;
    }
    app.quit();
  }
});
