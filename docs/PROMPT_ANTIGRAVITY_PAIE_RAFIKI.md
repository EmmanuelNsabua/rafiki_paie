# Prompt Antigravity — Phase 0 : fondations du logiciel de paie de l'École Rafiki

## 1. Rôle et mission

Tu es l'ingénieur logiciel principal d'un projet à livrer vite. Le projet remplace un classeur Excel de paie par un vrai logiciel : une application **desktop Windows** (Electron) qui fonctionne en local, sans connexion, et se synchronise avec un **serveur distant** dès qu'elle est en ligne.

**Cette phase ne développe aucune fonctionnalité métier.** Sa mission est de préparer le terrain : analyser le contexte, installer ce qu'il faut sur la machine, créer le monorepo, installer toutes les dépendances, configurer le déploiement et prouver par des tests que la chaîne complète fonctionne. La phase suivante construira les fonctionnalités sur ces fondations.

**Contrainte de temps.** Le travail global doit être livré avant 12 h. Travaille de façon autonome et rapide. Ne pose une question que si tu es bloqué (identifiants manquants, action payante, choix irréversible). Pour tout le reste, décide, applique et consigne la décision dans `docs/decisions/`.

## 2. Contexte métier (à lire avant d'agir)

L'École Rafiki (RDC) calcule la paie mensuelle de son personnel dans un classeur Excel. Le logiciel cible est un **cahier de paie** : chaque mois, l'administrateur crée une _opération de paie_, remplit la liste des employés comme dans Excel, et le logiciel calcule le net, le virement bancaire et les bulletins.

Règles non négociables, déjà arrêtées :

- **Un seul administrateur.** Pas de rôles, pas de circuit de validation.
- **Fidélité au classeur.** Aucune retenue légale (CNSS, IPR). Seules les retenues du classeur existent.
- **Local d'abord.** Toute action s'applique à la base locale puis se synchronise. L'application ne doit jamais être bloquée par le réseau.
- **Une opération par mois**, contenant une ligne par employé actif.
- **Devise unique : USD**, deux décimales à l'affichage.
- **Windows uniquement.**

Formule de calcul (identique au classeur, avec J = jours ouvrables) :

```
salaire_a_payer   = salaire + hs - retrait
taux_journalier   = salaire / J
retenue_maladie   = taux_journalier / 3 * jours_maladie
retenue_conge     = taux_journalier / 3 * jours_conge
retenue_absence   = taux_journalier * jours_absence
global            = salaire_a_payer - retenue_maladie - retenue_conge - retenue_absence
virement          = arrondi à la dizaine la plus proche (la moitié monte)
ecart_arrondi     = somme(virement) - somme(global)
```

Anomalies du classeur à **ne pas reproduire** : l'écart d'arrondi du récapitulatif (cellule B13) est calculé avec les mauvaises cellules ; la période du bulletin dépend de `TODAY()` ; une division par zéro y est masquée par `SIERREUR`.

## 3. Annexes de référence

Les documents suivants sont à la racine du dépôt dans `docs/annexes/`. **Lis-les intégralement avant toute action.** Si l'un d'eux manque, arrête-toi et demande à l'utilisateur de le fournir.

| Fichier                                                  | Contenu                                                                                                        | À quoi il sert                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `docs/annexes/01-manuel-utilisation-paie-rafiki.pdf`     | Manuel d'utilisation et guide technique du classeur actuel                                                     | Vocabulaire, colonnes, règles de calcul, procédure mensuelle    |
| `docs/annexes/02-GESTION_PAIE_ECOLE_RAFIKI_COMPLET.xlsx` | Classeur Excel d'origine (3 onglets : Paie Mensuelle, Récapitulatif & Contrôle, Fiche de Paie Individuelle)    | Source de vérité des formules et de la mise en page du bulletin |
| `docs/annexes/03-documentation-conception.md`            | Documentation de conception : exigences, règles de gestion, modèle de données, synchronisation, sécurité, plan | Référence fonctionnelle et de modèle de données                 |
| `docs/annexes/04-prototype-paie-rafiki.html`             | Prototype HTML local, validé                                                                                   | Référence de l'expérience, des écrans et des comportements      |

