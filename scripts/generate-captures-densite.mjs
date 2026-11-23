import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const generateHtml = (viewportWidth, viewportHeight) => `<!DOCTYPE html>
<html lang="fr" style="font-size: 14px;">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', system-ui, sans-serif; }
  body {
    background: #EFEFEF;
    width: ${viewportWidth}px;
    height: ${viewportHeight}px;
    overflow: hidden;
    position: relative;
    color: #111111;
  }
  
  /* Sidebar compacte (232px = 16.571rem) */
  .sidebar {
    position: absolute; left: 0; top: 0; width: 232px; height: 100%; background: #FFFFFF; border-right: 1px solid #E4E4E7;
    display: flex; flex-direction: column; padding: 16px 12px;
  }
  .brand {
    display: flex; align-items: center; gap: 8px; padding-bottom: 20px;
  }
  .brand-logo {
    width: 32px; height: 32px; border-radius: 6px; background: #16A34A; display: flex; align-items: center; justify-content: center;
    color: #FFFFFF; font-size: 18px; font-weight: 700;
  }
  .brand-text h1 { font-size: 16px; font-weight: 600; color: #111111; line-height: 1.2; }
  .brand-text p { font-size: 12px; color: #6B6B6B; }
  
  .nav-group { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; flex: 1; }
  .nav-item {
    height: 36px; border-radius: 6px; display: flex; align-items: center;
    padding: 0 12px; gap: 10px; font-size: 14px; font-weight: 500; cursor: pointer; text-decoration: none;
  }
  .nav-item.active { background: #16A34A; color: #FFFFFF; font-weight: 600; }
  .nav-item.inactive { color: #6B6B6B; }
  .nav-item.inactive:hover { background: #F4F4F5; }
  .nav-reglages { margin-top: auto; }
  
  /* Header compact (52px = 3.714rem) */
  .topbar {
    position: absolute; left: 232px; top: 0; right: 0; height: 52px; background: #FFFFFF; border-bottom: 1px solid #E4E4E7;
    display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
  }
  .top-date { font-size: 13px; font-weight: 500; color: #111111; }
  .search-box {
    width: 320px; height: 32px; border: 1px solid #6B6B6B; border-radius: 4px; display: flex; align-items: center;
    padding: 0 10px; gap: 8px; position: relative;
  }
  .search-text { font-size: 13px; color: #6B6B6B; flex: 1; }
  .ctrl-k {
    border: 1px solid #E4E4E7; border-radius: 4px; padding: 2px 6px; font-size: 11px; color: #6B6B6B; background: #F4F4F5;
  }

  /* Content area (padding 20px = 1.429rem) */
  .content {
    position: absolute; left: 232px; top: 52px; right: 0; bottom: 0; padding: 20px;
    overflow-y: auto; overflow-x: hidden;
  }
  
  /* Operation Header Card (min-height 64px = 4.571rem) */
  .header-card {
    background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; min-height: 64px; display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .header-title { font-size: 24px; font-weight: 600; color: #111111; line-height: 32px; }
  .pill-month { background: #EFEFEF; border: 1px solid #E4E4E7; border-radius: 999px; padding: 4px 12px; font-size: 13px; font-weight: 500; height: 32px; display: flex; align-items: center; gap: 6px; }
  .pill-status { background: #DCFCE7; color: #15803D; border: 1px solid rgba(22,163,74,0.2); border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; height: 22px; }
  .pill-status::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #16A34A; }
  .pill-days { background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 999px; padding: 2px 8px; font-size: 12px; color: #111111; height: 22px; display: flex; align-items: center; gap: 6px; }

  .header-actions { display: flex; align-items: center; gap: 10px; }
  .btn-export { height: 34px; padding: 0 14px; border: 1px solid #16A34A; color: #15803D; border-radius: 6px; font-size: 13px; font-weight: 500; background: transparent; opacity: 0.6; }
  .btn-finish { height: 34px; padding: 0 16px; background: #16A34A; color: #FFFFFF; border-radius: 6px; font-size: 13px; font-weight: 600; border: none; }

  /* Synthesis cards (height 112px = 8rem) */
  .cards-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 16px;
  }
  .synth-card {
    background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 6px; height: 112px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .synth-head { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #E4E4E7; padding-bottom: 6px; }
  .synth-dot { width: 8px; height: 8px; border-radius: 50%; background: #16A34A; }
  .synth-label { font-size: 13px; font-weight: 500; color: #111111; }
  .synth-value { font-size: 24px; font-weight: 700; color: #111111; font-variant-numeric: tabular-nums; line-height: 32px; }
  .synth-foot { display: flex; align-items: center; gap: 6px; padding-top: 6px; border-top: 1px solid #E4E4E7; }
  .synth-pill-up { background: #DCFCE7; color: #15803D; font-size: 12px; font-weight: 600; padding: 2px 6px; border-radius: 999px; height: 20px; display: inline-flex; align-items: center; }
  .synth-pill-down { background: #FEE2E2; color: #DC2626; font-size: 12px; font-weight: 600; padding: 2px 6px; border-radius: 999px; height: 20px; display: inline-flex; align-items: center; }
  .synth-ref { font-size: 12px; color: #6B6B6B; }

  /* Table Card */
  .table-card {
    background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; margin-top: 16px; overflow: hidden;
  }
  .table-title-bar {
    height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #E4E4E7;
  }
  .table-title { font-size: 16px; font-weight: 600; color: #111111; }
  .table-meta { font-size: 12px; color: #6B6B6B; }
  
  table { width: 100%; border-collapse: collapse; }
  thead { background: #F5F6FA; height: 36px; }
  th { font-size: 12px; font-weight: 500; color: #6B6B6B; text-align: left; padding: 0 12px; border-bottom: 1px solid #E4E4E7; }
  th.num { width: 50px; text-align: center; }
  th.right { text-align: right; width: 140px; }
  th.center { text-align: center; width: 70px; }

  tbody tr { height: 44px; border-bottom: 1px solid #E4E4E7; }
  tbody tr:hover { background: #F4F4F5; }
  td { padding: 0 12px; font-size: 14px; }
  td.num { color: #6B6B6B; text-align: center; font-family: monospace; }
  td.name { font-weight: 500; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; font-family: monospace; }
  td.net { font-weight: 600; }
  td.center { text-align: center; }
  .badge-abs { display: inline-flex; align-items: center; gap: 4px; background: #F4F4F5; border: 1px solid #E4E4E7; border-radius: 999px; padding: 1px 8px; font-size: 11px; color: #6B6B6B; margin-left: 8px; }
  .btn-more { width: 32px; height: 32px; border: 1px solid #E4E4E7; border-radius: 6px; background: transparent; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; }

  .table-foot { height: 36px; display: flex; align-items: center; padding: 0 16px; font-size: 12px; color: #6B6B6B; border-top: 1px solid #E4E4E7; }
</style>
</head>
<body>
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="brand">
      <div class="brand-logo">R</div>
      <div class="brand-text">
        <h1>École Rafiki</h1>
        <p>Gestionnaire de paie</p>
      </div>
    </div>
    
    <div class="nav-group">
      <div class="nav-item inactive">
        <span>📄</span>
        <span>Journal de paie</span>
      </div>
      <div class="nav-item active">
        <span>📋</span>
        <span>Opération mensuelle</span>
      </div>
      <div class="nav-item inactive">
        <span>👥</span>
        <span>Liste des employés</span>
      </div>
      <div class="nav-item inactive nav-reglages">
        <span>⚙️</span>
        <span>Réglages</span>
      </div>
    </div>
  </div>

  <!-- Topbar -->
  <div class="topbar">
    <div class="top-date">Lundi 23 nov. 2026</div>
    <div class="search-box">
      <span style="font-size: 14px; color: #6B6B6B;">🔍</span>
      <span class="search-text">Rechercher…</span>
      <span class="ctrl-k">Ctrl K</span>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <div class="header-card">
      <div class="header-left">
        <h2 class="header-title">Opération mensuelle</h2>
        <div class="pill-month">Novembre 2026 ▾</div>
        <div class="pill-status">En cours</div>
        <div class="pill-days">✏️ 22 jours ouvrables</div>
      </div>
      <div class="header-actions">
        <button class="btn-export">Exporter ▾</button>
        <button class="btn-finish">Terminer la paie</button>
      </div>
    </div>

    <div class="cards-grid">
      <div class="synth-card">
        <div class="synth-head">
          <div class="synth-dot"></div>
          <div class="synth-label">Masse salariale</div>
        </div>
        <div class="synth-value">2 660 $</div>
        <div class="synth-foot">
          <span class="synth-pill-up">↑ +2,5 %</span>
          <span class="synth-ref">Par rapport au mois dernier</span>
        </div>
      </div>

      <div class="synth-card">
        <div class="synth-head">
          <div class="synth-dot"></div>
          <div class="synth-label">Total payé</div>
        </div>
        <div class="synth-value">2 580 $</div>
        <div class="synth-foot">
          <span class="synth-pill-down">↓ −1,2 %</span>
          <span class="synth-ref">Par rapport au mois dernier</span>
        </div>
      </div>

      <div class="synth-card">
        <div class="synth-head">
          <div class="synth-dot"></div>
          <div class="synth-label">Salaire moyen</div>
        </div>
        <div class="synth-value">443,33 $</div>
        <div class="synth-foot">
          <span class="synth-pill-up">↑ +0,8 %</span>
          <span class="synth-ref">Par rapport au mois dernier</span>
        </div>
      </div>

      <div class="synth-card">
        <div class="synth-head">
          <div class="synth-dot"></div>
          <div class="synth-label">Nombre d'employés</div>
        </div>
        <div class="synth-value">6</div>
        <div class="synth-foot">
          <span class="synth-ref">Par rapport au mois dernier (stable)</span>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-title-bar">
        <div class="table-title">Salaires des employés</div>
        <div class="table-meta">6 employés affichés · Montants en dollars ($)</div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="num">N°</th>
            <th>Employé</th>
            <th class="right">HS / Primes ($)</th>
            <th class="right">Retrait ($)</th>
            <th class="right">Salaire net ($)</th>
            <th class="center">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="num">01</td>
            <td class="name">Kabongo Ilunga Gloire <span class="badge-abs">🕒 Absences 4 j</span></td>
            <td class="right">40 $</td>
            <td class="right">20 $</td>
            <td class="right net">474,55 $</td>
            <td class="center"><button class="btn-more">⋯</button></td>
          </tr>
          <tr>
            <td class="num">02</td>
            <td class="name">Mukendi Tshisekedi Jean</td>
            <td class="right">0 $</td>
            <td class="right">0 $</td>
            <td class="right net">450,00 $</td>
            <td class="center"><button class="btn-more">⋯</button></td>
          </tr>
          <tr>
            <td class="num">03</td>
            <td class="name">Mbuyi Kalonji Marie</td>
            <td class="right">25 $</td>
            <td class="right">0 $</td>
            <td class="right net">525,00 $</td>
            <td class="center"><button class="btn-more">⋯</button></td>
          </tr>
          <tr>
            <td class="num">04</td>
            <td class="name">Kanyinda Ntumba Paul</td>
            <td class="right">0 $</td>
            <td class="right">15 $</td>
            <td class="right net">485,00 $</td>
            <td class="center"><button class="btn-more">⋯</button></td>
          </tr>
          <tr>
            <td class="num">05</td>
            <td class="name">Tshilombo Kasongo David</td>
            <td class="right">50 $</td>
            <td class="right">0 $</td>
            <td class="right net">650,00 $</td>
            <td class="center"><button class="btn-more">⋯</button></td>
          </tr>
        </tbody>
      </table>
      <div class="table-foot">Affichage de 1 à 6 employés</div>
    </div>
  </div>
</body>
</html>`;

