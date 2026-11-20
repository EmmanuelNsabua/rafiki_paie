import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Page de contrôle /dev/controle (Étape 7)', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const pagePath = path.join(rootDir, 'apps/web/src/app/dev/controle/page.tsx');
  const outDir = path.join(rootDir, 'apps/web/out');
  const scriptExcludePath = path.join(rootDir, 'apps/web/scripts/exclude-dev-routes.mjs');

  it('le composant /dev/controle existe et conditionne son accès à window.api.env.estDev', () => {
    expect(fs.existsSync(pagePath)).toBe(true);

    const contenu = fs.readFileSync(pagePath, 'utf-8');

    // Vérifier la vérification d'environnement
    expect(contenu).toMatch(/window\.api\?\.env\?\.estDev/);

    // Vérifier le message de refus
    expect(contenu).toContain('Accès refusé');
    expect(contenu).toContain('estDev === true');

    // Vérifier les 3 sections métier requises
    expect(contenu).toContain('Opérations de paie');
    expect(contenu).toContain('Détail de la paie');
    expect(contenu).toContain('Journal d audit');
  });

  it('le script d exclusion des routes dev est configuré et exécutable', () => {
    expect(fs.existsSync(scriptExcludePath)).toBe(true);

    const packageJsonWeb = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'apps/web/package.json'), 'utf-8')
    );
    expect(packageJsonWeb.scripts.build).toContain('exclude-dev-routes.mjs');
  });

  it('l export statique de production apps/web/out ne contient aucune route /dev/controle', () => {
    // Si l'export de production est généré, s'assurer que /dev/controle en est strictement absent
    const devOutPath = path.join(outDir, 'dev');
    const devHtml = path.join(outDir, 'dev/controle/index.html');
    const devHtmlDirect = path.join(outDir, 'dev/controle.html');

    expect(fs.existsSync(devOutPath)).toBe(false);
    expect(fs.existsSync(devHtml)).toBe(false);
    expect(fs.existsSync(devHtmlDirect)).toBe(false);
  });
});