**Ordre de priorité en cas de contradiction.** Pour la **pile technique** (Next.js, Laravel, Supabase, Electron, SQLite), ce prompt prime : la documentation de conception mentionnait Node/Fastify et PostgreSQL seul, et cela est remplacé par les choix de la section 4. Pour le **métier** (règles, formules, modèle de données, parcours), la documentation de conception et le classeur priment.

Pour la future interface, la direction visuelle suit la skill `apple-design` d'Emil Kowalski (dépôt `emilkowalski/skills`, fichier `skills/apple-design/SKILL.md`) : réponse immédiate à l'appui, mouvement par ressorts amortis, barres translucides, typographie système, mode sombre, respect de « réduire les animations ». Ne l'applique pas dans cette phase, mais prévois la configuration qui la permettra.

## 4. Architecture cible

| Couche              | Choix                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Interface           | **Next.js** (App Router, TypeScript strict), **Tailwind CSS**, **shadcn/ui**                                                   |
| Application desktop | **Electron**, installeur Windows **electron-builder** (NSIS), mises à jour **electron-updater**                                |
| Base locale         | **SQLite** via `better-sqlite3`, dans le dossier de données de l'utilisateur                                                   |
| API distante        | **Laravel** (dernière version majeure stable), PHP 8.3 minimum, authentification **Sanctum**, déployée sur **Render** (Docker) |
| Base distante       | **Supabase** (PostgreSQL géré), utilisée uniquement comme base : Laravel est la seule porte d'entrée                           |
| Interface web       | Même code Next.js, déployable sur **Vercel**                                                                                   |
| Moteur de calcul    | Paquet TypeScript partagé + portage PHP, validés par les **mêmes vecteurs de test**                                            |

Décisions déjà prises, à appliquer sans rediscuter :

1. **Le Next.js sert deux cibles.** Dans Electron, il est exporté en statique (`output: "export"`) et chargé par le processus principal ; sur Vercel, il se déploie normalement. Le code d'interface reste donc **côté client uniquement** : pas de route serveur Next, pas de Server Actions, pas de lecture de base depuis Next.
2. **L'interface ne parle jamais directement à SQLite.** Elle passe par le pont `preload` (`contextBridge`) qui expose une API IPC minimale et typée. Réglages Electron obligatoires : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, politique de sécurité de contenu stricte.
3. **Laravel est l'unique propriétaire du schéma distant.** Les migrations Laravel sont la seule source de vérité. Le dossier `supabase/` ne contient que de la documentation et un script SQL de durcissement (activer la sécurité par ligne sans politique sur toutes les tables, pour fermer l'API REST de Supabase). N'utilise pas les migrations de la CLI Supabase.
4. **Le calcul existe deux fois, mais n'est écrit qu'une fois en spécification.** Le paquet `packages/calcul` (TypeScript) sert l'application ; `apps/api` en contient un portage PHP. Les deux lisent le même fichier de vecteurs de test (`packages/calcul/vecteurs/vecteurs.json`) et doivent donner des résultats identiques au centime.
5. **Arithmétique décimale exacte, jamais de flottants.** `decimal.js` côté TypeScript, `brick/math` côté PHP. Aucun arrondi intermédiaire ; seul le virement est arrondi.
6. **Monorepo npm workspaces.** Laravel n'est pas un workspace npm : il est piloté par des scripts npm qui appellent Composer.

## 5. Structure du monorepo à créer

