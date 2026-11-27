import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

function calculateSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function main() {
  const releaseDir = path.resolve('apps/desktop/release');
  if (!fs.existsSync(releaseDir)) {
    console.error(`Le dossier de release n'existe pas : ${releaseDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(releaseDir);
  const setupFiles = files.filter(
    (f) =>
      (f.endsWith('.exe') || f.endsWith('.yml') || f.endsWith('.blockmap')) &&
      !f.startsWith('elevate')
  );

  if (setupFiles.length === 0) {
    console.warn('Aucun fichier binaire trouvé dans release/ pour calculer la somme de contrôle.');
    process.exit(0);
  }

  const lines = [];
  for (const file of setupFiles) {
    const fullPath = path.join(releaseDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const sha256 = calculateSha256(fullPath);
      lines.push(`${sha256}  ${file}`);
      console.log(`[SHA256] ${file} : ${sha256}`);
    }
  }

  const outputPath = path.join(releaseDir, 'SHA256SUMS.txt');
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Fichier de sommes de contrôle généré avec succès : ${outputPath}`);
}

main();
