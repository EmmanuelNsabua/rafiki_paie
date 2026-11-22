import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Audit Phase 1 — Groupe A : Démarrage réel', () => {
  const desktopDir = path.resolve(__dirname, '..');
  const distPreloadPath = path.join(desktopDir, 'dist/preload/index.js');
  const tsupConfigPath = path.join(desktopDir, 'tsup.config.ts');
  const mainIndexPath = path.join(desktopDir, 'src/main/index.ts');
  const preloadIndexPath = path.join(desktopDir, 'src/preload/index.ts');
  const packageJsonPath = path.join(desktopDir, 'package.json');

  describe('Constat C1 : Embarquement de @rafiki/contrat dans le preload (noExternal)', () => {
    it('tsup.config.ts configure noExternal pour @rafiki/contrat', () => {
      const tsupConfig = fs.readFileSync(tsupConfigPath, 'utf-8');
      expect(tsupConfig).toMatch(/noExternal:\s*\[.*['"]@rafiki\/contrat['"].*\]/);
    });

    it('le fichier compilé dist/preload/index.js ne contient aucun require("@rafiki/contrat")', () => {
      expect(fs.existsSync(distPreloadPath)).toBe(true);
      const code = fs.readFileSync(distPreloadPath, 'utf-8');
      expect(code).not.toContain('require("@rafiki/contrat")');
      expect(code).not.toContain("require('@rafiki/contrat')");
      expect(code).toContain('CANAUX_IPC');
    });
  });

  describe('Constat C2 : Calcul de estDev dans le main et transmission via additionalArguments', () => {
    it('src/main/index.ts passe --is-dev dans webPreferences.additionalArguments', () => {
      const mainCode = fs.readFileSync(mainIndexPath, 'utf-8');
      expect(mainCode).toContain('additionalArguments');
      expect(mainCode).toMatch(/--is-dev=/);
    });

    it('src/preload/index.ts lit estDev depuis process.argv et non process.env.NODE_ENV', () => {
      const preloadCode = fs.readFileSync(preloadIndexPath, 'utf-8');
      expect(preloadCode).not.toContain("process.env.NODE_ENV === 'development'");
      expect(preloadCode).toContain('process.argv');
      expect(preloadCode).toContain('--is-dev=');
    });
  });

  describe('Constat C3 : ExtraResources et résolution de index.html via process.resourcesPath', () => {
    it('apps/desktop/package.json configure extraResources pour embarquer apps/web/out', () => {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(pkg.build).toBeDefined();
      expect(pkg.build.extraResources).toBeDefined();

      const hasWebOut = pkg.build.extraResources.some(
        (res: any) =>
          (res.from === '../web/out' || res.from === '../../apps/web/out') && res.to === 'web/out'
      );
      expect(hasWebOut).toBe(true);
    });

    it('utilise process.resourcesPath pour localiser web/out en production et charge via app://rafiki/', () => {
      const mainCode = fs.readFileSync(mainIndexPath, 'utf-8');
      const protocolPath = path.resolve(__dirname, '../src/main/protocol.ts');
      const protocolCode = fs.existsSync(protocolPath)
        ? fs.readFileSync(protocolPath, 'utf-8')
        : '';

      const combinedCode = mainCode + '\n' + protocolCode;
      expect(combinedCode).toContain('process.resourcesPath');
      expect(combinedCode).toContain('web/out');
      expect(mainCode).toContain('app://rafiki/');
      expect(mainCode).not.toContain('../../../web/out/index.html');
    });
  });
});
