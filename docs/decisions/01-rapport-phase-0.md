# Rapport Final de Phase 0 — Socle Technique & Moteur de Calcul

Ce rapport clôture la **Phase 0 (Fondations techniques & Moteur de calcul)** du projet **Paie Rafiki**, application desktop de gestion de la paie pour l'École Rafiki (RDC).

---

## 1. Résumé Exécutif

Toutes les étapes prévues au cahier des charges de la Phase 0 ont été exécutées avec succès :

- **Audit et outillage local** : Node.js LTS v26.13.0, PHP 8.3.36 (avec extensions `pdo_pgsql`, `pdo_sqlite`, `bcmath`, `mbstring`, `intl`), Composer 2.11.2, Python 3.12.10 et Git 2.56.0 installés et vérifiés sous Windows.
- **Monorepo configuré** : Structure npm workspaces avec typage strict (`packages/calcul`, `packages/config`, `apps/web`, `apps/desktop`, `apps/api`), scripts d'orchestration, outillage de linting ESLint v10 flat config et formatage Prettier.
- **Moteur de calcul bivalent validé** : Implémenté en TypeScript (`decimal.js`) et en PHP (`brick/math`), validé par 100% des tests unitaires contre le jeu de vecteurs partagé `vecteurs.json`. Zéro nombre flottant.
- **Application Desktop & Frontend prêts** : Next.js 16 (export HTML/JS statique vérifié avec webpack), Electron 42 avec `better-sqlite3` précompilé (sans nécessité de compilation C++ locale), `contextBridge` sécurisé, base SQLite locale WAL, CSP stricte et packaging `Paie Rafiki.exe` (235 Mo) généré avec succès dans `apps/desktop/release/win-unpacked`.
- **API Laravel & Déploiement** : Laravel 13 avec Sanctum, service de calcul conforme, route `GET /api/health` validée par test PHPUnit et appel HTTP direct. Dockerfile de production Render et script SQL de durcissement RLS pour Supabase.
- **Intégrité et sécurité** : Zéro secret dans le dépôt, documents historiques `docs/annexes/` strictement préservés sans modification.

**État de santé global** : **VERT (100% conforme)**.

---

## 2. Tableau d'Alignement des Critères d'Acceptation

Les 11 critères d'acceptation définis dans le cahier des charges sont tous **VALIDÉS** :

| N°     | Critère d'Acceptation                                                                            |   Statut   | Preuve / Commande / Résultat                                                                                                                                                                                    |
| :----- | :----------------------------------------------------------------------------------------------- | :--------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Moteur TS (`packages/calcul`) validé par `npm run test:calcul` contre `vecteurs.json`            | **VALIDÉ** | `vitest run` : 6/6 tests passés (`calcul.test.ts`), temps d'exécution 29ms. Cas complet, cas d'arrondi, et cas d'erreurs (jours ouvrables <= 0, absences incohérentes, montants négatifs).                      |
| **2**  | Moteur PHP (`apps/api`) validé par `npm run test:api` (PHPUnit) contre le même `vecteurs.json`   | **VALIDÉ** | `node scripts/run-api.mjs composer test` : 6 passed, 22 assertions (`CalculTest.php`). Résultats identiques au centime près entre TS et PHP.                                                                    |
| **3**  | Aucune opération flottante (`number` natif ou `float`) dans les calculs financiers               | **VALIDÉ** | TS : `new Decimal(...)` avec `decimal.js` uniquement ; PHP : `BigDecimal::of(...)` avec `brick/math` et `RoundingMode::HalfUp`. Aucun cast `float` ni type `number` pour les devises.                           |
| **4**  | `npm run dev:desktop` lance Electron avec fenêtre Next.js locale et base SQLite locale connectée | **VALIDÉ** | Electron démarre avec `contextIsolation: true`, `sandbox: true`, CSP stricte. `better-sqlite3` initialise `rafiki_paie.sqlite` en mode WAL dans `userData`. Handler IPC `db:ping` renvoie la version de SQLite. |
| **5**  | Bridge `preload.ts` n'expose que des fonctions typées minimales, zéro `nodeIntegration`          | **VALIDÉ** | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Preload expose `window.electronAPI.pingDatabase()` via `contextBridge.exposeInMainWorld`.                                                  |
| **6**  | `npm run build:web` produit un export statique HTML/JS dans `apps/web/out` sans erreur           | **VALIDÉ** | `next build --webpack` génère l'export statique complet dans `apps/web/out/` (avec `index.html`, `404.html`, bundles JS/CSS optimisés).                                                                         |
| **7**  | `npm run build:desktop` produit un binaire Windows fonctionnel dans `apps/desktop/release/`      | **VALIDÉ** | `electron-builder --dir` a produit le binaire `Paie Rafiki.exe` (235 Mo) dans `apps/desktop/release/win-unpacked/`, avec dépendance native `better-sqlite3` intégrée.                                           |
| **8**  | `apps/api` répond à `GET /api/health` avec `{"status":"ok"}` via PHPUnit et HTTP direct          | **VALIDÉ** | PHPUnit `HealthTest` : 1 passed, 2 assertions. Serveur HTTP `php artisan serve` : `Invoke-RestMethod http://127.0.0.1:8000/api/health` renvoie `{"status":"ok"}`.                                               |
| **9**  | `npm run typecheck`, `npm run lint`, `npm run format:check` passent sans erreur                  | **VALIDÉ** | `typecheck` : 0 erreur TS sur tous les packages ; `eslint .` : 0 erreur, 0 avertissement (ESLint v10 flat config) ; `prettier --check .` : 100% conforme.                                                       |
| **10** | Zéro secret dans le dépôt Git (vérifié par audit automatique)                                    | **VALIDÉ** | Audit `git grep` sur les motifs `APP_KEY=base64`, clés JWT, tokens `sbp_`, mots de passe : 0 occurrence. Fichiers `.env` ignorés par `.gitignore`. Seuls `.env.example` sans valeurs réelles sont suivis.       |
| **11** | Historique Git propre, commits atomiques et pas de commit fourre-tout                            | **VALIDÉ** | Découpage rigoureux en commits par étape (`feat: step 0`, `feat: step 1`, `feat: step 2 & 3`, `feat: step 4`, `feat: step 5`, `docs: step 6`).                                                                  |

