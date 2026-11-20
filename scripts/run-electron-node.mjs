import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const electronPath = path.resolve(rootDir, 'node_modules/electron/dist/electron.exe');

const args = process.argv.slice(2);

const child = spawn(electronPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
