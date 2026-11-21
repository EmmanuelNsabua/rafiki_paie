import { spawn } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const logPathDesktop = path.resolve(rootDir, 'apps/desktop/logs/main.log');
const logPathRoot = path.resolve(rootDir, 'logs/main.log');

function lireJournaux() {
  let contenu = '';
  if (fs.existsSync(logPathDesktop)) {
    contenu += fs.readFileSync(logPathDesktop, 'utf-8');
  }
  if (fs.existsSync(logPathRoot)) {
    contenu += '\n' + fs.readFileSync(logPathRoot, 'utf-8');
  }
  return contenu;
}

if (fs.existsSync(logPathDesktop)) {
  fs.writeFileSync(logPathDesktop, '');
}
if (fs.existsSync(logPathRoot)) {
  fs.writeFileSync(logPathRoot, '');
}

console.log('[VERIFY] Démarrage de npm run dev:desktop...');

// Lancement avec ELECTRON_RUN_AS_NODE nettoyé
const env = { ...process.env, NODE_ENV: 'development' };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn('npm.cmd', ['run', 'dev:desktop'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env,
});

const startTime = Date.now();
const maxWaitMs = 60000;

const interval = setInterval(() => {
  const content = lireJournaux();
  if (
    content.includes('db:ping') &&
    (content.includes('window.api défini = true') || content.includes('window.api est défini'))
  ) {
    console.log('\n[VERIFY SUCCÈS] window.api est bien défini et db:ping a été reçu avec succès !');
    console.log('=== EXTRAIT COMPLET DES JOURNAUX (logs/main.log) ===');
    console.log(content.trim());
    console.log('====================================================');
    clearInterval(interval);

    try {
      spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
    } catch {}

    setTimeout(() => process.exit(0), 1000);
    return;
  }

  if (Date.now() - startTime > maxWaitMs) {
    console.error('\n[VERIFY TIMEOUT] Délai dépassé (60s) sans confirmation complète.');
    console.log('Contenu actuel des logs:\n' + lireJournaux());
    clearInterval(interval);
    try {
      spawn('taskkill', ['/F', '/T', '/PID', child.pid.toString()]);
    } catch {}
    setTimeout(() => process.exit(1), 1000);
  }
}, 1000);
