import { spawn } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

const exePath = path.resolve('apps/desktop/release/win-unpacked/Paie Rafiki.exe');
console.log('[VERIFY PACKAGED] Vérification de l existence du binaire empaqueté :', exePath);
if (!fs.existsSync(exePath)) {
  console.error('[VERIFY PACKAGED ERROR] Binaire introuvable !');
  process.exit(1);
}

const logPathUnpacked = path.resolve('apps/desktop/release/win-unpacked/logs/main.log');
const logPathDesktop = path.resolve('apps/desktop/logs/main.log');

function lireLogs() {
  let res = '';
  if (fs.existsSync(logPathUnpacked)) {
    res += fs.readFileSync(logPathUnpacked, 'utf-8');
  }
  if (fs.existsSync(logPathDesktop)) {
    res += '\n' + fs.readFileSync(logPathDesktop, 'utf-8');
  }
  return res;
}

if (fs.existsSync(logPathUnpacked)) {
  fs.writeFileSync(logPathUnpacked, '');
}
if (fs.existsSync(logPathDesktop)) {
  fs.writeFileSync(logPathDesktop, '');
}

console.log('[VERIFY PACKAGED] Lancement de Paie Rafiki.exe...');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(exePath, [], {
  cwd: path.dirname(exePath),
  stdio: 'inherit',
  env,
});

const startTime = Date.now();
const maxWaitMs = 25000;

const interval = setInterval(() => {
  const content = lireLogs();
  if (
    content.includes('did-finish-load') ||
    content.includes('IPC db:ping received') ||
    content.includes('window.api')
  ) {
    console.log(
      '\n[VERIFY PACKAGED SUCCÈS] L application empaquetée a démarré et chargé la page avec succès !'
    );
    console.log('=== EXTRAIT DES JOURNAUX (MODE PRODUCTION EMPAQUETÉ) ===');
    console.log(content.trim());
    console.log('========================================================');
    clearInterval(interval);
    try {
      spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
    } catch {}
    setTimeout(() => process.exit(0), 1000);
    return;
  }

  if (Date.now() - startTime > maxWaitMs) {
    console.error('\n[VERIFY PACKAGED TIMEOUT] Délai dépassé (25s).');
    console.log('Contenu actuel des logs:\n' + lireLogs());
    clearInterval(interval);
    try {
      spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
    } catch {}
    setTimeout(() => process.exit(1), 1000);
  }
}, 1000);
