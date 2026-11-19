# Paie Rafiki

Logiciel de paie de l'École Rafiki (RDC), conçu selon les principes du **Local d'abord** (_local-first_) pour fonctionner intégralement sans connexion Internet et se synchroniser automatiquement dès que le réseau est disponible.

---

## 1. Architecture du Monorepo

```
rafiki-paie/
├─ apps/
│  ├─ web/            Frontend Next.js (App Router, Tailwind CSS, shadcn/ui)
│  ├─ desktop/        Application Electron (main, preload, better-sqlite3)
│  └─ api/            Backend Laravel 11/13 (Sanctum, brick/math, Dockerfile)
├─ packages/
│  ├─ calcul/         Moteur de calcul TypeScript (decimal.js) + vecteurs partagés
│  └─ config/         Configurations partagées (tsconfig, ESLint, Prettier)
├─ docs/
│  ├─ annexes/        Documents sources de référence (cahier des charges, Excel, etc.)
│  └─ decisions/      Comptes-rendus d'architecture et rapport de phase 0
├─ supabase/          Documentation de raccordement PostgreSQL & durcissement SQL
├─ .github/workflows/ Intégration continue (CI)
├─ render.yaml        Spécification de déploiement de l'API sur Render
├─ AGENTS.md          Directives pour les agents d'assistance IA
└─ package.json       Workspaces npm & scripts de commande
```

---

## 2. Déploiement

### A. Interface Web sur Vercel

Pour déployer la version web de consultation sur Vercel :

1. Créez un nouveau projet sur Vercel en liant ce dépôt GitHub.
2. Définissez le **Root Directory** sur `apps/web`.
3. Framework Preset : **Next.js**.
4. Build Command : `npm run build` (génère l'export statique dans `apps/web/out`).
5. Variables d'environnement :
   - `NEXT_PUBLIC_API_URL` : URL de l'API Laravel (ex: `https://rafiki-paie-api.onrender.com/api`).

### B. API Backend sur Render

L'API est configurée avec `render.yaml` :

1. Créez un **Blueprint** sur Render en pointant sur ce dépôt.
2. Le service web Docker déploie `apps/api/Dockerfile`.
3. Renseignez les variables d'environnement secrètes dans le tableau de bord Render : `APP_KEY`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`.

### C. Base de Données sur Supabase

- PostgreSQL avec SSL obligatoire (`DB_SSLMODE=require`).
- Les migrations Laravel sont l'unique source de vérité du schéma.
- L'API REST de Supabase est sécurisée et fermée via `supabase/durcissement.sql`.

---

## 3. Commandes Usuelles

```bash
# Installation des dépendances
npm install

# Démarrer le web en développement
npm run dev:web

# Démarrer l'application Desktop Electron
npm run dev:desktop

# Exécuter les tests du moteur de calcul (TypeScript)
npm run test:calcul

# Exécuter les tests de l'API et du portage PHP
npm run test:api

# Vérifications de qualité
npm run typecheck
npm run lint
npm run format:check

# Construire les versions de production
npm run build:web       # Export statique Next.js
npm run build:desktop   # Binaire et installeur Windows Electron
```
