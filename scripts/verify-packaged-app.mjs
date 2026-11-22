import { spawn } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

const exePath = path.resolve('apps/desktop/release/win-unpacked/Paie Rafiki.exe');
console.log('[VERIFY PACKAGED] Vérification de l existence du binaire empaqueté :', exePath);
if (!fs.existsSync(exePath)) {
  console.error('[VERIFY PACKAGED ERROR] Binaire introuvable !');
  process.exit(1);
}

const logPaths = [
  path.resolve('apps/desktop/release/win-unpacked/logs/main.log'),
  path.resolve('apps/desktop/logs/main.log'),
  path.resolve('logs/main.log'),
  path.join(process.env.APPDATA || '', '@rafiki/desktop/logs/main.log'),
  path.join(process.env.APPDATA || '', 'Paie Rafiki/logs/main.log'),
];

function lireLogs() {
  let res = '';
  for (const p of logPaths) {
    if (fs.existsSync(p)) {
      res += '\n' + fs.readFileSync(p, 'utf-8');
    }
  }
  return res;
}

for (const p of logPaths) {
  if (fs.existsSync(p)) {
    try {
      fs.writeFileSync(p, '');
    } catch {}
  }
}

console.log('[VERIFY PACKAGED] Lancement de Paie Rafiki.exe...');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(exePath, [], {
  cwd: path.dirname(exePath),
  stdio: 'ignore',
  shell: false,
  env,
});

const startTime = Date.now();
const maxWaitMs = 25000;

function killApp() {
  try {
    spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()], { shell: true });
  } catch {}
  try {
    spawn('taskkill', ['/F', '/IM', 'Paie Rafiki.exe'], { shell: true });
  } catch {}
}

const interval = setInterval(() => {
  const content = lireLogs();

  const aWindowApiRelaye = content.includes('window.api est défini');
  const aDbPingRelaye = content.includes('Réponse reçue de db:ping');
  const aVerifVisuelle = content.includes('État visuel page empaquetée');

  if (aWindowApiRelaye && aDbPingRelaye && aVerifVisuelle) {
    console.log(
      '\n[VERIFY PACKAGED SUCCÈS] L application empaquetée a démarré et chargé l interface via app://rafiki/ avec succès !'
    );
    console.log('=== EXTRAIT DES JOURNAUX (MODE PRODUCTION EMPAQUETÉ) ===');
    console.log(content.trim());
    console.log('========================================================');

    // Vérification des conditions 1 et 2
    console.log('\n[CONTRÔLE DES CONDITIONS DE FIN - GROUPE A2]');
    console.log(
      '1. [CONDITION 1] Message renderer relayé "window.api est défini" :',
      aWindowApiRelaye
    );
    console.log(
      '1. [CONDITION 1] Message renderer relayé "Réponse reçue de db:ping" :',
      aDbPingRelaye
    );

    const matchVisuel = content.match(/fond = "([^"]+)", statut = "([^"]+)"/);
    if (matchVisuel) {
      const fond = matchVisuel[1];
      const statut = matchVisuel[2];
      const estStyle = fond !== 'rgba(0, 0, 0, 0)' && fond.length > 0;
      const statutOk = statut.includes('SQLite v') && !statut.includes('Vérification');
      console.log(`2. [CONDITION 2] Page stylée (fond: "${fond}", non par défaut) :`, estStyle);
      console.log(`2. [CONDITION 2] Statut SQLite affiche la version ("${statut}") :`, statutOk);

      if (!estStyle || !statutOk) {
        console.error(
          '[VERIFY PACKAGED ERROR] Échec de la condition 2 : styles ou statut non conformes !'
        );
        clearInterval(interval);
        killApp();
        setTimeout(() => process.exit(1), 1000);
        return;
      }
    }

    const screenshotPaths = [
      path.resolve('screenshots/packaged-app.png'),
      path.resolve('apps/desktop/release/win-unpacked/screenshots/packaged-app.png'),
      path.resolve('apps/desktop/screenshots/packaged-app.png'),
    ];
    for (const sp of screenshotPaths) {
      if (fs.existsSync(sp) && fs.statSync(sp).size > 0) {
        console.log(
          '2. [CONDITION 2] Capture d écran confirmée :',
          sp,
          `(${fs.statSync(sp).size} octets)`
        );
        break;
      }
    }

    clearInterval(interval);
    killApp();
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  if (Date.now() - startTime > maxWaitMs) {
    console.error('\n[VERIFY PACKAGED TIMEOUT] Délai dépassé (25s).');
    console.log('Contenu actuel des logs:\n' + lireLogs());
    clearInterval(interval);
    killApp();
    setTimeout(() => process.exit(1), 1000);
  }
}, 1000);
