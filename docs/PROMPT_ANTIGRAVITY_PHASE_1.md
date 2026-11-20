# Prompt Antigravity — Phase 1 : cœur local (SQLite, règles métier, IPC)

## 1. Mission

La phase 0 est terminée : monorepo `rafiki-paie`, moteur de calcul TypeScript et PHP validé sur des vecteurs communs, squelettes Electron, Next.js et Laravel, déploiement préparé.

**Cette phase implémente le cœur local de l'application desktop** : la base SQLite, les règles métier, le pont IPC typé entre l'interface et le processus principal, et les tests qui les prouvent. L'application doit pouvoir créer une opération de paie, calculer, terminer et rouvrir une paie, sauvegarder la base et journaliser les actions sensibles, sans aucune connexion réseau.

**Hors périmètre** (phases suivantes) : interface définitive, génération PDF, import du classeur Excel, serveur, synchronisation, installeur. Une page de contrôle réservée au développement est prévue à l'étape 7, rien de plus.

## 2. Contexte

Lis dans cet ordre avant d'agir : `AGENTS.md`, `docs/decisions/00-synthese-classeur.md`, `docs/decisions/01-rapport-phase-0.md`, puis les annexes de `docs/annexes/` (manuel, classeur Excel, documentation de conception, prototype HTML à jour avec téléphone et code banque).

Règles non négociables, inchangées : un seul administrateur ; fidélité au classeur, aucune retenue légale ; local d'abord ; une opération de paie par mois ; devise USD ; Windows uniquement.

Le bordereau de virement doit pouvoir contenir, pour chaque employé : N°, nom, postnom, prénom, **téléphone**, **code banque**, virement. Le modèle de données de cette phase le prévoit déjà.

Ordre de priorité en cas de contradiction : ce prompt, puis l'addendum du prompt de la phase 0, puis la documentation de conception, puis le classeur.

## 3. Documents de cette phase

Place ces deux fichiers, fournis par l'utilisateur, dans `docs/phase-1/` s'ils n'y sont pas déjà :

- `architecture-phase-1.mermaid` : découpage en couches (rendu, preload, processus principal, domaine, stockage) ;
- `modele-donnees-phase-1.mermaid` : schéma des tables.

Ils sont **normatifs** pour les noms de tables, de colonnes et de modules. Si tu dois t'en écarter, note-le avec la raison dans `docs/decisions/02-rapport-phase-1.md`.

## 4. Déroulement par lots

L'utilisateur te dit quel lot lancer. **Exécute uniquement ce lot, puis arrête-toi** et rédige le rapport du lot. Chaque étape fait l'objet d'un commit. Si une session est interrompue, relis `git log` et reprends à la première étape non validée.

| Lot | Étapes  | Contenu                                            |
| --- | ------- | -------------------------------------------------- |
| 1   | 0, 1, 2 | État des lieux, contrat et schéma, règles métier   |
| 2   | 3, 4, 5 | Pont IPC typé, tests, données d'exemple            |
| 3   | 6, 7, 8 | Sauvegarde locale, page de contrôle, rapport final |

## 5. Décisions techniques arrêtées

Applique-les sans les rediscuter.

