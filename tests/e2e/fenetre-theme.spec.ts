import { test, expect } from '@playwright/test';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

test.describe.serial('Groupe G — Fenêtre sans cadre, barre de titre et thèmes (Lot 2)', () => {
  let tempUserDataDir: string;
  let app: ElectronApplication;
  let page: Page;

  const mainPath = path.resolve('apps/desktop/dist/main/index.js');
  const electronExe = path.resolve('node_modules/electron/dist/electron.exe');
  const capturesDir = path.resolve('docs/phase-2/captures-fenetre');

  function getCleanEnv(extraEnv: Record<string, string> = {}) {
    const env = { ...process.env, ...extraEnv };
    delete env.ELECTRON_RUN_AS_NODE;
    return env;
  }

  test.beforeAll(async () => {
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-fenetre-test-'));
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }

    app = await electron.launch({
      executablePath: electronExe,
      args: [mainPath],
      env: getCleanEnv({
        RAFIKI_DB_PATH: path.join(tempUserDataDir, 'test.sqlite'),
        ELECTRON_USER_DATA: tempUserDataDir,
      }),
    });

    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('aside[aria-label="Navigation principale"]', { timeout: 15000 });
  });

  test.afterAll(async () => {
    if (app) {
      await app.close().catch(() => {});
    }
    try {
      if (fs.existsSync(tempUserDataDir)) {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true });
      }
    } catch {
      // Ignorer si verrouillé
    }
  });

  test('1. Menu.getApplicationMenu() vaut null et fenêtre sans cadre nommée "École RAFIKI"', async () => {
    const menuEstNull = await app.evaluate(({ Menu }) => Menu.getApplicationMenu() === null);
    expect(menuEstNull).toBe(true);

    const titreFenetre = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win?.getTitle();
    });
    expect(titreFenetre).toMatch(/École RAFIKI|RAFIKI|Gestionnaire de paie/);

    // Page d'accueil par défaut est Journal de paie
    await page.waitForURL(/\/journal-de-paie/, { timeout: 5000 });
    const url = page.url();
    expect(url).toContain('journal-de-paie');
  });

  test('2. La barre de titre contient le logo et le titre à gauche, et les contrôles de fenêtre à droite', async () => {
    await page.waitForSelector('[data-testid="barre-titre"]', { timeout: 5000 });
    expect(await page.isVisible('[data-testid="barre-titre"]')).toBe(true);

    const logoVisible = await page.isVisible('button[aria-label="Menu de l\'application"]');
    expect(logoVisible).toBe(true);

    const titreVisible = await page.isVisible('text="Gestionnaire de paie"');
    expect(titreVisible).toBe(true);

    // Contrôles de fenêtre à droite
    expect(await page.isVisible('[data-testid="controles-fenetre"]')).toBe(true);
    expect(await page.isVisible('button[aria-label="Réduire"]')).toBe(true);
    expect(
      await page.isVisible('button[aria-label="Agrandir"], button[aria-label="Restaurer"]')
    ).toBe(true);
    expect(await page.isVisible('button[aria-label="Fermer"]')).toBe(true);
  });

  test('3. Clic sur le logo ouvre le menu complet et fonctionnel', async () => {
    await page.click('button[aria-label="Menu de l\'application"]');
    await page.waitForSelector('div[role="menu"]', { timeout: 5000 });

    // Vérification des 3 sections
    expect(await page.isVisible('text=Affichage')).toBe(true);
    expect(await page.isVisible('text=Taille du texte')).toBe(true);
    expect(await page.isVisible('text=Zoom')).toBe(true);
    expect(await page.isVisible('text=Thème')).toBe(true);

    expect(await page.isVisible('text=Fenêtre')).toBe(true);
    expect(await page.isVisible('text=Réduire')).toBe(true);
    expect(await page.isVisible('text=Agrandir')).toBe(true);
    expect(await page.isVisible('text=Fermer')).toBe(true);

    expect(await page.isVisible("text=Redémarrer l'application")).toBe(true);
    expect(await page.isVisible('text=Version')).toBe(true);

    // Test de modification de la taille du texte (+1 px)
    await page.click('button[title="Augmenter la taille du texte"]');
    await page.waitForTimeout(100);
    expect(await page.isVisible('text=15 px')).toBe(true);

    // Rétablir la taille
    await page.click('button:has-text("Rétablir") >> nth=0');
    await page.waitForTimeout(100);
    expect(await page.isVisible('text=14 px')).toBe(true);

    // Test de modification du zoom (+10%)
    await page.click('button[title="Zoom avant"]');
    await page.waitForTimeout(100);
    expect(await page.isVisible('text=110 %')).toBe(true);

    // Rétablir le zoom
    await page.click('button:has-text("Rétablir") >> nth=1');
    await page.waitForTimeout(100);
    expect(await page.isVisible('text=100 %')).toBe(true);
  });

  test('4. Thème clair : sélection et vérification des couleurs identiques', async () => {
    // S'assurer que le menu est ouvert
    if (!(await page.isVisible('div[role="menu"]'))) {
      await page.click('button[aria-label="Menu de l\'application"]');
      await page.waitForSelector('div[role="menu"]', { timeout: 5000 });
    }

    await page.click('button[title="Thème clair"]');
    await page.waitForTimeout(300);

    const couleurs = await page.evaluate(() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const barreTitre = document.querySelector('[data-testid="barre-titre"]');
      const barreTitreBg = barreTitre ? window.getComputedStyle(barreTitre).backgroundColor : '';
      const sidebar = document.querySelector('aside[aria-label="Navigation principale"]');
      const sidebarBg = sidebar ? window.getComputedStyle(sidebar).backgroundColor : '';
      const topbar = document.querySelector('header');
      const topbarBg = topbar ? window.getComputedStyle(topbar).backgroundColor : '';

      return { bodyBg, barreTitreBg, sidebarBg, topbarBg };
    });

    // Toutes doivent être identiques (#f3f3f3 = rgb(243, 243, 243))
    expect(couleurs.barreTitreBg).toBe('rgb(243, 243, 243)');
    expect(couleurs.sidebarBg).toBe(couleurs.barreTitreBg);
    expect(couleurs.topbarBg).toBe(couleurs.barreTitreBg);
    expect(couleurs.bodyBg).toBe(couleurs.barreTitreBg);

    // Capture menu ouvert en clair
    await page.screenshot({
      path: path.join(capturesDir, 'fenetre-clair-menu-ouvert.png'),
    });

    // Fermer le menu pour la capture plein écran en clair
    await page.click('button[aria-label="Menu de l\'application"]');
    await page.waitForTimeout(200);

    await page.screenshot({
      path: path.join(capturesDir, 'fenetre-clair-1920x1080.png'),
    });
  });

  test('5. Thème sombre : sélection et vérification des couleurs identiques', async () => {
    // Réouvrir le menu
    await page.click('button[aria-label="Menu de l\'application"]');
    await page.waitForSelector('div[role="menu"]', { timeout: 5000 });

    await page.click('button[title="Thème sombre"]');
    await page.waitForTimeout(300);

    const couleurs = await page.evaluate(() => {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const barreTitre = document.querySelector('[data-testid="barre-titre"]');
      const barreTitreBg = barreTitre ? window.getComputedStyle(barreTitre).backgroundColor : '';
      const sidebar = document.querySelector('aside[aria-label="Navigation principale"]');
      const sidebarBg = sidebar ? window.getComputedStyle(sidebar).backgroundColor : '';
      const topbar = document.querySelector('header');
      const topbarBg = topbar ? window.getComputedStyle(topbar).backgroundColor : '';

      return { bodyBg, barreTitreBg, sidebarBg, topbarBg };
    });

    // Toutes doivent être identiques (#202020 = rgb(32, 32, 32))
    expect(couleurs.barreTitreBg).toBe('rgb(32, 32, 32)');
    expect(couleurs.sidebarBg).toBe(couleurs.barreTitreBg);
    expect(couleurs.topbarBg).toBe(couleurs.barreTitreBg);
    expect(couleurs.bodyBg).toBe(couleurs.barreTitreBg);

    // Capture avec menu ouvert en sombre
    await page.screenshot({
      path: path.join(capturesDir, 'fenetre-sombre-menu-ouvert.png'),
    });

    // Fermer le menu (clic logo) et capturer la fenêtre en sombre
    await page.click('button[aria-label="Menu de l\'application"]');
    await page.waitForTimeout(200);

    await page.screenshot({
      path: path.join(capturesDir, 'fenetre-sombre-1920x1080.png'),
    });
  });
});