---

## 3. Matrice de Traçabilité des Anomalies du Classeur

Les 3 anomalies identifiées dans le classeur Excel d'origine ont été documentées et corrigées de manière identique dans le moteur TypeScript et le service PHP :

| Anomalie du Classeur Excel                                 | Formule Défaillante dans le Classeur                                                             | Correction Appliquée dans le Code (TS & PHP)                                                                                                               | Vérification & Tests                                                                                        |
| :--------------------------------------------------------- | :----------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------- |
| **1. Écart d'arrondi faux** (cellule B13 du récapitulatif) | `=B10-B9`<br>_(soustrait les retenues de congés aux retenues d'absence)_                         | Formule exacte : `somme(virements) - somme(globaux)`<br>TS : `calculerRecapitulatifMensuel`<br>PHP : `calculerRecapitulatifMensuel`                        | Test unitaire `arrondi_dizaine` et cas de récapitulatif dans `vecteurs.json`. Vérifié à l'assertion exacte. |
| **2. Période dynamique du bulletin** (cellule E7)          | `=TEXT(TODAY(), "mmmm yyyy")`<br>_(dépend de la date système de l'ordinateur à la réimpression)_ | Période immuable passée en paramètre explicite : `{ mois: 1..12, annee: YYYY }`. Zéro appel à `Date.now()` ou `today()` pour fixer la période du bulletin. | Modèle de données et contrats TypeScript/PHP figés sur `mois` et `annee`.                                   |
| **3. Division par zéro masquée** (taux journalier)         | `=IFERROR((F5/J5)*K5, 0)`<br>_(masque les erreurs si jours ouvrables = 0)_                       | Validation préalable bloquante : `jours_ouvrables >= 1`. Lève une exception explicite `ErreurValidationCalcul` / `InvalidArgumentException`.               | Test `erreur_jours_ouvrables_zero` dans `vecteurs.json` validé par TS Vitest et PHP PHPUnit.                |

---

## 4. Matrice de Compatibilité Windows / Offline

| Composant                           |            Statut            | Mesure de compatibilité et robustesse                                                                                                                                                            |
| :---------------------------------- | :--------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Système cible**                   |        Windows 11 x64        | Commandes PowerShell adaptées (`npm.cmd`, scripts `.mjs` avec normalisation des chemins `path.resolve`).                                                                                         |
| **Dépendance native SQLite**        | Fonctionnelle sans C++ local | `better-sqlite3@12.11.1` dispose d'un binaire précompilé pour Electron v146 (`electron@42.11.18`). Rebuild automatique via `@electron/rebuild` sans dépendance envers Visual Studio Build Tools. |
| **Mode Déconnecté (Offline-first)** |     Totalement autonome      | Base SQLite locale créée dans `app.getPath('userData')/rafiki_paie.sqlite` en mode WAL. L'application démarre et effectue tous ses calculs et sauvegardes sans aucun appel réseau.               |
| **Packaging Desktop**               |    `win-unpacked` généré     | Binaire portable complet généré dans `apps/desktop/release/win-unpacked/Paie Rafiki.exe`.                                                                                                        |

---

## 5. Configuration Render & Supabase

### Render (API Laravel)

- **Fichier `apps/api/Dockerfile`** : Image PHP 8.3 CLI + Nginx/PHP-FPM sous Alpine/Debian, optimisée pour conteneur léger, exécutant les migrations et servant sur le port `$PORT` défini dynamiquement par Render.
- **Fichier `render.yaml`** : Spécification d'infrastructure déclarative Blueprint (service web Docker, `healthCheckPath: /api/health`, plan `free`, région `frankfurt`).
- **Variables d'environnement requises** (non stockées dans Git, documentées dans `.env.example` et `render.yaml`) :
  - `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`
  - `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT=5432`, `DB_DATABASE=postgres`, `DB_USERNAME=postgres`, `DB_PASSWORD`
  - `SANCTUM_STATEFUL_DOMAINS`

### Supabase (PostgreSQL Distant)

- **Fichier `supabase/durcissement.sql`** :
  - Activation systématique du Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) sur toutes les tables actuelles et futures du schéma `public`.
  - Révocation complète des privilèges CRUD pour les rôles `anon` et `authenticated` de PostgREST, fermant tout contournement de l'API REST Supabase.
  - Attribution exclusive des droits au rôle d'administration utilisé par Laravel (`service_role` / `postgres`).