1. **Montants en texte décimal exact.** Toute valeur monétaire ou fractionnaire (salaire, HS, retrait, jours de maladie, de congé et d'absence, retenues, net, virement) est stockée en `TEXT` au format décimal (`"474.545455"`), jamais en `REAL`, jamais en nombre JavaScript.
2. **Aucun calcul dans le SQL.** Les sommes, totaux et arrondis se font dans le code avec `decimal.js`, via `packages/calcul`. Pas de `SUM`, `ROUND` ni `CAST` métier dans les requêtes.
3. **Règles métier hors de l'interface.** Elles vivent dans un module de domaine en TypeScript pur, sans import d'Electron, testable seul.
4. **Champs de synchronisation dès maintenant.** Les tables métier portent `id` (UUID texte, généré dans le processus principal), `version` (entier incrémenté à chaque modification), `mis_a_jour_le` (ISO 8601 UTC) et `supprime_le` (suppression logique). Aucune suppression physique des données métier.
5. **Jours ouvrables par ligne**, comme dans le classeur et la documentation. Valeur par défaut tirée des paramètres à l'ouverture d'une opération.
6. **Tables `STRICT` et contraintes `CHECK`**, clés étrangères activées (`PRAGMA foreign_keys = ON`), mode WAL, `busy_timeout` défini.
7. **Pas d'ORM.** SQL explicite dans une couche de dépôts, transactions via `db.transaction`. Les migrations sont des fichiers `.sql` numérotés, avec une table `schema_migrations` qui mémorise un numéro, un nom et une somme de contrôle.
8. **Pas de colonne JSON, pas de fonction SQL propre à un moteur** dans les tables métier. Le champ `detail` du journal est un texte simple.
9. **Nommage.** Tables, colonnes et champs de contrat en français `snake_case`, pour garder un seul vocabulaire entre SQLite, JSON, PostgreSQL et les annexes. Fonctions, classes et fichiers de code en anglais. La colonne du net s'appelle `net_global` (et non `global`, mot réservé dans certains contextes SQL).
10. **Correspondance de types avec PostgreSQL**, à respecter pour que la synchronisation de la phase 5 n'introduise aucune conversion à risque :

| Donnée                           | SQLite (local)      | PostgreSQL (distant) | Règle                                                      |
| -------------------------------- | ------------------- | -------------------- | ---------------------------------------------------------- |
| Montants et jours fractionnaires | `TEXT` décimal      | `NUMERIC(14,6)`      | Chaîne dans tous les JSON échangés                         |
| Identifiants                     | `TEXT` (UUID v4)    | `uuid`               | Format validé des deux côtés                               |
| Booléens                         | `INTEGER` 0 ou 1    | `boolean`            | Conversion unique dans la future couche de synchronisation |
| Dates et heures                  | `TEXT` ISO 8601 UTC | `timestamptz`        | Jamais d'heure locale                                      |
| Entiers                          | `INTEGER`           | `bigint`             | Aucun risque sur nos valeurs                               |

11. **Résultats calculés figés à la terminaison.** Tant qu'une opération est ouverte, les colonnes de résultat de `ligne_paie` valent `NULL` et les montants sont calculés à la demande par le moteur. À la terminaison, les résultats sont écrits : `net_global` à 6 décimales, `virement` arrondi au multiple de `unite_arrondi` (moitié vers le haut), calculé à partir de la valeur exacte, non de la valeur à 6 décimales.
12. **Bibliothèque partagée de contrat.** Un nouveau paquet `packages/contrat` contient les schémas `zod` des entités, des entrées et sorties de chaque canal IPC, et du format d'erreur. Il est importé par l'interface, le preload et le processus principal.

## 6. Étapes

### Lot 1

#### Étape 0 — État des lieux

1. Relance sur la machine : `npm install`, `npm run typecheck`, `npm run lint`, `npm run test:calcul`, `npm run test:api`, `npm run build:web`, `npm run build:desktop`.
2. Exécute et consigne séparément ce que le rapport de la phase 0 n'avait pas prouvé : build Docker de `apps/api` (statut « non testé » si Docker est absent), `npm run dev:web`, et **démarrage réel de la fenêtre Electron** avec la réponse de `db:ping` visible dans les journaux du processus principal.
3. Corrige toute régression. Ne marque jamais une vérification comme réussie sans l'avoir exécutée.
4. Vérifie que `packages/calcul` accepte en paramètres le diviseur de retenue (3) et l'unité d'arrondi (10) ; sinon, étends-le sans casser les vecteurs de la phase 0.
5. Résous le conflit d'ABI de `better-sqlite3` : le module est compilé pour Electron, ce qui empêche de le charger sous Node pour Vitest. Choisis une solution (exécution des tests avec `ELECTRON_RUN_AS_NODE=1`, ou deux binaires distincts), mets-la en place et documente-la dans `docs/decisions/`.

#### Étape 1 — Contrat de données, schéma et migrations

1. Crée `packages/contrat` avec les schémas `zod` correspondant à `modele-donnees-phase-1.mermaid` : entités, valeurs décimales (chaîne validée par expression régulière), UUID, dates ISO.
2. Crée l'exécuteur de migrations dans le processus principal : fichiers `NNNN_nom.sql` appliqués dans l'ordre, chacun dans une transaction, somme de contrôle enregistrée, **refus de démarrer** si la somme d'une migration déjà appliquée a changé.
3. Écris la migration `0001` : tables `parametre`, `employe`, `operation_paie`, `ligne_paie`, `journal`, en `STRICT`, avec :
   - clés étrangères et index sur `ligne_paie(operation_id)` et `ligne_paie(employe_id)` ;
   - unicité de `employe.numero`, de `(operation_paie.annee, operation_paie.mois)` et de `(ligne_paie.operation_id, ligne_paie.employe_id)` ;
   - `CHECK` : `mois` entre 1 et 12, `statut` dans (`ouverte`, `terminee`), `jours_ouvrables` ≥ 1, format décimal des champs `TEXT` numériques, valeurs non négatives ;
   - **déclencheurs** qui interdisent toute modification ou suppression d'une `ligne_paie` dont l'opération est `terminee`, et toute modification ou suppression d'une ligne de `journal` (ajout seul).
4. Écris le module d'ouverture de la base : chemin dans `app.getPath("userData")`, pragmas, exécution des migrations, **paramètre optionnel de clé de chiffrement** non utilisé pour l'instant, pour qu'un chiffrement (SQLCipher) puisse être ajouté sans toucher au reste. Consigne cette décision dans `docs/decisions/`.

#### Étape 2 — Règles métier (module de domaine)

Implémente dans `apps/desktop/src/main/domain/` les services de l'architecture, tous testables avec une base en mémoire :

- **EmployeService** : créer (numéro attribué automatiquement, modifiable, unique), modifier, désactiver. Refuser la suppression d'un employé qui apparaît dans une opération. **Toute modification de `salaire_base`, `telephone` ou `code_banque` est inscrite au journal avec la valeur avant et la valeur après.**
- **OperationService** :
  - `ouvrir(annee, mois, jours_ouvrables)` : refuse un doublon de mois, refuse `jours_ouvrables` < 1, crée une ligne par employé actif avec les copies d'identité et le salaire de base de la fiche ;
  - `ajouterNouveauxEmployes(id)` : ajoute les employés actifs absents, refusé si l'opération est terminée ;
  - `terminer(id)` : refuse si une ligne est en erreur, calcule avec le moteur, écrit résultats et copies figées de `telephone` et `code_banque`, change le statut, journalise, le tout dans **une seule transaction** (retour arrière complet en cas d'échec) ;
  - `rouvrir(id)` : remet les résultats à `NULL`, statut `ouverte`, journalise.
- **LigneService** : `modifier(ligneId, variables)` refusé si l'opération est terminée ; contrôles : valeurs ≥ 0, `jours_maladie + jours_conge + jours_absence ≤ jours_ouvrables`, net non négatif signalé comme avertissement ; retourne la ligne recalculée et les totaux de l'opération.
- **ParametreService** : lecture et mise à jour (jours par défaut, diviseur, unité d'arrondi).
- **JournalService** : ajout seul, lecture filtrée.
- **Totaux d'opération** : total à virer, total du net avant arrondi, écart d'arrondi (= total des virements − total des nets), nombre d'employés, nombre de lignes en erreur, nombre d'employés sans téléphone ou sans code banque. Tous calculés dans le code.

Les erreurs métier sont des instances d'une classe `ErreurMetier` avec un `code` stable (par exemple `OPERATION_DEJA_EXISTANTE`, `OPERATION_TERMINEE`, `JOURS_INVALIDES`) et un message en français destiné à l'utilisateur.

### Lot 2

#### Étape 3 — Pont IPC typé

1. Déclare dans `packages/contrat` un canal par action : `employes.lister|creer|modifier|desactiver`, `operations.lister|ouvrir|obtenir|terminer|rouvrir|ajouterNouveauxEmployes`, `lignes.modifier`, `parametres.lire|modifier`, `journal.lister`. Chaque canal a un schéma d'entrée et un schéma de sortie.
2. Format de réponse unique : `{ ok: true, data }` ou `{ ok: false, erreur: { code, message } }`.
3. Dans le processus principal, enregistre chaque canal avec `ipcMain.handle` : validation `zod` de l'entrée **avant** tout appel au domaine, contrôle de l'expéditeur (`event.senderFrame` doit appartenir à l'application), conversion des `ErreurMetier` en réponse d'erreur, journalisation technique des erreurs inattendues **sans montants ni coordonnées personnelles**.
4. Dans le preload, expose `window.api` via `contextBridge` avec une méthode typée par canal. **Aucun canal générique**, aucun accès à SQL, au système de fichiers ou à Node depuis l'interface.
5. `operations.obtenir` retourne l'opération, ses lignes avec leurs montants calculés (chaînes) et ses totaux, afin que l'interface n'ait jamais à recalculer.

#### Étape 4 — Tests

Vitest, base SQLite en mémoire pour le domaine, sans interface. Couvre au minimum :

- **Cas de référence de bout en bout** : employé à 500 $, HS 40, retrait 20, 22 jours, 2 de maladie, 1 de congé, 1 d'absence → ouverture, modification, terminaison : `net_global` = `"474.545455"`, `virement` = `"470"`.
- **Cas d'arrondi** : 554,99 → 550 ; 555,00 → 560 ; 557,20 → 560 ; 474,55 → 470 ; 0 → 0.
- **Immutabilité** : après terminaison, la modification et la suppression d'une ligne échouent au niveau du déclencheur SQL, pas seulement dans le domaine ; après réouverture, elles réussissent.
- **Unicité et contraintes** : doublon de mois, doublon de ligne, `jours_ouvrables` = 0, absences supérieures aux jours, décimal mal formé. Une insertion d'un type incorrect dans une table `STRICT` est refusée.
- **Atomicité** : une erreur injectée au milieu de `terminer` ne laisse aucune ligne à moitié calculée.
- **Employé désactivé** : il reste visible dans les anciennes opérations et n'est pas ajouté aux nouvelles.
- **Journal** : une modification du code banque ou du téléphone crée une entrée avec valeurs avant et après ; le journal refuse toute modification ou suppression.
- **Migrations** : rejouer deux fois est sans effet ; une somme de contrôle modifiée empêche le démarrage.
- **Contrat** : une entrée mal formée est rejetée par chaque canal ; une ligne exportée de SQLite est valide selon le schéma `zod` et ne contient que des chaînes pour les montants (test de forme entre SQLite et le futur PostgreSQL).
- **Totaux** : l'écart d'arrondi vaut la somme des virements moins la somme des nets, y compris avec plusieurs lignes.

`npm run test:desktop` exécute cette suite.

#### Étape 5 — Données d'exemple

Une commande `npm run db:seed` charge, **en développement uniquement**, les six employés du prototype (avec téléphone et code banque) et l'opération d'octobre 2026 terminée avec les variables du prototype. Elle refuse de s'exécuter si l'application est empaquetée (`app.isPackaged`) ou si la base contient déjà des données, sauf option explicite `--force`.

### Lot 3

#### Étape 6 — Sauvegarde locale

- `SauvegardeService` utilise l'API `backup` de `better-sqlite3` pour copier la base dans `userData/sauvegardes/` avec un nom daté (`rafiki_paie_AAAA-MM-JJ_HHMMSS.sqlite`).
- Déclencheurs : à chaque terminaison d'opération, et au démarrage si la dernière copie date de plus d'un jour. Conserver les 10 dernières copies.
- Une fonction `restaurer(fichier)` (sans interface) vérifie `PRAGMA integrity_check` sur la copie, met de côté la base actuelle, puis la remplace.
- Tests : la copie est lisible et identique, la rotation conserve 10 fichiers, une copie corrompue est refusée.

#### Étape 7 — Page de contrôle (développement uniquement)

Dans `apps/web`, une page `/dev/controle` appelle `window.api` et affiche : la liste des opérations avec statut et total à virer, le détail d'une opération (lignes, totaux, avertissements), les dernières entrées du journal. Elle n'est **pas** l'interface finale : aucune recherche de style, composants shadcn simples. Elle n'est accessible que si `window.api.env.estDev` vaut `true`, et un test vérifie qu'elle est absente de l'export statique de production (`apps/web/out`).

#### Étape 8 — Rapport et commits

Rédige `docs/decisions/02-rapport-phase-1.md` avec : les décisions prises seul, les écarts éventuels par rapport aux diagrammes, le résultat de chaque critère d'acceptation (réussi, échoué, non testé et pourquoi), les limites connues, et la liste des tâches de la phase 2.

## 7. Règles de travail

- PowerShell, Windows 11. Versions exactes vérifiées avant installation (`npm view`), jamais devinées.
- Aucun secret dans le dépôt, les journaux ou les réponses.
- Aucune action destructive hors du dépôt, aucun déploiement.
- Ne modifie jamais `docs/annexes/`.
- **Aucun montant, nom, téléphone ou code banque dans les journaux techniques.**
- Un commit par étape, message conventionnel (`feat:`, `test:`, `docs:`), arbre de travail propre à la fin de chaque lot.
- Si un outil échoue, tente une alternative documentée une fois, consigne le blocage et poursuis ce qui n'en dépend pas.
- À la fin d'un lot, **arrête-toi** : ne commence pas le lot suivant sans demande.

## 8. Critères d'acceptation de la phase

1. `npm install`, `npm run typecheck`, `npm run lint`, `npm run format:check` passent.
2. `npm run test:calcul`, `composer test` (dans `apps/api`) et `npm run test:desktop` passent.
3. Le cas de référence de l'étape 4 donne `"474.545455"` et `"470"` de bout en bout.
4. Les déclencheurs SQL empêchent la modification d'une paie terminée et du journal, démontré par test.
5. Une migration modifiée après application empêche le démarrage, démontré par test.
6. `window.api` n'expose que les canaux du contrat ; aucune API Node ou SQL accessible depuis l'interface, vérifié par test ou inspection documentée.
7. La page `/dev/controle` fonctionne en développement et est absente de l'export de production.
8. Une sauvegarde datée est créée à chaque terminaison, et la restauration d'une copie saine fonctionne.
9. `npm run dev:desktop` ouvre la fenêtre Electron et la page de contrôle affiche les données d'exemple (vérification manuelle par l'utilisateur, décrite dans le rapport).
10. Aucun secret versionné ; arbre Git propre ; un commit par étape.

## 9. Rapport

Chaque lot ajoute sa section à `docs/decisions/02-rapport-phase-1.md` : étapes terminées, vérifications exécutées avec leur résultat réel, écarts, blocages, informations à fournir par l'utilisateur.
