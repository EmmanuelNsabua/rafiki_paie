import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDevDir = path.resolve(__dirname, '../out/dev');

if (fs.existsSync(outDevDir)) {
  fs.rmSync(outDevDir, { recursive: true, force: true });
  console.log('[BUILD] Routes /dev exclues avec succès de l export statique de production.');
} else {
  console.log('[BUILD] Aucune route /dev trouvée dans apps/web/out.');
}
