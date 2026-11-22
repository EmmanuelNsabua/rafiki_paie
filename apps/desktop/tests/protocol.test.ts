import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { traiterRequeteApp, TYPES_MIME } from '../src/main/protocol';

describe('Protocole personnalisé app:// (Groupe A2)', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-protocol-test-'));

    // Création de l'arborescence de test
    fs.writeFileSync(
      path.join(tmpDir, 'index.html'),
      '<!DOCTYPE html><html><body><h1>Paie Rafiki</h1></body></html>'
    );

    // Dossier _next/static/css et _next/static/chunks
    const cssDir = path.join(tmpDir, '_next', 'static', 'css');
    fs.mkdirSync(cssDir, { recursive: true });
    fs.writeFileSync(path.join(cssDir, 'theme.css'), 'body { background-color: #f5f5f7; }');

    const jsDir = path.join(tmpDir, '_next', 'static', 'chunks');
    fs.mkdirSync(jsDir, { recursive: true });
    fs.writeFileSync(path.join(jsDir, 'app.js'), 'console.log("App active");');

    // Sous-dossier avec index.html
    const subDir = path.join(tmpDir, 'documentation');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'index.html'), '<html><body>Documentation</body></html>');

    // Fichier secret en dehors de la racine pour tester le path traversal
    fs.writeFileSync(path.join(path.dirname(tmpDir), 'secret-hors-racine.txt'), 'SECRET');
  });

  afterAll(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
      const secretFile = path.join(path.dirname(tmpDir), 'secret-hors-racine.txt');
      if (fs.existsSync(secretFile)) {
        fs.unlinkSync(secretFile);
      }
    } catch {}
  });

  it('1. Sert / vers index.html avec le type MIME text/html', async () => {
    const res = await traiterRequeteApp('app://rafiki/', tmpDir);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const texte = await res.text();
    expect(texte).toContain('Paie Rafiki');
  });

  it('2. Sert /index.html avec le type MIME text/html', async () => {
    const res = await traiterRequeteApp('app://rafiki/index.html', tmpDir);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const texte = await res.text();
    expect(texte).toContain('Paie Rafiki');
  });

  it('3. Sert un chemin de dossier vers son index.html', async () => {
    // Sans slash final
    const resSansSlash = await traiterRequeteApp('app://rafiki/documentation', tmpDir);
    expect(resSansSlash.status).toBe(200);
    expect(resSansSlash.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    const texteSansSlash = await resSansSlash.text();
    expect(texteSansSlash).toContain('Documentation');

    // Avec slash final
    const resAvecSlash = await traiterRequeteApp('app://rafiki/documentation/', tmpDir);
    expect(resAvecSlash.status).toBe(200);
    expect(resAvecSlash.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });

  it('4. Sert un fichier /_next/static/... avec le bon type MIME (CSS et JS)', async () => {
    // Fichier CSS
    const resCss = await traiterRequeteApp('app://rafiki/_next/static/css/theme.css', tmpDir);
    expect(resCss.status).toBe(200);
    expect(resCss.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    const texteCss = await resCss.text();
    expect(texteCss).toContain('background-color: #f5f5f7;');

    // Fichier JS
    const resJs = await traiterRequeteApp('app://rafiki/_next/static/chunks/app.js', tmpDir);
    expect(resJs.status).toBe(200);
    expect(resJs.headers.get('Content-Type')).toBe('application/javascript; charset=utf-8');
    const texteJs = await resJs.text();
    expect(texteJs).toContain('App active');
  });

  it('5. Refuse strictement toute tentative de sortie de dossier (path traversal ../)', async () => {
    const tentativesTraversal = [
      'app://rafiki/../secret-hors-racine.txt',
      'app://rafiki/..%2fsecret-hors-racine.txt',
      'app://rafiki/%2e%2e/secret-hors-racine.txt',
      'app://rafiki/%2e%2e%2fsecret-hors-racine.txt',
      'app://rafiki/documentation/../../secret-hors-racine.txt',
      'app://rafiki/..',
      'app://rafiki/%2e%2e',
    ];

    for (const url of tentativesTraversal) {
      const res = await traiterRequeteApp(url, tmpDir);
      expect(res.status).toBe(403);
      expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    }
  });

  it('6. Retourne une 404 propre pour un chemin inexistant', async () => {
    const res = await traiterRequeteApp('app://rafiki/page-introuvable.html', tmpDir);
    expect(res.status).toBe(404);
    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    const texte = await res.text();
    expect(texte).toBe('Not Found');

    const resStatic = await traiterRequeteApp(
      'app://rafiki/_next/static/css/inexistant.css',
      tmpDir
    );
    expect(resStatic.status).toBe(404);
  });
});
