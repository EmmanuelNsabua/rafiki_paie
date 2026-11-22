import * as path from 'path';
import * as fs from 'fs';
import { app, protocol } from 'electron';
import log from 'electron-log/main';

/**
 * Types MIME supportés pour le protocole app://
 */
export const TYPES_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Résout le dossier racine contenant l'export statique HTML/CSS/JS (web/out).
 * En production empaquetée : resources/web/out.
 * En développement : apps/web/out.
 */
export function obtenirDossierWebOut(): string {
  if (app?.isPackaged && process.resourcesPath) {
    const prodPath = path.join(process.resourcesPath, 'web/out');
    if (fs.existsSync(prodPath)) {
      return prodPath;
    }
  }

  const candidats = [
    process.resourcesPath ? path.join(process.resourcesPath, 'web/out') : '',
    path.resolve(__dirname, '../../../../apps/web/out'),
    path.resolve(process.cwd(), 'apps/web/out'),
    path.resolve(process.cwd(), 'web/out'),
    path.resolve(process.cwd(), 'resources/web/out'),
  ].filter(Boolean);

  for (const cand of candidats) {
    if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
      return cand;
    }
  }

  return process.resourcesPath
    ? path.join(process.resourcesPath, 'web/out')
    : path.resolve(process.cwd(), 'apps/web/out');
}

/**
 * Enregistre le schéma 'app' comme privilégié avant app.whenReady().
 * Requis par Electron pour bénéficier des fonctionnalités standard, sécurisées et fetch API.
 */
export function enregistrerSchemaApp(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

/**
 * Traite une requête HTTP pour le protocole app://.
 * Sert les fichiers depuis dossierRacine :
 * - '/' vers index.html
 * - dossier vers son index.html
 * - refus strict de path traversal (../)
 * - types MIME corrects
 * - 404 propre si inexistant
 */
export async function traiterRequeteApp(
  urlOuRequete: string | Request,
  dossierRacine: string
): Promise<Response> {
  const urlStr = typeof urlOuRequete === 'string' ? urlOuRequete : urlOuRequete.url;

  // 1. Refus immédiat de toute tentative de path traversal dans l'URL brute
  if (urlStr.includes('..') || decodeURIComponent(urlStr).includes('..')) {
    log.warn(
      `[PROTOCOLE APP] Tentative de sortie de dossier (path traversal brute) refusée : ${urlStr}`
    );
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlStr);
  } catch {
    return new Response('Bad Request', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 2. Décodage du pathname URL
  let cheminRelatif = decodeURIComponent(parsedUrl.pathname);

  // Normalisation : / ou vide pointe vers /index.html
  if (!cheminRelatif || cheminRelatif === '/') {
    cheminRelatif = '/index.html';
  }

  // 3. Sécurité anti path traversal : le chemin résolu doit être strictement dans dossierRacine
  const racineNormalisee = path.resolve(dossierRacine);
  const cheminAbsolu = path.resolve(racineNormalisee, '.' + cheminRelatif);

  if (!cheminAbsolu.startsWith(racineNormalisee + path.sep) && cheminAbsolu !== racineNormalisee) {
    log.warn(
      `[PROTOCOLE APP] Tentative de sortie de dossier (path traversal résolu) refusée : ${cheminRelatif}`
    );
    return new Response('Forbidden', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  let fichierCible = cheminAbsolu;

  // 4. Si c'est un dossier, chercher son index.html
  if (fs.existsSync(fichierCible) && fs.statSync(fichierCible).isDirectory()) {
    fichierCible = path.join(fichierCible, 'index.html');
  }

  // 5. 404 propre si fichier inexistant ou non régulier
  if (!fs.existsSync(fichierCible) || !fs.statSync(fichierCible).isFile()) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // 6. Détermination du type MIME et renvoi du contenu binaire
  const ext = path.extname(fichierCible).toLowerCase();
  const contentType = TYPES_MIME[ext] || 'application/octet-stream';

  const buffer = fs.readFileSync(fichierCible);
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  });
}

/**
 * Enregistre le gestionnaire du protocole 'app' après app.whenReady().
 */
export function enregistrerGestionnaireApp(dossierRacine: string): void {
  protocol.handle('app', (request) => {
    return traiterRequeteApp(request, dossierRacine);
  });
  log.info(`[PROTOCOLE APP] Protocole app:// enregistré pour le dossier : ${dossierRacine}`);
}
