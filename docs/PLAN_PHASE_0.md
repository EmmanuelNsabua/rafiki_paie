# Plan d'exécution — Phase 0 : Fondations du logiciel de paie de l'École Rafiki

## Objectif

Mettre en place le monorepo, installer et figer les dépendances exactes, configurer les socles techniques (Web, Desktop, API, Moteur de calcul), tester la parité de calcul sur vecteurs partagés et préparer la configuration de déploiement (Render, Supabase, Vercel, CI).

---

## 1. Étapes d'exécution

### Étape 0 : Analyse et synthèse du classeur (TERMINÉE)

- Lecture des annexes (`01-manuel`, `02-classeur`, `03-conception`, `04-prototype`).
- Analyse exacte des formules et anomalies confirmées dans `docs/decisions/00-synthese-classeur.md`.

### Étape 1 : Audit et installation de l'environnement (EN COURS)

- Node.js LTS (v26.13.0) & npm (v11.20.0), Git (v2.56.0).
- PHP 8.3 (v8.3.36) & extensions requises (`pdo_pgsql`, `pdo_sqlite`, `mbstring`, `openssl`, `curl`, `fileinfo`, `zip`, `intl`).
- Composer & variables d'environnement PATH.
- Figer `.nvmrc` et `engines` dans `package.json`.
- Note Docker Desktop (optionnel : absent, image testée via Dockerfile validé).

### Étape 2 : Monorepo npm workspaces & Git

- Initialiser la structure de répertoires :
  - `apps/web` (Next.js 15, Tailwind CSS, shadcn/ui)
  - `apps/desktop` (Electron, better-sqlite3, tsup, electron-builder)
  - `apps/api` (Laravel 11, Sanctum, brick/math)
  - `packages/calcul` (TypeScript, decimal.js, vitest)
  - `packages/config` (configs partagées tsconfig, eslint, prettier)
  - `supabase/`, `.github/workflows/`, `docs/decisions/`
- Configuration racine `package.json` avec scripts unifiés (`typecheck`, `lint`, `format:check`, `test:calcul`, `dev:web`, `dev:desktop`, `build:web`, `build:desktop`).
- Initialisation Git et premier commit.

### Étape 3 : Installation des dépendances avec versions exactes

- Interroger `npm view` et Composer pour chaque dépendance afin de figer les versions strictes.
- Installer les dépendances dans chaque workspace.
- Initialiser shadcn/ui dans `apps/web` avec les composants requis (`button`, `input`, `label`, `select`, `switch`, `sheet`, `dialog`, `table`, `sonner`, `form`).
- Configurer les thèmes CSS clair / sombre selon les spécifications.

### Étape 4 : Socle technique minimal et vérifiable

- `packages/calcul` : moteur de calcul décimal (`decimal.js`), vecteurs de test (`vecteurs.json`), suite de tests Vitest.
- `apps/api` : moteur de calcul PHP (`brick/math`) validé sur le même fichier `vecteurs.json`, route de santé `/api/health`, Sanctum configuré.
- `apps/web` : interface provisoire avec composant shadcn et intégration IPC.
- `apps/desktop` : processus principal Electron, preload sécurisé (`contextBridge`), initialisation de la base SQLite et gestionnaire IPC `db:ping`.

### Étape 5 : Déploiement et intégration continue

- `apps/api/Dockerfile` (PHP 8.3-fpm/cli, Nginx/Caddy ou artisan/built-in, lecture de `$PORT`).
- `render.yaml` pour l'API sur Render.
- `supabase/README.md` et `supabase/durcissement.sql`.
- Configuration Vercel et documentation dans `README.md`.
- Fichiers `.env.example` sans secrets pour chaque application.
- `.github/workflows/ci.yml`.

### Étape 6 : Règles du projet pour les agents et documentation

- `AGENTS.md` complet et `GEMINI.md` de redirection.
- Rapport final dans `docs/decisions/01-rapport-phase-0.md`.
