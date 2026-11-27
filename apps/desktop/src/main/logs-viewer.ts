import { app, BrowserWindow, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';

let logsWindow: BrowserWindow | null = null;

/**
 * Retourne le chemin permanent et inscriptible du fichier journal de l'application.
 */
export function obtenirCheminFichierLog(): string {
  try {
    if (app?.getPath) {
      const dossierLogs = path.join(app.getPath('userData'), 'logs');
      if (!fs.existsSync(dossierLogs)) {
        fs.mkdirSync(dossierLogs, { recursive: true });
      }
      return path.join(dossierLogs, 'rafiki-paie.log');
    }
  } catch {
    // Fallback
  }
  const dossierFallback = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(dossierFallback)) {
    fs.mkdirSync(dossierFallback, { recursive: true });
  }
  return path.join(dossierFallback, 'rafiki-paie.log');
}

/**
 * Crée ou met à jour le raccourci sur le Bureau Windows pour accéder directement
 * à la fiche journal des logs (s'exécute au démarrage / après mise à jour).
 */
export function assurerRaccourciLogsSurBureau(): void {
  if (process.platform !== 'win32' || !app?.isPackaged) {
    return;
  }

  try {
    const desktopDir = app.getPath('desktop');
    const shortcutPath = path.join(desktopDir, 'Journal Logs École RAFIKI.lnk');
    shell.writeShortcutLink(shortcutPath, 'create', {
      target: process.execPath,
      args: '--logs',
      description: 'Ouvrir la fiche journal des erreurs et logs de École RAFIKI',
      icon: process.execPath,
      iconIndex: 0,
    });
    log.info(`[LOGS] Raccourci Bureau vérifié/créé : ${shortcutPath}`);
  } catch (err: any) {
    log.warn(`[LOGS] Impossible de créer le raccourci Bureau : ${err?.message}`);
  }
}

function echapperHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Génère une page HTML autonome, lisible et filtrable contenant les dernières entrées du journal.
 */
