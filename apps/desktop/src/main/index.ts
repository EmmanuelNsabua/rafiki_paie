import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import log from 'electron-log/main';
import { ouvrirBaseDeDonnees, obtenirCheminBaseParDefaut } from './db/database';
import { enregistrerGestionnairesIpc } from './ipc';
import { SauvegardeService } from './domain';
import { enregistrerSchemaApp, enregistrerGestionnaireApp, obtenirDossierWebOut } from './protocol';

log.initialize();
log.transports.console.level = 'info';

// Configuration du schéma de protocole privilégié AVANT app.whenReady()
enregistrerSchemaApp();

// Configuration du fichier de log pour audit et vérification
try {
  const dossierLogs = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(dossierLogs)) {
    fs.mkdirSync(dossierLogs, { recursive: true });
  }
  log.transports.file.resolvePathFn = () => path.join(dossierLogs, 'main.log');
} catch {
  // Ignorer si échec
}

log.info('[MAIN] Process starting up');

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

function initDatabase(): Database.Database {
  return ouvrirBaseDeDonnees();
}

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 680,
    title: 'Paie Rafiki',
    backgroundColor: '#EFEFEF',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--is-dev=${isDev ? 'true' : 'false'}`],
    },
  });

  // Transmission des messages de console du renderer dans les logs principaux
  mainWindow.webContents.on('console-message', (_event, _level, message) => {
    const msgNettoye = message.startsWith('[RENDERER]') ? message.slice(10).trim() : message;
    log.info(`[RENDERER] ${msgNettoye}`);
  });

  // Vérification explicite de la présence de window.api dès la fin du chargement de la page
  mainWindow.webContents.on('did-finish-load', async () => {
    try {
      const apiDefini = await mainWindow?.webContents.executeJavaScript(
        'typeof window.api !== "undefined" && typeof window.api.pingDb === "function"'
      );
      log.info(`[MAIN] Vérification did-finish-load : window.api défini = ${apiDefini}`);

      // Attente brève pour permettre le rendu React initial et la réponse db:ping
      setTimeout(async () => {
        try {
          const infoVisuelle = await mainWindow?.webContents.executeJavaScript(`
            (() => {
              const bg = window.getComputedStyle(document.body).backgroundColor;
              const statut = document.querySelector('header span')?.textContent || '';
              return { bg, statut };
            })()
          `);
          log.info(
            `[MAIN] État visuel page empaquetée : fond = "${infoVisuelle?.bg}", statut = "${infoVisuelle?.statut}"`
          );

          // Capture d'écran pour preuve formelle
          const dossierCaptures = path.resolve(process.cwd(), 'screenshots');
          if (!fs.existsSync(dossierCaptures)) {
            fs.mkdirSync(dossierCaptures, { recursive: true });
          }
          const img = await mainWindow?.webContents.capturePage();
          if (img) {
            fs.writeFileSync(path.join(dossierCaptures, 'packaged-app.png'), img.toPNG());
            log.info("[MAIN] Capture d'écran enregistrée : screenshots/packaged-app.png");
          }
        } catch (e: any) {
          log.warn('[MAIN] Erreur vérification visuelle :', e.message);
        }
      }, 1200);
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

app.whenReady().then(() => {
  log.info('[MAIN] app.whenReady resolved! Initializing database...');
  db = initDatabase();

  // Enregistrer le gestionnaire du protocole app:// servant resources/web/out
  const dossierWebOut = obtenirDossierWebOut();
  enregistrerGestionnaireApp(dossierWebOut);

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

  // Enregistrer les gestionnaires IPC du domaine
  enregistrerGestionnairesIpc(db, sauvegardeService);

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      db.close();
      db = null;
    }
    app.quit();
  }
});
