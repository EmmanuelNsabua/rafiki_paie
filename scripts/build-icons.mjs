import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const rootDir = process.cwd();
const srcSvg = path.join(rootDir, 'apps/web/public/icon_starclip.svg');
const outDir = path.join(rootDir, 'apps/desktop/build');
const outIco = path.join(outDir, 'icon.ico');
const outPng = path.join(outDir, 'icon.png');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function genererIcones() {
  // Génération PNG 256x256 haute définition depuis le SVG vectoriel officiel
  const png256 = await sharp(srcSvg).resize(256, 256).png().toBuffer();

  // Conteneur ICO avec frame PNG 256x256 (standard requis par electron-builder)
  const icoHeader = Buffer.alloc(6);
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // ICO format
  icoHeader.writeUInt16LE(1, 4); // 1 image

  const iconDirEntry = Buffer.alloc(16);
  iconDirEntry.writeUInt8(0, 0); // 0 = 256px width
  iconDirEntry.writeUInt8(0, 1); // 0 = 256px height
  iconDirEntry.writeUInt8(0, 2); // Palette size
  iconDirEntry.writeUInt8(0, 3); // Reserved
  iconDirEntry.writeUInt16LE(1, 4); // Color planes
  iconDirEntry.writeUInt16LE(32, 6); // Bits per pixel
  iconDirEntry.writeUInt32LE(png256.length, 8); // Image size
  iconDirEntry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

  const icoBuffer = Buffer.concat([icoHeader, iconDirEntry, png256]);
  fs.writeFileSync(outIco, icoBuffer);
  fs.writeFileSync(outPng, png256);

  console.log(`[ICÔNE] Fichiers générés avec succès :`);
  console.log(` - ${outIco} (${icoBuffer.length} octets, 256x256)`);
  console.log(` - ${outPng} (${png256.length} octets, 256x256)`);
}

genererIcones().catch((err) => {
  console.error('[ICÔNE] Erreur lors de la génération :', err);
  process.exit(1);
});