```
rafiki-paie/
├─ apps/
│  ├─ web/            Next.js + Tailwind + shadcn/ui
│  ├─ desktop/        Electron (main, preload) + SQLite + electron-builder
│  └─ api/            Laravel (PHP) + Dockerfile
├─ packages/
│  ├─ calcul/         moteur de calcul TypeScript + vecteurs de test partagés
│  └─ config/         tsconfig, ESLint et Prettier partagés
├─ docs/
│  ├─ annexes/        les 4 documents de la section 3
│  └─ decisions/      une note courte par décision d'architecture
├─ supabase/          README + script de durcissement SQL
├─ .github/workflows/ ci.yml
├─ AGENTS.md          règles du projet pour les agents (GEMINI.md le référence)
├─ render.yaml        déploiement de l'API sur Render
├─ package.json       workspaces + scripts racine
├─ .nvmrc  .editorconfig  .gitignore  .env.example  README.md
```

## 6. Étapes à exécuter, dans l'ordre

**Avant de commencer :** écris un plan court (une page maximum) et exécute-le sans attendre de validation, sauf pour les identifiants et les actions payantes.

### Étape 0 : lecture

Lis les quatre annexes. Ouvre le classeur Excel et note, dans `docs/decisions/00-synthese-classeur.md`, les formules réelles de chaque colonne calculée et les anomalies de la section 2.

### Étape 1 : audit et installation de l'environnement

La machine est un **Windows 11** ; utilise PowerShell. Vérifie chaque outil par sa commande de version, et n'installe que ce qui manque, avec `winget` (vérifie les identifiants avec `winget search`) ou l'installeur officiel :

- **Node.js** LTS actif et **npm** (`OpenJS.NodeJS.LTS`) ;
- **Git** (`Git.Git`) ;
- **PHP 8.3 ou plus** avec les extensions `pdo_pgsql`, `pdo_sqlite`, `mbstring`, `openssl`, `curl`, `fileinfo`, `zip`, `intl`, activées dans `php.ini` ;
- **Composer** ;
- **Docker Desktop**, optionnel : seulement pour tester l'image de l'API. S'il est absent, saute le test et signale-le dans le rapport ;
- les **outils de compilation Visual Studio** uniquement si un module natif (`better-sqlite3`) ne trouve pas de binaire précompilé.

Fixe la version de Node dans `.nvmrc` et le champ `engines` du `package.json` racine.

### Étape 2 : création du monorepo

Crée la structure de la section 5. Initialise Git, puis fais un premier commit. Le `.gitignore` exclut au minimum : `node_modules`, `vendor`, `.env` et `.env.*` (sauf `.env.example`), `dist`, `out`, `.next`, `release`, `*.db`, `*.sqlite`.

### Étape 3 : installation des dépendances

Avant d'installer chaque paquet, vérifie sa dernière version stable (`npm view <paquet> version`, `composer show -a <paquet>`) et **fixe les versions exactes**. N'invente aucun numéro de version.

**Racine (devDependencies) :** `typescript`, `eslint` et sa configuration, `prettier`, `concurrently`, `cross-env`, `vitest`.

**`apps/web` :**

- `next`, `react`, `react-dom`, `tailwindcss` et son intégration PostCSS ;
- shadcn/ui, initialisé avec `npx shadcn@latest init` : dépendances `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css` ;
- composants shadcn à ajouter dès maintenant : `button`, `input`, `label`, `select`, `switch`, `sheet`, `dialog`, `table`, `sonner`, `form` ;
- `react-hook-form`, `@hookform/resolvers`, `zod`, `date-fns`.
- Configuration : `output: "export"`, `images.unoptimized: true`, `trailingSlash: true`.

**`apps/desktop` :** `electron`, `electron-builder`, `electron-updater`, `electron-log`, `better-sqlite3` et ses types, `@electron/rebuild`, `tsup` (compilation du processus principal et du preload), `zod`. Déclare le script `postinstall` qui reconstruit les modules natifs pour Electron.

**`packages/calcul` :** `decimal.js`, `vitest`, `tsup`.

