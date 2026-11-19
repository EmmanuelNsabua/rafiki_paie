import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const phpDir =
  'C:\\Users\\himhi\\AppData\\Local\\Microsoft\\WinGet\\Packages\\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe';
const toolsPhp = 'C:\\Users\\himhi\\tools\\php';
const env = { ...process.env, PATH: `${phpDir};${toolsPhp};${process.env.PATH}` };

const cmd = process.argv.slice(2).join(' ');
try {
  execSync(cmd, {
    stdio: 'inherit',
    env,
    cwd: resolve(process.cwd(), 'apps/api'),
  });
} catch (e) {
  process.exit(e.status || 1);
}
