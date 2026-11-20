import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Find electron executable
const electronPath = path.resolve(rootDir, 'node_modules/electron/dist/electron.exe');
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
