# Prompt Antigravity — Installation : installeur Windows « Starclip », mises à jour, publication

## 1. Mission

L'application desktop doit pouvoir être **installée sur les PC de l'école avec un seul fichier**, puis **mise à jour sans intervention technique**. **Le nom de l'application est désormais « Starclip »** (décision du client, elle remplace « Gestionnaire de paie » partout où Windows et l'application affichent le nom du programme). Le nom, la version et les métadonnées doivent figurer dans le fichier d'installation, dans le programme installé et dans les raccourcis.

Livrables :

1. un installeur Windows `.exe` (NSIS, via `electron-builder`) nommé avec le produit et la version ;
2. des mises à jour automatiques via `electron-updater` et GitHub Releases, sans jamais interrompre une saisie ni risquer les données ;
3. un circuit de publication reproductible (procédure et workflow GitHub Actions) ;
4. un guide d'installation en français pour l'école.

**Hors périmètre** : signature de code (pas de certificat pour l'instant), Microsoft Store, `.msi`, `.iso`, installeur portable, macOS et Linux.

## 2. Références et prérequis

- Lis `AGENTS.md`, `docs/decisions/` et les prompts précédents (phase 2, densité et fenêtre) : le **protocole de fermeture sans perte** (`avant-fermeture`, attente de 2 s), la **sauvegarde locale** (`SauvegardeService`), les **migrations** et les **fusibles Electron** existent déjà ou sont en cours ; réutilise-les, ne les réécris pas.
- Prérequis, à vérifier à l'étape 0 : `npm run build:desktop` produit `win-unpacked`, l'application empaquetée s'affiche stylée (`app://`), `window.api` est défini, `test:desktop` et `test:e2e` sont verts. S'il manque quelque chose, arrête-toi et signale-le.
- **Preuve par le rendu** : toute vérification de l'application installée se prouve par une capture ou un journal venant du processus de rendu (Playwright), jamais seulement par le processus principal. Ne marque « réussi » que ce que tu as exécuté ; sinon « non testé » et pourquoi.

## 3. Identité de l'application

| Élément                                   | Valeur                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nom du produit (`productName`)            | **Starclip**                                                                                                                                           |
| Identifiant d'application (`appId`)       | `com.starclip.paie` — **permanent** : le changer casserait les mises à jour et les raccourcis. Demande confirmation à l'utilisateur avant de le figer. |
| Nom de l'exécutable                       | `Starclip.exe`                                                                                                                                         |
| Fichier d'installation                    | `Starclip-Setup-${version}.exe` (sans espace, casse exactement comme écrit)                                                                            |
| Fichiers de publication                   | `Starclip-Setup-${version}.exe.blockmap`, `latest.yml`, `SHA256SUMS.txt`                                                                               |
| Version                                   | **Celle de `apps/desktop/package.json`**, au format `MAJEUR.MINEUR.CORRECTIF` (source unique). Ne l'invente pas : lis-la.                              |
| Description                               | « Starclip — Gestionnaire de paie École Rafiki »                                                                                                       |
| Société et droits                         | `CompanyName` : « Starclip » ; `LegalCopyright` : « © 2026 Starclip » ; à confirmer par l'utilisateur                                                  |
| Raccourcis                                | « Starclip » sur le Bureau et dans le menu Démarrer                                                                                                    |
| Programmes installés (Paramètres Windows) | Nom « Starclip », éditeur « Starclip », version, icône                                                                                                 |
| Identifiant de barre des tâches           | `app.setAppUserModelId("com.starclip.paie")`                                                                                                           |

**Dans l'application** : le titre de la fenêtre, le `<title>` de la page, la barre de titre personnalisée et les boîtes de dialogue affichent **« Starclip »**. Le bloc de marque de la barre latérale (« École Rafiki » avec « Gestionnaire de paie » en dessous) **ne change pas** : c'est le nom du module et de l'école.

**Icône.** Utilise le logo dans l'application @./app/web/public/icon-starclip* isolée dans **un seul fichier source** `build/icon-source.svg`, et génère `build/icon.ico` (tailles 16, 24, 32, 48, 64, 128, 256 dans le même fichier). Remplacer le logo plus tard ne doit demander que de changer ce fichier source et de relancer un script `npm run build:icons`.

**Dossier de données — règle absolue.** Changer le nom du produit change le dossier `userData` par défaut, donc la base de données deviendrait introuvable. **Relève le chemin `userData` actuel** (note-le dans le rapport) et **conserve-le tel quel** avec `app.setPath("userData", …)` : il reste un détail technique stable, indépendant du nom de la marque. S'il n'est pas déjà fixé, fixe-le au dossier utilisé par la version actuelle. **Aucune migration, aucun déplacement de données.** Prouve-le par un test (voir 5).

## 4. Décisions arrêtées

### 4.1 Installeur (NSIS)

- Cible : **Windows 10 et 11, 64 bits** (`win.target: nsis`, `arch: x64`). Electron ne prend plus en charge Windows 7 ni 8 ; indique-le dans le guide. N'ajoute `ia32` que si l'utilisateur le demande.
- Installation **par utilisateur**, sans droits d'administrateur : `perMachine: false`, `requestedExecutionLevel: asInvoker`, dossier par défaut `%LOCALAPPDATA%\Programs\Starclip`.
- Assistant en français : `oneClick: false`, `allowToChangeInstallationDirectory: true`, `createDesktopShortcut: true`, `createStartMenuShortcut: true`, `shortcutName: "Starclip"`, `runAfterFinish: true`. **L'installeur ne doit jamais s'afficher en anglais** : règle la langue en français (consulte la documentation d'`electron-builder` pour l'option exacte) et prouve-le par capture.
- **`deleteAppDataOnUninstall: false`** : désinstaller n'efface **jamais** la base ni les sauvegardes. Ajoute une ligne au guide qui le précise.
- `compression: "maximum"` (les connexions de l'école peuvent être lentes), `asar: true`, `electronLanguages: ["fr", "en-US"]`, exclusion du code de test, de la documentation et des sources du paquet.
- Métadonnées de l'exécutable et de l'installeur (`ProductName`, `FileDescription`, `ProductVersion`, `FileVersion`, `CompanyName`, `LegalCopyright`, icône) conformes à la section 3, **vérifiées par lecture des propriétés du fichier** (voir 5).
- **Instance unique** : `app.requestSingleInstanceLock()` ; un second lancement ramène la fenêtre existante au premier plan (deux instances sur la même base SQLite sont interdites, et l'installeur de mise à jour exige que l'application soit fermée).
- **Pas de signature pour l'instant**, mais le code est prêt : `win.verifyUpdateCodeSignature: false` tant que les installeurs ne sont pas signés, avec un commentaire expliquant qu'il faudra le passer à `true` dès qu'un certificat existera. Documente dans le rapport que, sans signature, l'authenticité d'une mise à jour repose sur HTTPS et la somme `sha512` de `latest.yml`.
- Fusibles Electron (`@electron/fuses`, hook `afterPack`) : conserve ceux déjà prévus ; l'installeur doit continuer à fonctionner avec eux.

### 4.2 Mises à jour automatiques (`electron-updater`)

- Fournisseur `github`, canal stable uniquement (`allowPrerelease: false`).
- Seulement dans l'application **empaquetée** ; jamais en développement.
- Vérification **10 à 15 secondes après le démarrage**, en tâche de fond, **sans jamais bloquer l'interface**. **Hors ligne ou erreur réseau : silence total** (journal technique sans donnée personnelle), aucune fenêtre d'erreur.
- **Téléchargement en arrière-plan** (les mises à jour différentielles du fichier `.blockmap` réduisent le volume). Quand il est terminé, une **notification dans l'interface** (composant `sonner`) : « Starclip 0.x.y est prête. » avec les boutons **« Redémarrer et installer »** et **« Plus tard »**. `autoInstallOnAppQuit: true` : si l'utilisateur ne fait rien, la mise à jour s'installe à la fermeture suivante.
- **Jamais de redémarrage forcé.** L'installation ne se déclenche qu'après le protocole de fermeture sans perte existant (enregistrements en attente terminés, jusqu'à 2 s).
- **Sauvegarde avant mise à jour** : avant d'installer, crée une copie de la base nommée `…_avant-maj-<version>.sqlite` (service de sauvegarde existant), exclue de la rotation à 10 fichiers pendant 30 jours.
- **Protection du schéma** : au démarrage, si la base contient une migration inconnue de cette version (installation d'une version plus ancienne par erreur), l'application **refuse d'ouvrir la base** et affiche un écran clair en français (« Cette version de Starclip est plus ancienne que vos données. Installez la dernière version. ») sans rien modifier. Si une migration **échoue**, l'application n'écrit rien, conserve la copie « avant-maj » et affiche un écran d'erreur clair.
- Dans le menu du logo (section « Application », s'il existe) : ligne **« Rechercher une mise à jour »** et état (« Starclip 0.x.y — à jour », « Téléchargement en cours… », « Prête à installer »). Un clic déclenche la vérification manuelle.

### 4.3 Publication (GitHub Releases)

- Les fichiers de publication sont ceux de la section 3, attachés à une **release GitHub** dont le tag est `v${version}`.
- **Option A, par défaut : la release est publiée dans le dépôt actuel** (`rafiki_paie`, public), ce qui ne demande **aucun secret** : le workflow utilise le `GITHUB_TOKEN` fourni. **Option B : un dépôt public dédié aux binaires** (par exemple `starclip-releases`), qui garde le code privé mais demande un jeton personnel enregistré comme secret `RELEASES_TOKEN`. Le passage de A à B ne doit demander que de changer `owner` et `repo` dans la configuration. **L'utilisateur doit choisir avant toute publication** : tant qu'il n'a pas confirmé, ne publie rien (`--publish never`) et laisse les mises à jour désactivées dans le build.
- **Aucun jeton ni secret dans l'application**, ni dans le dépôt, ni dans l'installeur.
- Workflow `.github/workflows/release.yml`, déclenché par un tag `v*.*.*` : runner `windows-latest`, `npm ci`, `typecheck`, `lint`, `test:calcul`, `test:web`, `test:desktop`, build de l'interface et du desktop, `electron-builder --win nsis --publish always`, génération de `SHA256SUMS.txt`, notes de release tirées de `CHANGELOG.md`. **Un échec de test empêche toute publication.**
- `CHANGELOG.md` en français (« Journal des versions »), une section par version, écrite pour une utilisatrice non technique (« Nouveau », « Amélioré », « Corrigé »).
- Procédure `docs/RELEASE.md` : changer la version, mettre à jour le journal, créer le tag, vérifier les fichiers de la release, **installer sur un poste de test avant de prévenir l'école**.

## 5. Étapes et preuves

Avant chaque lot, écris un plan court. Un commit par étape. **À la fin d'un lot, arrête-toi et rapporte.**

### Lot 1 — Identité et installeur local (étapes 0 à 3)

0. **Prérequis** (section 2) et relevé du chemin `userData` actuel.
1. **Identité** : `productName`, `appId`, `executableName`, `artifactName`, métadonnées, icône (`build:icons`), titre de fenêtre, barre de titre, `<title>`, instance unique, `setAppUserModelId`. Version lue depuis le `package.json`.
2. **Configuration `electron-builder`** (section 4.1), scripts `npm run dist:desktop` (build complet + installeur) et `npm run dist:desktop:dir` (dossier non empaqueté).
3. **Tests d'installation sur la machine**, sans toucher aux dossiers de l'utilisateur :
   - construis l'installeur ; vérifie son **nom** exact (`Starclip-Setup-<version>.exe`) et ses **propriétés** (lecture de `VersionInfo` : ProductName, FileDescription, ProductVersion, CompanyName, LegalCopyright) ;
   - installe **en silence** dans un dossier temporaire (`/S` avec `/D=`), puis vérifie : `Starclip.exe` présent et ses propriétés, raccourcis « Starclip » créés, entrée « Starclip » dans la liste des programmes (nom, éditeur, version, icône) ;
   - lance l'application **installée** avec Playwright (`_electron.launch({ executablePath })`) : titre « Starclip », page stylée, `window.api` défini, `db:ping` répond, capture du rendu ;
   - **désinstalle en silence** : le programme disparaît, **la base et les sauvegardes restent** ; **réinstalle** : les données sont retrouvées (une opération créée avant la désinstallation est visible après) ;
   - capture de l'assistant d'installation **en français**.

### Lot 2 — Mises à jour (étapes 4 à 6)

4. **`electron-updater`** et son interface (4.2) : vérification en arrière-plan, notification, « Redémarrer et installer », « Plus tard », entrée du menu du logo, état des mises à jour.
5. **Sauvegarde avant mise à jour** et **protection du schéma** (migration inconnue ou en échec) avec leurs écrans.
6. **Test de mise à jour de bout en bout, en local** : construis deux versions de test (par exemple `0.0.1` et `0.0.2`) avec un fournisseur `generic` pointant sur `http://127.0.0.1:<port>` (variante de configuration réservée aux tests, jamais publiée) ; sers le dossier avec un serveur statique ; installe la `0.0.1`, crée des données, lance : la mise à jour est détectée, téléchargée, la notification s'affiche (capture du rendu) ; « Redémarrer et installer » relance l'application en `0.0.2` **avec les données intactes**, et une copie `…_avant-maj-0.0.2.sqlite` existe. Teste aussi : serveur arrêté (aucune erreur visible), et saisie en cours au moment du redémarrage (la valeur est enregistrée). Si ce test est impossible dans ton environnement, écris « non testé », explique pourquoi et rédige la procédure manuelle.

### Lot 3 — Publication et documentation (étapes 7 et 8)

7. **Workflow de release**, `CHANGELOG.md`, `docs/RELEASE.md`, script de somme de contrôle `SHA256SUMS.txt`. **Ne publie rien** et ne crée pas de tag : l'utilisateur déclenchera la première release. Vérifie le workflow par une exécution à blanc (`--publish never`) et par un contrôle de syntaxe.
8. **Guide d'installation pour l'école** `docs/INSTALLATION-ECOLE.md`, en français, sans jargon, avec une capture par étape : téléchargement du fichier, **écran bleu « Windows a protégé votre ordinateur »** (« Informations complémentaires », puis « Exécuter quand même »), assistant d'installation, premier lancement, où se trouvent les données, comment la mise à jour se fait, comment désinstaller sans perdre les données, que faire si l'antivirus bloque le fichier, comment vérifier la somme `SHA256`. **Précise que les données sont rangées par compte Windows** : il faut toujours ouvrir la même session. Termine par la configuration minimale (Windows 10 ou 11, 64 bits).
   Puis rédige `docs/decisions/rapport-installation.md`.

## 6. Règles de travail

- PowerShell, Windows 11. Versions exactes vérifiées avant installation (`npm view`), jamais devinées.
- Aucun secret dans le dépôt, l'installeur ou les journaux. Ne publie pas de release et ne crée pas de tag sans demande explicite de l'utilisateur.
- Ne modifie pas `docs/annexes/`. Ne change pas le domaine ni les règles métier.
- Si une consigne est impossible ou risquée, signale-le avec une alternative plutôt que de la contourner en silence.
- À la fin d'un lot, arrête-toi.

## 7. À confirmer par l'utilisateur (demande-le avant l'étape concernée)

1. **Identifiant `com.starclip.paie`** (permanent) : étape 1.
2. **Société et droits** (« Starclip », « © 2026 Starclip ») : étape 1.
3. **Dépôt de publication** : option A (dépôt actuel) ou B (dépôt dédié) : avant l'étape 7.
4. **Version de Windows et architecture des PC de l'école** : 64 bits sous Windows 10 ou 11 ? Si certains PC sont plus anciens, il faudra traiter la compatibilité avant de poursuivre.

## 8. Critères d'acceptation

1. Le fichier produit s'appelle `Starclip-Setup-<version>.exe` ; ses propriétés, celles de `Starclip.exe` installé, les raccourcis et l'entrée de la liste des programmes affichent « Starclip » et la bonne version.
2. L'installeur s'affiche en français, s'installe **sans droits d'administrateur**, crée les raccourcis et lance l'application.
3. L'application **installée** affiche une page stylée, `window.api` est défini, le titre est « Starclip » (preuves par capture du rendu).
4. Désinstaller conserve la base et les sauvegardes ; réinstaller les retrouve (test).
5. Le dossier `userData` est identique avant et après le renommage (test).
6. Mise à jour de bout en bout : détection, téléchargement, notification, installation au redémarrage, données intactes, copie « avant-maj » créée ; hors ligne : aucune erreur visible ; aucun redémarrage forcé.
7. Une base plus récente que l'application est refusée avec un message clair, sans modification.
8. Un second lancement ramène la fenêtre existante (instance unique).
9. Le workflow de release existe, ne publie qu'après des tests verts, et **rien n'a été publié** ; `CHANGELOG.md`, `docs/RELEASE.md` et `docs/INSTALLATION-ECOLE.md` sont fournis.
10. `typecheck`, `lint`, `format:check`, `test:calcul`, `test:web`, `test:desktop`, `test:e2e` verts.
11. Rapport `docs/decisions/rapport-installation.md` : chaque critère marqué réussi, échoué ou non testé, avec sa preuve, le chemin `userData` retenu, les limites connues (absence de signature, données par compte Windows) et les points à confirmer encore ouverts.
