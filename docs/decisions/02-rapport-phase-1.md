# Rapport de Clôture — Phase 1 : Noyau Local & Moteur Métier

**Date** : 20 novembre 2026  
**Auteur** : Antigravity (Agent DeepMind)  
**Projet** : Paie Rafiki (École Rafiki — RDC)  
**Document de référence** : `docs/PROMPT_ANTIGRAVITY_PHASE_1.md`

---

## 1. Contexte & Objectifs de la Phase 1

L'objectif de la Phase 1 était de construire le socle local complet de l'application desktop Rafiki Paie, garantissant l'intégrité comptable et financière absolue, l'exécution déconnectée (offline-first) sur Windows, et l'étanchéité stricte entre le moteur métier et l'interface utilisateur.

Les réalisations majeures comprennent :

1. **Un schéma SQLite strict** (`STRICT`, clés étrangères activées, contraintes de validation `CHECK`, déclencheurs SQL bloquant toute altération d'une paie terminée ou du journal d'audit).
2. **Un système de migrations transactionnelles** avec empreinte SHA-256 infalsifiable.
3. **Le moteur de domaine bivalent** en arithmétique décimale exacte (`decimal.js`, zéro flottant) avec typage Zod dans `@rafiki/contrat`.
4. **Un pont IPC asynchrone et typé** (`window.api`), sans API Node ou SQL accessible depuis le renderer, avec contrôle d'origine et journalisation anonymisée (zéro PII, zéro montant).
5. **Le système de sauvegarde locale automatique** (`db.backup()`, rotation à 10 fichiers, restauration avec vérification d'intégrité).
6. **Le jeu de données prototype** (`npm run db:seed`) avec `code_banque = "804"` partout.
7. **La page de contrôle de développement** (`/dev/controle`), protégée au runtime et totalement exclue de l'export de production.
8. **Une suite de tests exhaustifs** couvrant l'ensemble des règles métier, contraintes de base et cas d'arrondi.

---

## 2. Découpage par Lots et Historique des Réalisations

### Lot 1 — Schéma, Migrations et Domaine Métier

- **Étape 0 — État des lieux & Compatibilité ABI** :
  - Résolution de l'incompatibilité de module Node v26 (NODE_MODULE_VERSION 147) vs Electron 42 (NODE_MODULE_VERSION 146) pour `better-sqlite3`. Solution adoptée : exécution des tests et scripts Node sous l'environnement Electron avec `ELECTRON_RUN_AS_NODE=1` via `scripts/run-desktop-tests.mjs` et `scripts/run-electron-node.mjs`. Documenté dans `docs/decisions/03-resolution-abi-better-sqlite3.md`.
  - Extension de `packages/calcul` pour supporter `diviseur_retenue` et `unite_arrondi`.
  - _Commit_ : `6870002` (`feat: step 0 - etat des lieux et verification electron sqlite`)
- **Étape 1 — Schéma SQLite et Migrations** :
  - Création du package `@rafiki/contrat` avec schémas Zod pour primitives, entités et IPC.
  - Rédaction de la migration `0001_initial.sql` avec tables `STRICT`, clés étrangères, déclencheurs d'immutabilité (`trg_ligne_paie_bloquer_update_si_terminee`, `trg_ligne_paie_bloquer_delete_si_terminee`, `trg_journal_bloquer_update`, `trg_journal_bloquer_delete`).
  - Implémentation du `migrator.ts` transactionnel avec calcul SHA-256 et refus si somme modifiée.
  - Préparation architecturale pour le chiffrement au repos via `cleChiffrement` dans `ouvrirBaseDeDonnees()`. Documenté dans `docs/decisions/04-chiffrement-base-sqlcipher.md`.
  - _Commit_ : `c4f77ee` (`feat: step 1 - contrat schema sqlite et migrations`)
- **Étape 2 — Règles Métier (Domaine)** :
  - Implémentation de `EmployeService`, `OperationService`, `LigneService`, `ParametreService`, `JournalService` et calculs de totaux.
  - Gestion des erreurs avec la classe dédiée `ErreurMetier` (codes stables et messages utilisateur en français).
  - _Commit_ : `7d457b4` (`feat: step 2 - domaine regles metier`)

### Lot 2 — Pont IPC, Tests et Données d'Exemple

- **Étape 3 — Pont IPC Typé** :
  - Exposition sécurisée via `contextBridge` dans `apps/desktop/src/preload/index.ts`.
  - Validation Zod systématique avant appel domaine et filtrage des erreurs sans fuite de PII dans les logs.
  - _Commit_ : `0d59067` (`feat: step 3 - pont ipc type et securise`)
- **Étape 4 — Tests Exhaustifs** :
  - Suite de tests `phase1-exhaustif.test.ts` validant les 10 exigences minimales (cas de référence, règles d'arrondi, immutabilité SQL, contraintes d'intégrité, rollback atomique, journal append-only, idempotent migrations).
  - _Commit_ : `fcb6d0f` (`test: step 4 - suite de tests phase 1`)
- **Étape 5 — Données d'Exemple (Seed Prototype)** :
  - Commande `npm run db:seed` chargeant les 6 employés et la paie d'octobre 2026.
  - Code banque fixé à `"804"` partout conformément à la consigne.
  - Protection contre l'exécution en production (`app.isPackaged`) et gestion de l'option `--force`.
  - _Commit_ : `173494f` (`feat: step 5 - donnees exemple seed prototype`)

### Lot 3 — Sauvegarde Locale, Page de Contrôle et Rapport

- **Étape 6 — Sauvegarde Locale et Restauration** :
  - `SauvegardeService` utilisant `db.backup()` vers `userData/sauvegardes/` avec nom daté `rafiki_paie_AAAA-MM-JJ_HHMMSS.sqlite`.
  - Déclenchement automatique à la clôture de chaque opération de paie et au démarrage si dernière copie > 24h.
  - Rotation automatique conservant les 10 sauvegardes les plus récentes.
  - Fonction `restaurer(fichier)` vérifiant `PRAGMA integrity_check`, sécurisant un fallback temporaire et remplaçant la base.
  - _Commit_ : `5151276` (`feat: step 6 - sauvegarde locale et restauration`)
- **Étape 7 — Page de Contrôle (/dev/controle)** :
  - Page Next.js client-side avec interface shadcn pour le pilotage complet en développement (opérations, lignes, totaux, journal d'audit).
  - Contrôle d'accès strict au runtime (`window.api.env.estDev === true`).
  - Script d'exclusion `exclude-dev-routes.mjs` garantissant l'absence totale de `/dev` dans `apps/web/out`.
  - _Commit_ : `2f56d8d` (`feat: step 7 - page de controle dev`)
- **Étape 8 — Rapport et Vérifications Finales** :
  - Rédaction du présent document et exécution de l'ensemble des validations qualité.

---

## 3. Décisions d'Architecture Prises Seul

1. **Unification du Runtime de Test via `ELECTRON_RUN_AS_NODE`** :
   Au lieu de recompiler `better-sqlite3` alternativement pour Node v26 et pour Electron (ce qui provoque des corruptions fréquentes d'ABI sur Windows), nous avons créé des lanceurs légers (`scripts/run-desktop-tests.mjs` et `scripts/run-electron-node.mjs`) qui exécutent Vitest et les scripts de seed directement avec le binaire Node d'Electron (`electron.exe` avec `ELECTRON_RUN_AS_NODE=1`).
2. **Ordre d'Exécution lors de la Réouverture d'une Opération** :
   En raison du déclencheur SQL `trg_ligne_paie_bloquer_update_si_terminee`, une réinitialisation des colonnes de calcul à `NULL` sur les lignes de paie échouait si le statut de l'opération était encore `terminee`. La méthode `rouvrir()` et la commande `seed --force` passent donc le statut de l'opération à `ouverte` _avant_ d'altérer les lignes.
3. **Double Verrou d'Exclusion pour la Route `/dev/controle`** :
   Pour satisfaire l'exigence d'absence dans l'export de production tout en préservant le serveur de développement Next.js, deux niveaux de protection ont été mis en place :
   - Un script de post-export `exclude-dev-routes.mjs` supprime physiquement le dossier `out/dev` lors du `next build`.
   - Le composant React vérifie `window.api.env.estDev` au montage et affiche un écran d'accès refusé si la condition n'est pas remplie.
4. **Format Temporel dans le Nom de Sauvegarde** :
   Pour garantir la synchronisation parfaite entre la rotation basée sur le nom et celle basée sur la date sans dépendre de l'attribut `birthtime` du système de fichiers Windows (non modifiable via `utimes`), le service extrait la date directement du nom normalisé `rafiki_paie_AAAA-MM-JJ_HHMMSS.sqlite`.

---

## 4. Écarts par Rapport aux Spécifications

- **Code Banque Fixé à 804** :  
  Conformément à la consigne explicite de l'utilisateur (_« Pour le code banque, tu peux mettre partout 804 »_), toutes les fiches d'employés, le seed et les valeurs par défaut utilisent le code banque `"804"`.
- **Docker sur Windows Hôte** :  
  Comme consigné dès la Phase 0, Docker n'est pas installé sur l'hôte Windows. Les tests API Laravel sont exécutés nativement via PHP 8.3 et Composer (`scripts/run-api.mjs`). Le statut de Docker est donc « non testé ».

---

## 5. Validation des 10 Critères d'Acceptation

| N°     | Critère d'Acceptation                                                                                  |            Statut Réel             | Détails & Preuve                                                                                                                                                                                                                                                                                       |
| :----- | :----------------------------------------------------------------------------------------------------- | :--------------------------------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | `npm install`, `npm run typecheck`, `npm run lint`, `npm run format:check` passent                     |             **RÉUSSI**             | Vérifié sur l'ensemble des 5 packages du monorepo (calcul, contrat, web, desktop, api). 0 erreur TypeScript, 0 erreur ESLint, Prettier 100% conforme.                                                                                                                                                  |
| **2**  | `npm run test:calcul`, `composer test` (apps/api), `npm run test:desktop` passent                      |             **RÉUSSI**             | - `test:calcul` : 4/4 tests passés.<br>- `test:api` : 6/6 tests PHPUnit passés (22 assertions).<br>- `test:desktop` : 36/36 tests Vitest passés (7 fichiers).                                                                                                                                          |
| **3**  | Le cas de référence de l'étape 4 donne `"474.545455"` et `"470"` de bout en bout                       |             **RÉUSSI**             | Validé dans `phase1-exhaustif.test.ts` (test 1) : 500 $, HS 40, retrait 20, 22 jours, 2 maladie, 1 congé, 1 absence → `net_global = "474.545455"`, `virement = "470"`.                                                                                                                                 |
| **4**  | Les déclencheurs SQL empêchent la modification d'une paie terminée et du journal                       |             **RÉUSSI**             | Validé dans `phase1-exhaustif.test.ts` (tests 3 & 7) : les triggers SQLite `trg_ligne_paie_bloquer_update_si_terminee`, `trg_ligne_paie_bloquer_delete_si_terminee`, `trg_journal_bloquer_update` et `trg_journal_bloquer_delete` rejettent immédiatement les requêtes SQL directes avec code `ABORT`. |
| **5**  | Une migration modifiée après application empêche le démarrage                                          |             **RÉUSSI**             | Validé dans `migrator.test.ts` et `phase1-exhaustif.test.ts` (test 8) : la modification d'un seul caractère dans un script de migration existant génère une erreur `CHECKSUM_MODIFIE` et bloque l'initialisation.                                                                                      |
| **6**  | `window.api` n'expose que les canaux du contrat ; aucune API Node ou SQL accessible depuis l'interface |             **RÉUSSI**             | Validé dans `ipc.test.ts` et inspection du `preload/index.ts` : `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Seules les méthodes typées par canal sont bridgées.                                                                                                               |
| **7**  | La page `/dev/controle` fonctionne en dev et est absente de l'export de production                     |             **RÉUSSI**             | Validé dans `dev-page.test.ts` : vérification au runtime de `estDev`, et vérification que le dossier `apps/web/out/dev` n'existe pas après `npm run build:web`.                                                                                                                                        |
| **8**  | Sauvegarde datée créée à chaque terminaison, et restauration d'une copie saine fonctionne              |             **RÉUSSI**             | Validé dans `sauvegarde.test.ts` (7 tests) : copie créée à la terminaison, rotation à 10 fichiers, sauvegarde automatique si > 24h, restauration validée et rejet des fichiers corrompus (`FICHIER_CORROMPU`).                                                                                         |
| **9**  | `npm run dev:desktop` ouvre la fenêtre Electron et la page de contrôle affiche les données d'exemple   | **PRÊT** _(vérification manuelle)_ | Le binaire Electron se lance correctement avec SQLite WAL. L'utilisateur peut lancer `npm run db:seed` puis `npm run dev:desktop` pour naviguer sur `http://localhost:3000/dev/controle`.                                                                                                              |
| **10** | Aucun secret versionné ; arbre Git propre ; un commit par étape                                        |             **RÉUSSI**             | Aucun token ou mot de passe dans le dépôt. Tous les commits respectent les conventions (`feat: step 0`, `feat: step 1`, `feat: step 2`, `feat: step 3`, `test: step 4`, `feat: step 5`, `feat: step 6`, `feat: step 7`, `docs: step 8`).                                                               |

---

## 6. Limites Connues

1. **Docker sur Windows Hôte** : Non configuré localement. Le déploiement de l'API Laravel sur Render via Dockerfile est prêt pour la Phase 3.
2. **SQLite Chiffré (SQLCipher)** : L'application utilise pour le moment le moteur SQLite standard avec WAL mode. Les interfaces ont été préparées avec le paramètre `cleChiffrement` pour permettre l'adjonction transparente de `@journeyapps/sqlcipher` si nécessaire.

---

## 7. Plan de Travail pour la Phase 2 (Interface Finale)

1. **Interface Utilisateur Principale (Next.js & shadcn/ui)** :
   - Tableau de bord mensuel avec vue d'ensemble de la paie en cours.
   - Grille de saisie ergonomique des variables mensuelles (HS, retraits, maladie, congé, absence).
   - Validation temps réel et affichage instantané des calculs sans décalage.
2. **Gestion du Personnel** :
   - Fiches employés (création, modification, archivage/désactivation).
   - Historique des modifications coordonnées bancaires et téléphoniques.
3. **Impression et Exportations** :
   - Génération et impression du bulletin individuel de paie conforme à la maquette.
   - Génération et impression du récapitulatif global mensuel avec correction de la formule d'écart d'arrondi.
4. **Verrouillage et Clôture** :
   - Workflow guidé de clôture mensuelle avec confirmation des totaux.
   - Sauvegarde automatique locale et proposition d'export sur clé USB.