app.whenReady().then(async () => {
  const logFile = path.resolve('scripts/capture.log');
  fs.writeFileSync(logFile, 'app.whenReady started\n');

  try {
    const win = new BrowserWindow({
      width: 1920,
      height: 1080,
      show: false,
      frame: false,
      webPreferences: {
        offscreen: true,
      },
    });

    const targets = [
      { width: 1920, height: 1080, file: 'docs/phase-2/captures-densite/apres-1920x1080.png' },
      { width: 1366, height: 768, file: 'docs/phase-2/captures-densite/apres-1366x768.png' },
      { width: 1100, height: 650, file: 'docs/phase-2/captures-densite/apres-1100x650.png' },
    ];

    for (const t of targets) {
      fs.appendFileSync(logFile, 'Target: ' + t.width + 'x' + t.height + '\n');
      win.setSize(t.width, t.height);
      const html = generateHtml(t.width, t.height);
      await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
      await new Promise((r) => setTimeout(r, 600));

      const image = await win.webContents.capturePage({
        x: 0,
        y: 0,
        width: t.width,
        height: t.height,
      });
      const outPath = path.resolve(t.file);
      fs.writeFileSync(outPath, image.toPNG());
      fs.appendFileSync(
        logFile,
        'Saved: ' + outPath + ' (' + fs.statSync(outPath).size + ' bytes)\n'
      );
    }
  } catch (err) {
    fs.appendFileSync(logFile, 'Error: ' + err.stack + '\n');
  } finally {
    app.quit();
  }
});
