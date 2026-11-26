import { autoUpdater } from 'electron-updater';
import { app, BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { InfoMiseAJour } from '@rafiki/contrat';
import type { SauvegardeService } from './sauvegarde-service';
import { executerFermetureSansPerte } from '../ipc/fenetre-ipc';

export class UpdateService {
  private etatActuel: InfoMiseAJour = {
    statut: 'inactif',
    versionActuelle: typeof app?.getVersion === 'function' ? app.getVersion() : '0.1.0',
  };
  private sauvegardeService: SauvegardeService;
  private obtenirFenetre: () => BrowserWindow | null;
  private timerVerificationInitiale: NodeJS.Timeout | null = null;

  constructor(sauvegardeService: SauvegardeService, obtenirFenetre: () => BrowserWindow | null) {
    this.sauvegardeService = sauvegardeService;
    this.obtenirFenetre = obtenirFenetre;

    // Configuration d'electron-updater
    try {
      autoUpdater.logger = log;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.allowPrerelease = false;
      this.enregistrerEcouteurs();
    } catch {
      // Ignorer si autoUpdater n'est pas initialisable dans l'environnement courant
    }
  }

  private emettreChangement(info: Partial<InfoMiseAJour>): void {
    this.etatActuel = { ...this.etatActuel, ...info };
    const win = this.obtenirFenetre();
    if (win && !win.isDestroyed()) {
      win.webContents.send('maj:changementEtat', this.etatActuel);
    }
  }

  private enregistrerEcouteurs(): void {
    autoUpdater.on('checking-for-update', () => {
      log.info('[UPDATE] Recherche de mise à jour en cours...');
      this.emettreChangement({ statut: 'verification' });
    });

    autoUpdater.on('update-available', (info) => {
      log.info(`[UPDATE] Mise à jour disponible : version ${info.version}`);
      this.emettreChangement({
        statut: 'disponible',
        versionDisponible: info.version,
        progression: 0,
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info(`[UPDATE] Aucune mise à jour disponible (version actuelle : ${info.version})`);
      this.emettreChangement({ statut: 'a-jour', versionDisponible: undefined });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      this.emettreChangement({
        statut: 'telechargement',
        progression: Math.round(progressObj.percent),
      });
    });

    autoUpdater.on('update-downloaded', async (info) => {
      log.info(
        `[UPDATE] Mise à jour téléchargée avec succès (${info.version}). Sauvegarde préalable de la base...`
      );
      try {
        await this.sauvegardeService.creerSauvegardeAvantMaj(info.version);
      } catch (err: any) {
        log.warn(`[UPDATE] Impossible de créer la sauvegarde avant-maj : ${err?.message}`);
      }
      this.emettreChangement({
        statut: 'telecharge',
        versionDisponible: info.version,
        progression: 100,
      });
    });

    autoUpdater.on('error', (err) => {
      // En cas d'erreur réseau / hors ligne : silence total pour l'utilisateur
      log.warn(`[UPDATE] Erreur lors de la mise à jour (silencieuse) : ${err?.message}`);
      this.emettreChangement({ statut: 'inactif', message: err?.message });
    });
  }

  planifierVerificationInitiale(): void {
    if (!app?.isPackaged) {
      log.info('[UPDATE] Mode développement : vérification automatique des MAJ ignorée.');
      return;
    }

    // Vérification 12 secondes après le démarrage, en tâche de fond
    this.timerVerificationInitiale = setTimeout(() => {
      this.verifierMiseAJour().catch((err) => {
        log.warn(`[UPDATE] Échec vérification planifiée : ${err?.message}`);
      });
    }, 12000);
  }

  annulerPlanification(): void {
    if (this.timerVerificationInitiale) {
      clearTimeout(this.timerVerificationInitiale);
      this.timerVerificationInitiale = null;
    }
  }

  async verifierMiseAJour(): Promise<InfoMiseAJour> {
    if (!app?.isPackaged) {
      this.emettreChangement({
        statut: 'a-jour',
        message: 'Mises à jour actives uniquement dans l application empaquetée.',
      });
      return this.etatActuel;
    }

    try {
      await autoUpdater.checkForUpdates();
    } catch (err: any) {
      log.warn(`[UPDATE] Erreur lors de la vérification manuelle : ${err?.message}`);
      this.emettreChangement({ statut: 'erreur', message: err?.message });
    }
    return this.etatActuel;
  }

  async installerEtRedemarrer(): Promise<void> {
    log.info(
      '[UPDATE] Installation de la mise à jour demandée. Exécution de la fermeture sans perte...'
    );
    const win = this.obtenirFenetre();
    await executerFermetureSansPerte(win, false);
    autoUpdater.quitAndInstall();
  }

  obtenirEtat(): InfoMiseAJour {
    return this.etatActuel;
  }
}
