import { BrowserWindow } from 'electron';

/**
 * Génère le code HTML complet du Splash Screen inspiré de DBeaver.
 * Tout est embarqué en inline pour une exécution instantanée sans accès disque.
 */
export function obtenirHtmlSplashScreen(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Starclip — Démarrage</title>
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
      background: #091412;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      position: relative;
      background: radial-gradient(circle at 85% 30%, rgba(16, 185, 129, 0.18), transparent 48%),
                  radial-gradient(circle at 15% 85%, rgba(6, 182, 212, 0.14), transparent 42%),
                  linear-gradient(135deg, #091412 0%, #0d211d 50%, #06100e 100%);
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px 0 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 24px;
      height: 24px;
      color: #10b981;
    }
    .brand-name {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #e2e8f0;
      text-transform: uppercase;
    }
    .version-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #94a3b8;
    }
    .main-content {
      padding: 0 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .title-group {
      max-width: 330px;
    }
    .app-title {
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -0.5px;
      line-height: 1.1;
      background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .app-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 5px;
    }
    .app-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 8px;
      line-height: 1.4;
    }
    .hero-graphic {
      width: 130px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .hero-svg {
      width: 105px;
      height: 105px;
      color: #ffffff;
      filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.45));
      animation: float 4s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-4px) rotate(2deg); }
    }
    .footer {
      padding: 0 28px 24px 28px;
    }
    .status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 11px;
    }
    .status-left {
      display: flex;
      align-items: center;
      gap: 7px;
      color: #cbd5e1;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .percent-text {
      color: #94a3b8;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }
    .progress-bar {
      height: 100%;
      width: 10%;
      background: linear-gradient(90deg, #06b6d4, #10b981);
      border-radius: 4px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <svg class="brand-icon" viewBox="0 0 150 150" fill="none">
        <path d="M74.6649 81.2903L60.5557 75.4387C56.9045 73.9244 52.8866 76.6078 52.8866 80.5606C52.8866 82.7669 54.1946 84.7632 56.2173 85.6442L76.5991 94.5213C79.1861 95.6481 82.2086 94.82 83.86 92.532L90.3045 83.6034C92.5783 80.4531 91.3041 76.0053 87.707 74.5369L54.851 61.1245C53.58 60.6056 52.1694 60.5384 50.8547 60.9339L22.8754 69.352C17.9051 70.8474 17.0497 77.5209 21.4823 80.2215L51.5607 98.547C52.4303 99.0768 53.1508 99.8193 53.6542 100.704L70.7568 130.773C73.0645 134.83 78.9177 134.814 81.2035 130.744L99.6698 97.8654C100.19 96.9395 100.946 96.1682 101.862 95.6303L127.916 80.3245C132.467 77.6514 131.598 70.829 126.523 69.3813L97.6845 61.1545C95.8507 60.6314 94.3747 59.2677 93.7085 57.4809L81.2301 24.0136C79.34 18.9441 72.2339 18.769 70.0963 23.7392L58.2474 51.2903" stroke-width="8.5" stroke-linecap="round" stroke="currentColor"/>
      </svg>
      <span class="brand-name">Starclip</span>
    </div>
    <div class="version-badge">v0.1.0</div>
  </div>

  <div class="main-content">
    <div class="title-group">
      <h1 class="app-title">PAIE RAFIKI</h1>
      <div class="app-subtitle">Gestionnaire de paie</div>
      <p class="app-desc">École Rafiki — République Démocratique du Congo</p>
    </div>
    <div class="hero-graphic">
      <svg class="hero-svg" viewBox="0 0 150 150" fill="none">
        <path d="M74.6649 81.2903L60.5557 75.4387C56.9045 73.9244 52.8866 76.6078 52.8866 80.5606C52.8866 82.7669 54.1946 84.7632 56.2173 85.6442L76.5991 94.5213C79.1861 95.6481 82.2086 94.82 83.86 92.532L90.3045 83.6034C92.5783 80.4531 91.3041 76.0053 87.707 74.5369L54.851 61.1245C53.58 60.6056 52.1694 60.5384 50.8547 60.9339L22.8754 69.352C17.9051 70.8474 17.0497 77.5209 21.4823 80.2215L51.5607 98.547C52.4303 99.0768 53.1508 99.8193 53.6542 100.704L70.7568 130.773C73.0645 134.83 78.9177 134.814 81.2035 130.744L99.6698 97.8654C100.19 96.9395 100.946 96.1682 101.862 95.6303L127.916 80.3245C132.467 77.6514 131.598 70.829 126.523 69.3813L97.6845 61.1545C95.8507 60.6314 94.3747 59.2677 93.7085 57.4809L81.2301 24.0136C79.34 18.9441 72.2339 18.769 70.0963 23.7392L58.2474 51.2903" stroke-width="8.5" stroke-linecap="round" stroke="currentColor"/>
      </svg>
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
    height: 330,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#091412',
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
