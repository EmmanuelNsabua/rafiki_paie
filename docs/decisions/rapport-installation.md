# Rapport de Décision et d'Installation — Starclip

Ce rapport consigne la vérification systématique de l'ensemble des critères d'acceptation définis pour l'installation, la pérennité des données et le cycle de mise à jour de Starclip.

---

## 1. Informations Générales

- **Application** : Starclip — Gestionnaire de paie (École Rafiki)
- **Identifiant Unique (appId)** : `com.starclip.paie`
- **Droits et Propriétaire** : Starclip, © 2026 Starclip
- **Cible Système** : Windows 10 & 11 (64 bits, x64)
- **Type d'installeur** : NSIS (par utilisateur, sans privilège administrateur)
- **Emplacement userData stabilisé** : `%APPDATA%\rafiki-paie` (`C:\Users\<Compte>\AppData\Roaming\rafiki-paie`)

---

## 2. Tableau d'Évaluation des Critères d'Acceptation

|   N°   | Critère d'acceptation                                                                                                |   Statut   | Preuve / Justification                                                                                                                                                                                                                        |
| :----: | -------------------------------------------------------------------------------------------------------------------- | :--------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Fichier produit `Starclip-Setup-<version>.exe`, métadonnées et propriétés affichant « Starclip » et la bonne version | **Réussi** | Fichier `Starclip-Setup-0.1.0.exe` généré. Propriétés Windows : `ProductName: Starclip`, `CompanyName: Starclip`, `LegalCopyright: © 2026 Starclip`, `ProductVersion: 0.1.0`.                                                                 |
| **2**  | Installeur en français, installation sans droits administrateur, raccourcis et lancement                             | **Réussi** | Configuré en mode `oneClick: false, perMachine: false, allowToChangeInstallationDirectory: true`. Script NSIS avec macros françaises `MUI_LANGUAGE "French"`. Raccourcis Bureau et Menu Démarrer créés sous `Programs\starclip`.              |
| **3**  | Application installée fonctionnelle : page stylée, `window.api` défini, titre « Starclip »                           | **Réussi** | Validation par test Playwright sur `Starclip.exe` empaqueté (`windowApiDefined: true`, 12 clés IPC répertoriées, titre `Starclip - Gestionnaire de paie`, capture `docs/decisions/captures/preuve-import-succes.png`).                        |
| **4**  | Désinstallation préservant la base et les sauvegardes ; réinstallation retrouvant les données                        | **Réussi** | Dossier `userData` situé dans `%APPDATA%\rafiki-paie`, non ciblé par la désinstallation NSIS du dossier programme `%LOCALAPPDATA%\Programs\starclip`. Réouverture immédiate de la base SQLite et des sauvegardes sans perte.                  |
| **5**  | Dossier `userData` identique avant et après renommage                                                                | **Réussi** | Verrouillé de manière permanente sur `rafiki-paie` dès `main/index.ts` via `app.setPath('userData', path.join(app.getPath('appData'), 'rafiki-paie'))`.                                                                                       |
| **6**  | Mises à jour : détection, téléchargement tâche de fond, notification, redémarrage propre, sauvegarde « avant-maj »   | **Réussi** | Orchestré par `UpdateService` (`electron-updater`). Écoute silencieuse après 12s, notification sonner avec options « Redémarrer et installer » / « Plus tard », fermeture sans perte et copie `rafiki_paie_avant-maj-<version>.sqlite` créée. |
| **7**  | Refus d'une base plus récente que l'application (`BASE_TROP_RECENTE`) sans altération                                | **Réussi** | Validé par test unitaire `apps/desktop/tests/migrator.test.ts`. Dialogue natif explicatif et fermeture sécurisée sans toucher aux données.                                                                                                    |
| **8**  | Instance unique (second lancement ramène la fenêtre existante)                                                       | **Réussi** | Validé par `app.requestSingleInstanceLock()` dans `main/index.ts`. Focus automatique de la fenêtre principale existante si second lancement.                                                                                                  |
| **9**  | Workflow de release automatique, `CHANGELOG.md`, `docs/RELEASE.md`, `SHA256SUMS.txt`, rien publié sans demande       | **Réussi** | Workflow `.github/workflows/release.yml` créé. Fichiers `CHANGELOG.md` et `docs/RELEASE.md` rédigés. Script `scripts/generate-checksums.mjs` testé et validé. Aucun tag poussé.                                                               |
| **10** | Validation des tests de régression (`typecheck`, `lint`, `format:check`, tests calcul, desktop, web)                 | **Réussi** | 100% conformes : calcul (4/4), desktop (86/86 dont parité des canaux), web (54/54).                                                                                                                                                           |
| **11** | Rapport et documentation                                                                                             | **Réussi** | Rapport formalisé dans ce document avec guide utilisateur dans `docs/INSTALLATION-ECOLE.md`.                                                                                                                                                  |

---

## 3. Limites Connues et Points d'Attention

1. **Absence de certificat de signature de code (Code Signing)** :
   - En l'absence d'un certificat payant EV/OV, Windows SmartScreen affichera l'avertissement bleu « Windows a protégé votre ordinateur ». Le guide utilisateur `docs/INSTALLATION-ECOLE.md` documente précisément la démarche (« Informations complémentaires » puis « Exécuter quand même »).
2. **Cloisonnement des données par session Windows** :
   - Comme l'installation est locale à l'utilisateur (`perMachine: false`), les données sont logées dans le profil Windows connecté. L'école doit toujours utiliser la même session utilisateur pour administrer la paie.
