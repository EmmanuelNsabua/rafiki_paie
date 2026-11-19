# Règles du projet Paie Rafiki pour les agents d'assistance

Ce document synthétise les directives fondamentales, les choix d'architecture, les conventions et les commandes du projet pour tout agent intervenant sur le dépôt.

---

## 1. Contexte Métier

L'École Rafiki (RDC) gère la paie mensuelle de son personnel enseignant et administratif en remplacement d'un classeur Excel historique.

- **Un seul administrateur** : Pas de rôles multiples, pas de validation hiérarchique complexe.
- **Fidélité stricte au classeur** : Aucune retenue légale (CNSS, IPR). Seules les rubriques du classeur existent (Salaire, HS/Primes, Retrait/Avance, Maladie, Congé spécial, Absence non justifiée).
- **Local d'abord** : L'application desktop fonctionne entièrement hors ligne (SQLite local) et se synchronise dès qu'une connexion est disponible.
- **Une opération par mois** : Une ligne par employé actif.
- **Devise unique** : USD (dollars américains), affichée avec 2 décimales.
- **Windows uniquement** : Cible desktop principale.

### Formule de paie (J = jours ouvrables du mois)

```
salaire_a_payer   = salaire + hs - retrait
taux_journalier   = salaire / J
retenue_maladie   = taux_journalier / 3 * jours_maladie
retenue_conge     = taux_journalier / 3 * jours_conge
retenue_absence   = taux_journalier * jours_absence
global            = salaire_a_payer - retenue_maladie - retenue_conge - retenue_absence
virement          = arrondi à la dizaine la plus proche (la moitié monte : 555 -> 560, 554.99 -> 550)
ecart_arrondi     = somme(virement) - somme(global)
```

### Anomalies du classeur d'origine (À NE PAS REPRODUIRE)

1. **Écart d'arrondi récapitulatif (B13)** : La formule Excel erronée `=B10-B9` (absences - congés) est corrigée par `somme(virements) - somme(globaux)`.
2. **Période dynamique du bulletin (E7)** : `=TEXT(TODAY(), "mmmm yyyy")` est proscrit. Chaque bulletin est lié de manière immuable à sa période de paie (`mois`, `annee`).
3. **Division par zéro masquée** : `IFERROR` masquait `jours_ouvrables = 0`. Validation obligatoire : `jours_ouvrables >= 1`.

---

## 2. Architecture Technique

- **Interface** : Next.js (App Router, TypeScript strict), Tailwind CSS, shadcn/ui. Client-side uniquement (`output: "export"`, pas de Server Actions, pas d'accès direct à SQLite).
- **Application Desktop** : Electron, installeur Windows NSIS (`electron-builder`), base SQLite locale (`better-sqlite3`). Pont `preload` minimal et typé via `contextBridge` (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, CSP stricte).
- **API Distante** : Laravel 11/13 (PHP 8.3), authentification Sanctum, déployée sur Render via Docker. Seule porte d'entrée autorisée vers la base distante.
- **Base Distante** : PostgreSQL hébergé sur Supabase, avec RLS activé pour fermer l'API REST PostgREST. Les migrations Laravel sont la seule source de vérité.
- **Moteur de Calcul Bivalent** : TypeScript (`decimal.js`) dans `packages/calcul` et PHP (`brick/math`) dans `apps/api`. **Zéro nombre flottant**. Validés par le même fichier de vecteurs `packages/calcul/vecteurs/vecteurs.json`.

---

## 3. Commandes du Projet

- `npm install` : Installation des dépendances du monorepo.
- `npm run dev:web` : Serveur de développement Next.js.
- `npm run dev:desktop` : Démarrage de l'application Electron.
- `npm run build:web` : Export statique HTML/JS Next.js dans `apps/web/out`.
- `npm run build:desktop` : Construction du binaire Electron (NSIS / unpacked).
- `npm run test:calcul` : Tests unitaires du moteur TypeScript (Vitest).
- `npm run test:api` : Tests PHP / Laravel (PHPUnit).
- `npm run typecheck` : Vérification TypeScript sur tous les workspaces.
- `npm run lint` : Vérification du style de code (ESLint).
- `npm run format:check` : Vérification du formatage (Prettier).

---

## 4. Règles et Interdictions Strictes

1. **NE JAMAIS MODIFIER `docs/annexes/`** : Les fichiers dans `docs/annexes/` sont les sources de vérité historiques et contractuelles. Ils sont strictement en lecture seule.
2. **Aucun secret dans le dépôt** : Aucun mot de passe, clé secrète ou token dans Git.
3. **Arithmétique décimale obligatoire** : Utiliser `decimal.js` en TS et `brick/math` en PHP pour tous les montants et fractions. Jamais de type `number` natif ou `float` pour les opérations financières.
4. **Traductions et textes** : Code et identifiants techniques en anglais ; interface utilisateur et documentation en français.
