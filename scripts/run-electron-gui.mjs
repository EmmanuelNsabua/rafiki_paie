import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.resolve(rootDir, 'apps/desktop');
const electronPath = path.resolve(rootDir, 'node_modules/electron/dist/electron.exe');

const args = process.argv.slice(2);
if (args.length === 0) {
  args.push('.');
}

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, args, {
  cwd: desktopDir,
  stdio: 'inherit',
  env,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