function genererFichierHtmlLogs(): string {
  const cheminLog = obtenirCheminFichierLog();
  let contenuBrut = '';
  if (fs.existsSync(cheminLog)) {
    try {
      const brut = fs.readFileSync(cheminLog, 'utf8');
      const lignes = brut.split(/\r?\n/);
      // Garder les 1500 dernières lignes pour la fluidité
      contenuBrut = lignes.slice(-1500).join('\n');
    } catch (err: any) {
      contenuBrut = `Impossible de lire le fichier journal : ${err?.message}`;
    }
  } else {
    contenuBrut = 'Aucune entrée enregistrée pour le moment.';
  }

  const version = typeof app?.getVersion === 'function' ? app.getVersion() : '0.1.2';
  const lignesHtml = contenuBrut
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .reverse()
    .map((ligne) => {
      let classe = 'ligne-info';
      let niveau = 'INFO';
      if (/\[error\]|\bERROR\b|ERREUR|Exception|Failed/i.test(ligne)) {
        classe = 'ligne-error';
        niveau = 'ERROR';
      } else if (/\[warn\]|\bWARN\b|AVERTISSEMENT|REFUSÉ/i.test(ligne)) {
        classe = 'ligne-warn';
        niveau = 'WARN';
      }
      return `<div class="ligne ${classe}" data-niveau="${niveau}">${echapperHtml(ligne)}</div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Fiche Journal &amp; Logs — École RAFIKI (v${echapperHtml(version)})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0c0d10;
      color: #f3f4f6;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    header {
      padding: 14px 20px;
      background: #13161e;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .titre { display: flex; align-items: center; gap: 10px; }
    .titre h1 { font-size: 16px; font-weight: 600; }
    .badge {
      font-size: 12px; font-family: monospace;
      padding: 2px 8px; border-radius: 99px;
      background: rgba(0,180,216,0.15); color: #00b4d8;
      border: 1px solid rgba(0,180,216,0.3);
    }
    .actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    button {
      padding: 7px 12px;
      border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.12);
      background: #1d222e;
      color: #f3f4f6;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { background: #262d3d; }
    button.primaire { background: #00b4d8; color: #0c0d10; border-color: #00b4d8; font-weight: 600; }
    button.primaire:hover { background: #0096c7; }
    button.actif { border-color: #ef4444; color: #fca5a5; background: rgba(239,68,68,0.15); }
    .meta {
      padding: 8px 20px;
      font-size: 12px;
      color: #9ca3af;
      background: #0f1117;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
    }
    main {
      flex: 1;
      overflow-y: auto;
      padding: 12px 20px;
      font-family: Consolas, 'Cascadia Code', monospace;
      font-size: 12.5px;
      line-height: 1.55;
    }
    .ligne {
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 2px;
      word-break: break-word;
      border-left: 3px solid transparent;
    }
    .ligne-info { color: #d1d5db; }
    .ligne-warn { color: #fcd34d; background: rgba(245,158,11,0.08); border-left-color: #f59e0b; }
    .ligne-error { color: #fca5a5; background: rgba(239,68,68,0.12); border-left-color: #ef4444; }
  </style>
</head>
<body>
  <header>
    <div class="titre">
      <h1>Fiche Journal &amp; Logs — École RAFIKI</h1>
      <span class="badge">v${echapperHtml(version)}</span>
    </div>
    <div class="actions">
      <button id="btn-erreurs" onclick="basculerFiltreErreurs()">Erreurs uniquement</button>
      <button class="primaire" onclick="copierTout()">Copier tout pour le support</button>
    </div>
  </header>
  <div class="meta">
    <span>Fichier : ${echapperHtml(cheminLog)}</span>
    <span>Les entrées les plus récentes s'affichent en haut.</span>
  </div>
  <main id="contenu">
    ${lignesHtml || '<div class="ligne ligne-info">Journal vide.</div>'}
  </main>
  <textarea id="brut" style="position:absolute;left:-9999px;">${echapperHtml(contenuBrut)}</textarea>
  <script>
    let filtreErreurs = false;
    function basculerFiltreErreurs() {
      filtreErreurs = !filtreErreurs;
      const btn = document.getElementById('btn-erreurs');
      btn.classList.toggle('actif', filtreErreurs);
      document.querySelectorAll('.ligne').forEach(el => {
        if (!filtreErreurs) {
          el.style.display = 'block';
        } else {
          const niv = el.getAttribute('data-niveau');
          el.style.display = (niv === 'ERROR' || niv === 'WARN') ? 'block' : 'none';
        }
      });
    }
    function copierTout() {
      const txt = document.getElementById('brut').value;
      navigator.clipboard.writeText(txt).then(() => {
        alert('Logs copiés dans le presse-papiers ! Vous pouvez maintenant les coller.');
      });
    }
  </script>
</body>
</html>`;

  const dossier = path.dirname(cheminLog);
  const cheminHtml = path.join(dossier, 'journal-visionneuse.html');
  fs.writeFileSync(cheminHtml, html, 'utf8');
  return cheminHtml;
}

/**
 * Ouvre ou met au premier plan la fenêtre dédiée de la Fiche Journal des Logs.
 */
export function ouvrirVisionneuseLogs(): void {
  const cheminHtml = genererFichierHtmlLogs();

  if (logsWindow && !logsWindow.isDestroyed()) {
    logsWindow.loadFile(cheminHtml).catch(() => {});
    if (logsWindow.isMinimized()) logsWindow.restore();
    logsWindow.show();
    logsWindow.focus();
    return;
  }

  logsWindow = new BrowserWindow({
    title: 'Fiche Journal & Logs — École RAFIKI',
    width: 1020,
    height: 680,
    minWidth: 720,
    minHeight: 450,
    backgroundColor: '#0c0d10',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  logsWindow.setMenu(null);
  logsWindow.loadFile(cheminHtml).catch((err) => {
    log.error('[LOGS] Impossible de charger la visionneuse de logs :', err?.message);
  });

  logsWindow.on('closed', () => {
    logsWindow = null;
  });
}