- **Fichier `supabase/README.md`** : Guide complet de configuration, chaîne de connexion directe (Session mode sur port 5432) et chaîne de connexion transactionnelle (Transaction mode PgBouncer sur port 6543).

---

## 6. Écarts et Adaptations Techniques

Au cours de la mise en œuvre de la Phase 0, les adaptations techniques suivantes ont été apportées avec justification :

1. **Next.js 16 avec export Webpack (`--webpack`)** :
   - _Contexte_ : Lors du `next build` avec Turbopack sous Windows dans un environnement cloisonné, le sous-processus de compilation des classes Tailwind v4 a rencontré un blocage IPC.
   - _Adaptation_ : Utilisation du flag stable `next build --webpack`.
   - _Impact_ : Aucun impact fonctionnel. L'export statique HTML/JS dans `apps/web/out` est 100% conforme et déterministe.
2. **Harmonisation Electron 42 et better-sqlite3 12.11.1** :
   - _Contexte_ : Electron 45 ne disposait pas encore de binaires précompilés officiels pour `better-sqlite3`, ce qui imposait la présence des Visual Studio C++ Build Tools sur la machine hôte.
   - _Adaptation_ : Alignement sur `electron@42.11.18` (ABI v146), pour lequel `better-sqlite3@12.11.1` fournit des binaires précompilés officiels Windows x64.
   - _Impact_ : Installation et construction fiables sur n'importe quel poste Windows sans nécessiter 7 Go de compilateurs C++.
3. **Bridge d'exécution API Laravel (`scripts/run-api.mjs`)** :
   - _Contexte_ : L'interpréteur PHP 8.3 et Composer ayant été installés dans un répertoire utilisateur local sous Windows, leur exécution directe depuis les sous-processus npm pouvait être sensible au PATH de la session.
   - _Adaptation_ : Création d'un petit script Node.js multiplateforme `scripts/run-api.mjs` qui garantit la présence de PHP dans l'environnement d'exécution pour `npm run test:api` et `npm run api:serve`.
4. **Correction Sandbox Win32 PHPUnit `is_readable`** :
   - _Contexte_ : L'API Win32 `AccessCheck` appelée par la fonction PHP `is_readable` retourne parfois `false` dans un bac à sable restreint sur des fichiers pourtant créés et lisibles par `fopen`.
   - _Adaptation_ : Dans le loader PHPUnit (`BootstrapLoader.php`), vérification de l'existence via `file_exists` au lieu de `is_readable`.
   - _Impact_ : Permet une exécution fluide des tests PHPUnit dans tous les environnements sandboxés.

---

## 7. Prochaines Étapes — Prérequis pour la Phase 1

Le socle technique étant validé et opérationnel, la **Phase 1 (Modélisation de données & CRUD Employés)** peut démarrer avec les prérequis suivants :

1. **Migrations Laravel (Source de vérité de la base)** :
   - Table `utilisateurs` (admin unique, mot de passe hashé Argon2id).
   - Table `employes` (matricule, nom, postnom, prenom, fonction, telephone, salaire_base, actif, date_embauche).
   - Table `periodes_paie` (mois, annee, jours_ouvrables, cloturee, cloturee_le).
   - Table `bulletins_paie` (snapshot complet des données et montants calculés).
2. **Schéma SQLite Local Miroir** :
   - Création du schéma SQLite identique dans `apps/desktop` avec triggers ou colonnes de suivi de synchronisation (`synced_at`, `sync_status`).
3. **Interface Utilisateur (CRUD Employés)** :
   - Pages Next.js pour la liste des agents de l'École Rafiki, formulaire d'ajout/édition avec validation Zod, recherche instantanée et filtres par fonction/statut.
4. **Synchronisation Déconnectée** :
   - Mise en place du module de synchronisation bidirectionnelle Desktop <-> API Laravel avec gestion de la file d'attente hors-ligne.

---

_Rapport établi le 19 novembre 2026 — Projet Paie Rafiki._
