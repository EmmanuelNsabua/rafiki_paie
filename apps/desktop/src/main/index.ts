import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';
import log from 'electron-log/main';
import { ouvrirBaseDeDonnees, obtenirCheminBaseParDefaut } from './db/database';
import { enregistrerGestionnairesIpc } from './ipc';
import { SauvegardeService } from './domain';

log.initialize();
log.transports.console.level = 'info';

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

function obtenirCheminIndexHtml(isDev: boolean): string {
  if (isDev) {
    // En développement, chemin vers l'export statique local du workspace web
    return path.join(__dirname, '../../../../apps/web/out/index.html');
  }
  // En production empaquetée, les fichiers statiques sont dans extraResources (process.resourcesPath)
  return path.join(process.resourcesPath, 'web/out/index.html');
}

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Paie Rafiki',
    backgroundColor: '#f5f5f7',
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
    log.info(`[RENDERER] ${message}`);
  });

  // Vérification explicite de la présence de window.api dès la fin du chargement de la page
  mainWindow.webContents.on('did-finish-load', async () => {
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
      log.warn('[MAIN] Impossible de charger devUrl, bascule vers index.html local :', err.message);
      const outPath = obtenirCheminIndexHtml(true);
      if (fs.existsSync(outPath)) {
        mainWindow?.loadFile(outPath);
      }
    });
  } else {
    const outPath = obtenirCheminIndexHtml(false);
    if (fs.existsSync(outPath)) {
      mainWindow.loadFile(outPath);
    } else {
      log.error('[MAIN] Fichier index.html introuvable en production :', outPath);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

log.info('[MAIN] Registering app.whenReady');

app.whenReady().then(() => {
  log.info('[MAIN] app.whenReady resolved! Initializing database...');
  db = initDatabase();

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
