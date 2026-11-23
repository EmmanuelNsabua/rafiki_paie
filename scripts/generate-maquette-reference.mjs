import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show: false,
    frame: false,
    webPreferences: {
      offscreen: true,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="fr" style="font-size: 16px;">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Poppins', 'Segoe UI', system-ui, sans-serif; }
  body { background: #EFEFEF; width: 1920px; height: 1080px; overflow: hidden; position: relative; color: #111111; }
  
  /* Sidebar */
  .sidebar {
    position: absolute; left: 0; top: 0; width: 334px; height: 1080px; background: #FFFFFF; border-right: 1px solid #E4E4E7;
  }
  .brand {
    position: absolute; left: 16px; top: 30px; display: flex; align-items: center; gap: 10px;
  }
  .brand-logo {
    width: 72px; height: 72px; border-radius: 12px; background: #16A34A; display: flex; align-items: center; justify-content: center;
    color: #FFFFFF; font-size: 38px; font-weight: 700;
  }
  .brand-text h1 { font-size: 28px; font-weight: 700; color: #111111; line-height: 1.2; }
  .brand-text p { font-size: 18px; color: #6B6B6B; }
  
  .nav-item {
    position: absolute; left: 16px; width: 302px; height: 58px; border-radius: 8px; display: flex; align-items: center;
    padding: 0 20px; gap: 16px; font-size: 20px; font-weight: 500; cursor: pointer; text-decoration: none;
  }
  .nav-item.active { background: #16A34A; color: #FFFFFF; font-weight: 600; }
  .nav-item.inactive { color: #6B6B6B; }
  .nav-item.inactive:hover { background: #F4F4F5; }
  .nav-journal { top: 163px; }
  .nav-operation { top: 231px; }
  .nav-employes { top: 299px; }
  .nav-reglages { top: 994px; }
  
  /* Header */
  .topbar {
    position: absolute; left: 334px; top: 0; width: 1586px; height: 94px; background: #FFFFFF; border-bottom: 1px solid #E4E4E7;
    display: flex; align-items: center; justify-content: space-between; padding: 0 34px;
  }
  .top-date { font-size: 22px; font-weight: 500; color: #111111; }
  .search-box {
    width: 500px; height: 57px; border: 1px solid #6B6B6B; border-radius: 4px; display: flex; align-items: center;
    padding: 0 16px; gap: 12px; position: relative;
  }
  .search-text { font-size: 20px; color: #6B6B6B; flex: 1; }
  .ctrl-k {
    border: 1px solid #E4E4E7; border-radius: 4px; padding: 4px 8px; font-size: 15px; color: #6B6B6B; background: #F4F4F5;
  }

  /* Content area */
  .content {
    position: absolute; left: 358px; top: 118px; width: 1538px;
  }
  
  /* Operation Header Card */
  .header-card {
    background: #FFFFFF; border-radius: 12px; height: 110px; display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .header-title { font-size: 40px; font-weight: 600; color: #111111; }
  .pill-month { background: #EFEFEF; border-radius: 999px; padding: 8px 18px; font-size: 18px; font-weight: 500; }
  .pill-status { background: #DCFCE7; color: #15803D; border-radius: 999px; padding: 8px 16px; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .pill-status::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: #16A34A; }
  .pill-days { background: #F4F4F5; border-radius: 999px; padding: 8px 16px; font-size: 16px; color: #111111; }

  .header-actions { display: flex; align-items: center; gap: 14px; }
  .btn-export { height: 54px; padding: 0 24px; border: 2px solid #16A34A; color: #15803D; border-radius: 6px; font-size: 20px; font-weight: 500; background: transparent; opacity: 0.6; }
  .btn-finish { height: 54px; padding: 0 24px; background: #16A34A; color: #FFFFFF; border-radius: 6px; font-size: 20px; font-weight: 600; border: none; }

  /* Synthesis cards */
  .cards-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 19px; margin-top: 20px;
  }
  .synth-card {
    background: #FFFFFF; border-radius: 10px; height: 190px; padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    display: flex; flex-direction: column; justify-content: space-between;
  }
  .synth-head { display: flex; align-items: center; gap: 12px; border-bottom: 1px solid #E4E4E7; padding-bottom: 12px; }
  .synth-dot { width: 10px; height: 10px; border-radius: 50%; background: #16A34A; }
  .synth-label { font-size: 20px; font-weight: 500; color: #111111; }
  .synth-value { font-size: 38px; font-weight: 700; color: #111111; font-variant-numeric: tabular-nums; }
  .synth-foot { display: flex; align-items: center; gap: 8px; }
  .synth-pill-up { background: #DCFCE7; color: #15803D; font-size: 14px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .synth-pill-down { background: #FEE2E2; color: #DC2626; font-size: 14px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
  .synth-ref { font-size: 14px; color: #6B6B6B; }

  /* Table Card */
  .table-card {
    background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 8px; margin-top: 24px; overflow: hidden;
  }
  .table-title-bar {
    height: 71px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
  }
  .table-title { font-size: 24px; font-weight: 600; }
  .table-meta { font-size: 17px; color: #6B6B6B; }
  
  table { width: 100%; border-collapse: collapse; }
  thead { background: #F5F6FA; height: 55px; }
  th { font-size: 18px; font-weight: 500; color: #6B6B6B; text-align: left; padding: 0 20px; border-bottom: 1px solid #E4E4E7; }
  th.num { width: 80px; }
  th.right { text-align: right; }
  th.center { text-align: center; width: 100px; }

  tbody tr { height: 60px; border-bottom: 1px solid #E4E4E7; }
  tbody tr:hover { background: #F4F4F5; }
  td { padding: 0 20px; font-size: 19px; }
  td.num { color: #6B6B6B; }
  td.name { font-weight: 500; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.net { font-weight: 600; }
  td.center { text-align: center; }
  .badge-abs { display: inline-flex; align-items: center; gap: 6px; background: #F4F4F5; border-radius: 999px; padding: 2px 10px; font-size: 13px; color: #6B6B6B; margin-left: 10px; }
  .btn-more { width: 40px; height: 40px; border: 1px solid #E4E4E7; border-radius: 6px; background: transparent; cursor: pointer; }

  .table-foot { height: 45px; display: flex; align-items: center; padding: 0 24px; font-size: 16px; color: #6B6B6B; }
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
    
    <div class="nav-item inactive nav-journal">
      <span>📄</span>
      <span>Journal de paie</span>
    </div>
    <div class="nav-item active nav-operation">
      <span>📋</span>
      <span>Opération mensuelle</span>
    </div>
    <div class="nav-item inactive nav-employes">
      <span>👥</span>
      <span>Liste des employés</span>
    </div>
    <div class="nav-item inactive nav-reglages">
      <span>⚙️</span>
      <span>Réglages</span>
    </div>
  </div>

  <!-- Topbar -->
  <div class="topbar">
    <div class="top-date">Dimanche 22 nov. 2026</div>
    <div class="search-box">
      <span style="font-size: 20px; color: #6B6B6B;">🔍</span>
      <span class="search-text">Rechercher…</span>
      <span class="ctrl-k">Ctrl K</span>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <div class="header-card">
      <div class="header-left">
        <h2 class="header-title">Opération mensuelle</h2>
        <div class="pill-month">Novembre 2026 ▼</div>
        <div class="pill-status">En cours</div>
        <div class="pill-days">✏️ 22 jours ouvrables</div>
      </div>
      <div class="header-actions">
        <button class="btn-export">Exporter ▼</button>
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
        </tbody>
      </table>
      <div class="table-foot">Affichage de 1 à 6 employés</div>
    </div>
  </div>
</body>
</html>`;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 800));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1920, height: 1080 });
  const outPath = path.resolve('docs/phase-2/maquette-reference.png');
  fs.writeFileSync(outPath, image.toPNG());
  console.log(`[MAQUETTE] Référence visuelle créée avec succès : ${outPath} (${fs.statSync(outPath).size} octets)`);
  app.quit();
});
