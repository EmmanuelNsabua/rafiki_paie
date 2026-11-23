import { test, expect } from '@playwright/test';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';

test.describe.serial('Parcours complet E2E — Phase 2 (Section 7, Étape 7)', () => {
  let tempUserDataDir: string;
  let tempDbPath: string;
  let app: ElectronApplication;
  let window: Page;

  const mainPath = path.resolve('apps/desktop/dist/main/index.js');
  const electronExe = path.resolve('node_modules/electron/dist/electron.exe');
  const capturesDir = path.resolve('docs/phase-2/captures');

  function getCleanEnv(extraEnv: Record<string, string> = {}) {
    const env = { ...process.env, ...extraEnv };
    delete env.ELECTRON_RUN_AS_NODE;
    return env;
  }

  async function capturerEtape(nomEtape: string) {
    if (!fs.existsSync(capturesDir)) {
      fs.mkdirSync(capturesDir, { recursive: true });
    }
    // Capture à 1920x1080
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(300);
    await window.screenshot({
      path: path.join(capturesDir, `${nomEtape}-1920x1080.png`),
      fullPage: false,
    });

    // Capture à 1366x768
    await window.setViewportSize({ width: 1366, height: 768 });
    await window.waitForTimeout(300);
    await window.screenshot({
      path: path.join(capturesDir, `${nomEtape}-1366x768.png`),
      fullPage: false,
    });

    // Restauration de la taille 1920x1080
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(200);
  }

  test.beforeAll(async () => {
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-e2e-'));
    tempDbPath = path.join(tempUserDataDir, 'rafiki_paie.sqlite');
  });

  test.afterAll(async () => {
    if (app) {
      await app.close().catch(() => {});
    }
    try {
      if (fs.existsSync(tempUserDataDir)) {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true });
      }
    } catch {}
  });

  test('Étapes 1 à 6 : Parcours complet sur base vierge temporaire', async () => {
    // 0. Démarrage de l'application
    app = await electron.launch({
      executablePath: electronExe,
      args: [mainPath, `--user-data-dir=${tempUserDataDir}`],
      env: getCleanEnv({
        NODE_ENV: 'production',
        RAFIKI_DB_PATH: tempDbPath,
      }),
    });

    window = await app.firstWindow();
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForLoadState('domcontentloaded');

    // Attente de l'interface
    await window.waitForSelector('text=École Rafiki', { timeout: 15000 });

    // --- Étape 1 : Créer l'employé « Test Un » ---
    // Navigation vers Liste des employés
    await window.click('text=Liste des employés');
    await window.waitForSelector('text=Ajouter un employé', { timeout: 5000 });

    await window.click('text=Ajouter un employé');
    await window.waitForSelector('text=Nouvel employé', { timeout: 5000 });

    // Vérifier que le code banque est pré-rempli (doit être non vide)
    const codeBanqueInput = window.locator('#champ-code-banque');
    const codeBanqueValeur = await codeBanqueInput.inputValue();
    expect(codeBanqueValeur.length).toBeGreaterThanOrEqual(1);

    // Saisie des champs : Nom "Test", Prénom "Un", Salaire 500, Téléphone "+243 81 000 0010"
    await window.fill('#champ-nom', 'Test');
    await window.fill('#champ-prenom', 'Un');
    await window.fill('#champ-salaire', '500');
    await window.fill('#champ-telephone', '+243 81 000 0010');

    await window.click('button:has-text("Créer l’employé")');
    await window.waitForSelector('text=Test Un', { timeout: 5000 });

    await capturerEtape('etape-1-creation-employe');

    // --- Étape 2 : Créer l'opération de novembre 2026 (22 jours) ---
    await window.click('text=Journal de paie');
    await window.waitForSelector('text=Nouvelle opération', { timeout: 5000 });

    await window.click('button:has-text("Nouvelle opération")');
    await window.waitForSelector('text=Nouvelle opération de paie', { timeout: 5000 });

    // Sélection de Novembre 2026, 22 jours ouvrables
    await window.selectOption('select#champ-mois', '11');
    await window.fill('#champ-annee', '2026');
    await window.fill('#champ-jours', '22');

    await window.click('button:has-text("Créer l’opération")');

    // Redirection automatique vers /operation/
    await window.waitForURL(/\/operation\/\?id=/, { timeout: 15000 });
    await window.waitForSelector('text=Novembre 2026', { timeout: 15000 });
    await window.waitForSelector('text=Test Un', { timeout: 15000 });

    await capturerEtape('etape-2-creation-operation');

    // --- Étape 3 : Saisir HS 40 et Retrait 20 dans la grille, puis absences ---
    // Clic sur cellule HS pour la première ligne
    const celluleHs = window.locator('#cellule-hs-0');
    await celluleHs.click();
    const inputHs = window.locator('#input-cellule-hs-0');
    await inputHs.fill('40');
    await inputHs.press('Enter');

    // Clic sur cellule Retrait
    const celluleRetrait = window.locator('#cellule-retrait-0');
    await celluleRetrait.click();
    const inputRetrait = window.locator('#input-cellule-retrait-0');
    await inputRetrait.fill('20');
    await inputRetrait.press('Enter');

    // Attente de recalcul
    await window.waitForTimeout(600);

    // Ouvrir le menu d'actions puis le panneau absences
    const boutonAction = window.locator('button[aria-label^="Actions pour"]').first();
    await boutonAction.click();
    await window.click('text=Absences');

    await window.waitForSelector('text=Absences — Test Un', { timeout: 5000 });

    // Saisir maladie 2, congé 1, absence 1
    await window.fill('#absence-maladie', '2');
    await window.fill('#absence-conge', '1');
    await window.fill('#absence-injustifiee', '1');

    // Attente anti-rebond et recalcul
    await window.waitForTimeout(1000);

    // Fermer le panneau absences
    await window.click('button:has-text("Fermer")');
    await window.waitForTimeout(500);

    // Vérification : Salaire net affiché = 474,55 $ et Total payé = 470 $
    await window.waitForSelector('text=474,55', { timeout: 5000 });
    await window.waitForSelector('text=470', { timeout: 5000 });

    await capturerEtape('etape-3-saisie-et-recalcul');

    // --- Étape 4 : Terminer la paie ---
    await window.click('button:has-text("Terminer la paie")');
    await window.waitForSelector('text=Confirmer et terminer', { timeout: 5000 });
    await window.click('button:has-text("Confirmer et terminer")');

    // Vérifier l'état verrouillé
    await window.waitForSelector('text=Terminée', { timeout: 5000 });
    await window.waitForSelector('text=Rouvrir la paie', { timeout: 5000 });

    await capturerEtape('etape-4-paie-terminee');

    // --- Étape 5 : Fermer l'application et la relancer sur la même base ---
    await app.close();

    app = await electron.launch({
      executablePath: electronExe,
      args: [mainPath, `--user-data-dir=${tempUserDataDir}`],
      env: getCleanEnv({
        NODE_ENV: 'production',
        RAFIKI_DB_PATH: tempDbPath,
      }),
    });

    window = await app.firstWindow();
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForLoadState('domcontentloaded');

    // Navigation vers l'opération via le journal de paie
    await window.waitForSelector('text=École Rafiki', { timeout: 15000 });
    await window.click('text=Journal de paie');
    await window.waitForSelector('text=Journal de paie', { timeout: 5000 });

    // Clic sur l'opération de Novembre 2026
    await window.click('tr:has-text("Novembre 2026")');
    await window.waitForURL(/\/operation\/\?id=/, { timeout: 15000 });
    await window.waitForSelector('text=Novembre 2026', { timeout: 15000 });

    // Vérification de l'état terminé et des montants
    await window.waitForSelector('text=Terminée', { timeout: 15000 });
    await window.waitForSelector('text=474,55', { timeout: 15000 });
    await window.waitForSelector('text=470', { timeout: 15000 });

    await capturerEtape('etape-5-reouverture-application');

    // --- Étape 6 : Rouvrir la paie, modifier une valeur, terminer à nouveau ---
    await window.click('button:has-text("Rouvrir la paie")');
    await window.waitForSelector('text=Êtes-vous sûr de vouloir rouvrir', { timeout: 5000 });
    await window.locator('button:has-text("Rouvrir la paie")').last().click();

    await window.waitForSelector('text=En cours', { timeout: 8000 });
    await window.waitForSelector('button:has-text("Terminer la paie")', { timeout: 5000 });

    // Modifier HS de 40 à 50
    const celluleHsModif = window.locator('#cellule-hs-0');
    await celluleHsModif.click();
    const inputHsModif = window.locator('#input-cellule-hs-0');
    await inputHsModif.fill('50');
    await inputHsModif.press('Enter');
    await window.waitForTimeout(1000);

    // Terminer à nouveau
    await window.click('button:has-text("Terminer la paie")');
    await window.waitForSelector('text=Confirmer et terminer', { timeout: 5000 });
    await window.click('button:has-text("Confirmer et terminer")');

    await window.waitForSelector('text=Terminée', { timeout: 5000 });
    await capturerEtape('etape-6-rouvrir-modifier-terminer');

    await app.close();
  });

  test('Étapes 7 et 8 : Base seedée, totaux d’octobre 2026 et recherche globale Ctrl+K', async () => {
    // 1. Initialiser une base avec les données de test du prototype
    const seededUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rafiki-e2e-seed-'));
    const seededDbPath = path.join(seededUserDataDir, 'rafiki_paie.sqlite');
    const runScript = path.resolve('scripts/run-electron-node.mjs');
    const seedScript = path.resolve('apps/desktop/dist/main/seed.js');

    execSync(`node "${runScript}" "${seedScript}" --force`, {
      cwd: path.resolve('apps/desktop'),
      env: {
        ...process.env,
        RAFIKI_DB_PATH: seededDbPath,
      },
    });

    // 2. Lancement de l'application sur la base seedée
    app = await electron.launch({
      executablePath: electronExe,
      args: [mainPath, `--user-data-dir=${seededUserDataDir}`],
      env: getCleanEnv({
        NODE_ENV: 'production',
        RAFIKI_DB_PATH: seededDbPath,
      }),
    });

    window = await app.firstWindow();
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForLoadState('domcontentloaded');

    await window.waitForSelector('text=École Rafiki', { timeout: 15000 });

    // --- Étape 7 : Vérifier l'opération d'octobre 2026 (seedée) ---
    await window.click('text=Journal de paie');
    await window.waitForSelector('text=Journal de paie', { timeout: 5000 });

    // Clic sur l'opération d'octobre 2026
    const opOctobre = window.locator('tr:has-text("Octobre 2026")').first();
    await opOctobre.click();
    await window.waitForURL(/\/operation\/\?id=/);
    await window.waitForSelector('text=Octobre 2026', { timeout: 8000 });

    // Vérification des cartes de synthèse :
    // Masse salariale 2 660 $, Total payé 2 580 $, Salaire moyen 443,33 $, Nombre d'employés 6
    await window.waitForSelector('text=2 660', { timeout: 5000 });
    await window.waitForSelector('text=2 580', { timeout: 5000 });
    await window.waitForSelector('text=443,33', { timeout: 5000 });
    await window.waitForSelector('text=6', { timeout: 5000 });

    await capturerEtape('etape-7-base-seedee-synthese');

    // --- Étape 8 : Recherche globale Ctrl+K ---
    // Déclenchement de Ctrl+K
    await window.keyboard.press('Control+k');
    await window.waitForTimeout(300);
    const inputRecherche = window.locator('input[placeholder="Rechercher…"]');
    const estFocus = await inputRecherche.evaluate((el) => el === document.activeElement);
    expect(estFocus).toBe(true);

    // Recherche d'un employé présent dans le jeu d'essai ("Kabongo")
    await inputRecherche.fill('Kabongo');
    await window.waitForTimeout(500);
    await window.waitForSelector('text=Kabongo', { timeout: 5000 });

    await capturerEtape('etape-8-recherche-globale');

    await app.close();

    // Nettoyage de la base seedée temporaire
    try {
      if (fs.existsSync(seededUserDataDir)) {
        fs.rmSync(seededUserDataDir, { recursive: true, force: true });
      }
    } catch {}
  });
});
