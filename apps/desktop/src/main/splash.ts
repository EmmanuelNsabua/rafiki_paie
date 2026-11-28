import { app, BrowserWindow } from 'electron';
import { LOGO_RAFIKI_DATA_URI } from './logo-rafiki';

/**
 * Retourne la version courante de l'application de manière dynamique.
 */
function obtenirVersionApplication(): string {
  try {
    if (typeof app?.getVersion === 'function') {
      const v = app.getVersion();
      if (v) return v;
    }
  } catch {
    // Fallback hors contexte Electron complet (ex: tests unitaires)
  }
  return process.env.npm_package_version || '0.1.4';
}

/**
 * Génère le code HTML complet du Splash Screen aux couleurs et avec le logo officiel de l'École RAFIKI.
 * Tout est embarqué en inline pour une exécution instantanée sans accès disque.
 */
export function obtenirHtmlSplashScreen(): string {
  const version = obtenirVersionApplication();

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>École RAFIKI — Démarrage</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
    }
    body {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #1e293b;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      position: relative;
    }
    .top-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #8CD16D 0%, #168FB8 55%, #7A421D 100%);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 28px 0 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
    .brand-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #7A421D;
      text-transform: uppercase;
    }
    .version-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 9999px;
      background: rgba(22, 143, 184, 0.10);
      border: 1px solid rgba(22, 143, 184, 0.25);
      color: #168FB8;
      font-family: Consolas, monospace;
    }
    .main-content {
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .title-group {
      max-width: 315px;
    }
    .app-title {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.1;
      color: #168FB8;
    }
    .app-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #7A421D;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .hero-graphic {
      width: 155px;
      height: 175px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hero-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .footer {
      padding: 0 28px 22px 28px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 11.5px;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #475569;
      font-weight: 500;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8CD16D;
      box-shadow: 0 0 8px rgba(140, 209, 109, 0.8);
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(0.85); }
    }
    .percent-text {
      color: #168FB8;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .progress-track {
      width: 100%;
      height: 5px;
      background: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      width: 10%;
      background: linear-gradient(90deg, #168FB8 0%, #8CD16D 100%);
      border-radius: 5px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  </style>
</head>
<body>
  <div class="top-accent"></div>
  <div class="header">
    <div class="brand">
      <img class="brand-logo" src="${LOGO_RAFIKI_DATA_URI}" alt="Logo École RAFIKI" />
      <span class="brand-name">École RAFIKI</span>
    </div>
    <div class="version-badge">v${version}</div>
  </div>

  <div class="main-content">
    <div class="title-group">
      <h1 class="app-title">ÉCOLE RAFIKI</h1>
      <div class="app-subtitle">Gestionnaire de paie</div>
    </div>
    <div class="hero-graphic">
      <img class="hero-logo" src="${LOGO_RAFIKI_DATA_URI}" alt="Logo officiel École RAFIKI" />
    </div>
  </div>

  <div class="footer">
    <div class="status-row">
      <div class="status-left">
        <div class="pulse-dot"></div>
        <span id="status-text">Démarrage des services...</span>
      </div>
      <div class="percent-text" id="percent-text">10%</div>
    </div>
    <div class="progress-track">
      <div class="progress-bar" id="progress-bar"></div>
    </div>
  </div>

  <script>
    window.updateStatus = function(text, percent) {
      var s = document.getElementById('status-text');
      var b = document.getElementById('progress-bar');
      var p = document.getElementById('percent-text');
      if (s && text) s.textContent = text;
      if (b && typeof percent === 'number') b.style.width = Math.max(5, Math.min(100, percent)) + '%';
      if (p && typeof percent === 'number') p.textContent = Math.round(percent) + '%';
    };
  </script>
</body>
</html>`;
}

/**
 * Crée et affiche le Splash Screen au tout début du démarrage de l'application.
 */
export function creerSplashScreen(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 560,
    height: 340,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#ffffff',
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const html = obtenirHtmlSplashScreen();
  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  splash.once('ready-to-show', () => {
    if (!splash.isDestroyed()) {
      splash.show();
    }
  });

  return splash;
}

/**
 * Met à jour le message d'état et le pourcentage du Splash Screen.
 */
export async function mettreAJourSplashScreen(
  splash: BrowserWindow | null,
  message: string,
  pourcentage: number
): Promise<void> {
  if (!splash || splash.isDestroyed()) return;
  const script = `if (typeof window.updateStatus === 'function') { window.updateStatus(${JSON.stringify(message)}, ${pourcentage}); }`;
  try {
    await splash.webContents.executeJavaScript(script);
  } catch {
    // Si la fenêtre est en cours de chargement ou fermée, ignorer sans bloquer
  }
}

/**
 * Ferme et détruit proprement le Splash Screen.
 */
export function fermerSplashScreen(splash: BrowserWindow | null): void {
  if (!splash || splash.isDestroyed()) return;
  splash.destroy();
}
