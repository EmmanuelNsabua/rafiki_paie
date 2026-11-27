import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Résolution de l'exécutable Electron
let electronPath;
try {
  // 1. Tente require('electron') qui pointe directement sur le binaire
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  electronPath = require('electron');
} catch {
  // 2. Fallbacks système de fichiers
  const paths = [
    path.resolve(rootDir, 'node_modules/electron/dist/electron.exe'),
    path.resolve(rootDir, 'apps/desktop/node_modules/electron/dist/electron.exe'),
  ];
  electronPath = paths.find((p) => fs.existsSync(p)) || paths[0];
}

const vitestPath = path.resolve(rootDir, 'node_modules/vitest/vitest.mjs');

const args = [vitestPath, ...process.argv.slice(2)];

const child = spawn(electronPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
