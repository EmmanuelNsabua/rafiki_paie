import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Database from 'better-sqlite3';

let mainWindow: BrowserWindow | null = null;
let db: Database.Database | null = null;

function initDatabase(): Database.Database {
  const userDataPath = app.getPath('userData');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  const dbPath = path.join(userDataPath, 'rafiki_paie.sqlite');
  const database = new Database(dbPath);
  database.pragma('journal_mode = WAL');
  return database;
}

function createWindow(): void {
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
    },
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

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    const devUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(devUrl).catch(() => {
      // Fallback to local out folder if dev server not running
      const outPath = path.join(__dirname, '../../../web/out/index.html');
      if (fs.existsSync(outPath)) {
        mainWindow?.loadFile(outPath);
      }
    });
  } else {
    const outPath = path.join(__dirname, '../../../web/out/index.html');
    if (fs.existsSync(outPath)) {
      mainWindow.loadFile(outPath);
    } else {
      mainWindow.loadURL('app://./index.html');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  db = initDatabase();

  ipcMain.handle('db:ping', () => {
    if (!db) {
      throw new Error('Database not initialized');
    }
    const row = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
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