**`apps/api` (Composer) :** crée le projet Laravel avec la dernière version majeure stable ; ajoute `laravel/sanctum`, `brick/math`, `pestphp/pest` (ou PHPUnit s'il est déjà fourni), `laravel/pint`.

Ajoute enfin tout ce que tu juges nécessaire à la qualité et à la vitesse de travail, et justifie-le dans `docs/decisions/`.

### Étape 4 : socle technique minimal et vérifiable

Implémente uniquement ce qui prouve que la chaîne fonctionne :

1. **`packages/calcul`** : la fonction de calcul d'une ligne de paie, le fichier de vecteurs partagé et ses tests.
2. **`apps/api`** : un portage PHP du calcul avec ses tests, qui lisent **le même** fichier de vecteurs ; une route `GET /api/health` qui répond `{"status":"ok"}` ; l'authentification Sanctum installée mais sans route métier.
3. **`apps/web`** : une page d'accueil provisoire qui affiche un composant shadcn et les variables de thème (section 8).
4. **`apps/desktop`** : une fenêtre Electron qui charge l'interface (serveur de développement en mode dev, export statique servi par un protocole personnalisé en production) ; au démarrage, création du fichier SQLite dans le dossier de données de l'utilisateur ; une méthode IPC `db:ping` qui renvoie la version de SQLite, appelée depuis la page d'accueil et affichée.
5. **Pas de migrations métier**, pas d'écrans, pas de synchronisation : ce sera la phase suivante.

### Étape 5 : déploiement

- **API sur Render.** Un `Dockerfile` de production dans `apps/api` (image PHP 8.3, `composer install --no-dev --optimize-autoloader`, serveur web qui **écoute sur la variable `PORT`** fournie par Render, mise en cache de la configuration au démarrage) et un `render.yaml` (service web Docker, dossier racine `apps/api`, chemin de santé `/up` ou `/api/health`, variables d'environnement déclarées sans valeur).
- **Base sur Supabase.** Connexion PostgreSQL de Laravel avec SSL obligatoire (`sslmode=require`). Documente dans `supabase/README.md` quelle chaîne de connexion utiliser (connexion directe ou _session pooler_ pour les migrations ; le _transaction pooler_ demande de désactiver les requêtes préparées émulées) et fournis `supabase/durcissement.sql`.
- **Interface sur Vercel.** Configure le projet pour le dossier `apps/web` et documente les réglages dans `README.md`. Ne déploie rien toi-même.
- **Variables d'environnement.** Un `.env.example` par application, **sans aucune valeur secrète** : API (`APP_KEY`, `APP_ENV`, `APP_URL`, `DB_*`, `DB_SSLMODE`, origines CORS autorisées), web (`NEXT_PUBLIC_API_URL`), desktop (`API_URL`, source des mises à jour).
- **Intégration continue.** `.github/workflows/ci.yml` : installation, vérification des types, lint, tests du calcul (TypeScript et PHP), construction de l'interface.

### Étape 6 : règles du projet pour les agents

Crée `AGENTS.md` (et un `GEMINI.md` d'une ligne qui le référence) avec : le contexte métier de la section 2, les décisions de la section 4, les commandes du projet, les conventions de code, et l'interdiction de modifier les annexes.

## 7. Règles de travail

- **Windows et PowerShell** pour toutes les commandes. Chemins avec `\` ou `/` de façon portable dans les scripts.
- **Aucun secret** dans le dépôt, dans les journaux ou dans tes réponses. Si une valeur secrète est nécessaire (Supabase, Render, Vercel), demande-la à l'utilisateur, place-la dans un `.env` local ignoré par Git, et ne l'affiche jamais.
- **Aucune action destructive ni payante** sans accord explicite : pas de suppression hors du dépôt, pas de création de service payant, pas de déploiement.
- **N'écris jamais dans `docs/annexes/`.**
- **Versions réelles uniquement.** Vérifie, ne devine pas.
- Si un outil échoue, tente une alternative documentée une fois, puis consigne le blocage et continue sur ce qui n'en dépend pas.
- Code et noms techniques en anglais ; textes visibles par l'utilisateur et documentation en français.

## 8. Variables de thème à préparer

Prépare les variables CSS de shadcn/ui pour la future interface, claire et sombre, à partir du prototype :

| Variable         | Clair     | Sombre    |
| ---------------- | --------- | --------- |
| Fond             | `#f5f5f7` | `#000000` |
| Surface          | `#ffffff` | `#1c1c1e` |
| Texte            | `#1d1d1f` | `#f5f5f7` |
| Texte secondaire | `#6e6e73` | `#98989d` |
| Accent           | `#0a7a5a` | `#34c58f` |
| Danger           | `#c4372c` | `#ff6961` |

Police : pile système (`-apple-system`, `BlinkMacSystemFont`, `"SF Pro Text"`, `"Segoe UI"`, `Roboto`, `sans-serif`). Prévois `prefers-color-scheme`, `prefers-reduced-motion` et `prefers-reduced-transparency`.

## 9. Résultats attendus (critères d'acceptation)

La phase est terminée quand **toutes** les vérifications suivantes passent, et que tu as exécuté chacune.

1. `npm install` à la racine se termine sans erreur.
2. `npm run typecheck`, `npm run lint` et `npm run format:check` passent.
3. `npm run test:calcul` (TypeScript) et `composer test` dans `apps/api` (PHP) passent sur **les mêmes vecteurs** (section 10).
4. `npm run dev:web` sert la page provisoire avec un composant shadcn.
5. `npm run dev:desktop` ouvre la fenêtre Electron, crée le fichier SQLite et affiche le retour de `db:ping`.
6. `npm run build:web` produit l'export statique sans erreur.
7. `npm run build:desktop` produit au moins l'application empaquetée (`--dir`) ; si possible, l'installeur Windows non signé.
8. `php artisan serve` répond à `GET /api/health` avec `{"status":"ok"}`.
9. L'image Docker de l'API se construit (si Docker est disponible).
10. `render.yaml` est valide ; `.env.example` présent dans chaque application ; aucun secret versionné (`git grep` des motifs de clés à l'appui).
11. Dépôt Git initialisé avec des commits lisibles, un par étape.

## 10. Vecteurs de test de référence

À mettre dans `packages/calcul/vecteurs/vecteurs.json` (le format exact est à ta charge, il doit être lisible par TypeScript **et** PHP).

**Cas complet** : salaire 500, HS 40, retrait 20, 22 jours ouvrables, 2 jours de maladie, 1 de congé, 1 d'absence non justifiée.

| Sortie          | Valeur attendue            |
| --------------- | -------------------------- |
| Salaire à payer | 520,00                     |
| Jours prestés   | 18                         |
| Retenue maladie | 15,1515… (affiché 15,15)   |
| Retenue congé   | 7,5757… (affiché 7,58)     |
| Retenue absence | 22,7272… (affiché 22,73)   |
| Global          | 474,5454… (affiché 474,55) |
| Virement        | 470                        |

**Cas d'arrondi** (salaire sans aucune variable, 22 jours, global égal au salaire) : 554,99 donne 550 ; 555,00 donne 560 ; 557,20 donne 560 ; 474,55 donne 470 ; 0,00 donne 0.

**Cas d'erreur** (la fonction doit refuser ou signaler) : jours ouvrables égal à 0 ; somme maladie + congé + absence supérieure aux jours ouvrables ; global négatif.

## 11. Rapport final à produire

Termine par un rapport en français, court, dans `docs/decisions/01-rapport-phase-0.md`, contenant :

1. les outils installés ou déjà présents, avec leurs versions ;
2. l'arborescence finale du monorepo ;
3. la liste des dépendances installées par application, avec les versions exactes ;
4. le résultat de chacune des 11 vérifications de la section 9 (réussi, échoué, non testé et pourquoi) ;
5. les décisions que tu as prises seul ;
6. les blocages restants et les informations à fournir par l'utilisateur (identifiants Supabase, compte Render, projet Vercel, dépôt GitHub pour les mises à jour) ;
7. la liste des premières tâches de la phase 1, dans l'ordre : base locale et migrations, API et synchronisation, écrans, bulletins, import du classeur.
