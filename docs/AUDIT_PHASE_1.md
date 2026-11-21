# Audit de la phase 1 — Paie Rafiki

Dépôt audité : `EmmanuelNsabua/rafiki_paie`, branche `main`, état du 20 novembre 2026.

## 1. Portée et méthode

- Lecture du code source : migration SQL, migrateur, base, six services du domaine, gestionnaires IPC, preload, processus principal, schémas du contrat, moteur de calcul, sauvegarde, configuration de compilation, CI.
- Installation des dépendances dans un environnement Linux (Node 22), compilation de `packages/calcul`, `packages/contrat` et `apps/desktop`, inspection du code produit.
- Exécution de la suite de tests existante, puis de **six essais ciblés** écrits pour l'audit (supprimés ensuite, rien n'est modifié dans le dépôt).
- Chaque constat porte un niveau de preuve : **Confirmé** (reproduit par un essai), **Lu** (visible dans le code), **À vérifier** (déduit du fonctionnement d'Electron, non exécutable dans mon environnement).

**Non vérifié :** exécution d'Electron et du `.exe` empaqueté, tests PHP (PHP absent), build Docker, comportement sous Windows, audit de secrets dans l'historique Git.

## 2. Verdict

Le noyau métier est solide : les calculs, l'immutabilité des paies terminées, les migrations contrôlées et la validation des entrées fonctionnent, et les 36 tests annoncés passent bien (reproduit). **Mais l'application n'a jamais été prouvée de bout en bout dans une vraie fenêtre Electron.** Trois défauts, déduits du code, risquent de la rendre inutilisable (section 3.1), et un défaut de conception sur le code banque peut provoquer des virements mal adressés (section 3.2).

Le rapport de phase 1 est honnête sur un point : le critère 9 est marqué « PRÊT » et non « RÉUSSI ».

## 3. Constats

### 3.1 Critiques — l'application risque de ne pas fonctionner (à vérifier à l'exécution)

| N°  | Constat                                                                                                                                                                                                                                                                                                                                                                       | Preuve                         | Correctif                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **Le preload charge `@rafiki/contrat` à l'exécution.** `tsup` ne l'embarque pas, car il traite les `dependencies` comme externes : le fichier compilé contient `require("@rafiki/contrat")`. Un preload en mode `sandbox: true` ne peut charger que les modules intégrés d'Electron. Résultat probable : le preload échoue et `window.api` n'existe pas, donc plus aucun IPC. | Lu (compilation) et À vérifier | Embarquer le contrat dans le preload avec `noExternal: ['@rafiki/contrat']`, ou ne pas importer le contrat dans le preload. Test : ouvrir les outils de développement et taper `window.api`. |
| C2  | **`estDev` est calculé dans le preload avec `process.env.NODE_ENV === 'development'`**, que `npm run dev:desktop` ne définit jamais pour Electron. La page `/dev/controle` refuse alors de s'afficher en développement.                                                                                                                                                       | Lu et À vérifier               | Calculer `estDev` dans le processus principal (`!app.isPackaged`) et le transmettre au preload par `webPreferences.additionalArguments`.                                                     |
| C3  | **L'application installée ne contient probablement pas l'interface.** `build.files` référence `../web/out/**/*`, hors du dossier de l'application, et le code principal cherche `../../../web/out/index.html` hors de l'archive. Le rapport de phase 0 prouve l'existence de `Paie Rafiki.exe`, pas qu'il affiche quelque chose.                                              | Lu et À vérifier               | Copier `apps/web/out` dans `extraResources` et le charger depuis `process.resourcesPath`. Lancer le `.exe` et confirmer qu'une page s'affiche.                                               |

### 3.2 Élevés

| N°  | Constat                                                                                                                                                                                                                                                                                                                                                                                                       | Preuve       | Correctif                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E1  | **Le code banque vaut `'804'` par défaut partout** : schéma SQL, services, schémas du contrat, seed. Essai : un employé créé sans code reçoit `804` ; si on vide ensuite son code, la paie terminée fige `804` ; le compteur « sans code banque » reste à 0, donc l'avertissement exigé par l'addendum ne peut jamais se déclencher. Conséquence : un virement envoyé à un mauvais destinataire, sans alerte. | **Confirmé** | Supprimer tous les `'804'` par défaut et les `                                                                                                                                 |     | '804'`. La comptabilité confirme que tous les employés ont le même code : en faire un paramètre de l'école copié dans chaque fiche (voir `SPEC_BORDEREAU_BANQUE.md`). Valeur fixée par le client : 840 (le 804 du dépôt est erroné). Une migration `0002`est nécessaire, car`0001` est protégée par somme de contrôle. |
| E2  | **La politique de contenu (CSP) est inefficace et laxiste.** Elle n'est ajoutée qu'aux réponses HTTP : une page chargée par `file://` en production n'en reçoit aucune. Elle contient en plus `'unsafe-inline'` et `localhost:3000` en production. Le correctif `unsafe-eval` proposé en développement n'a pas été appliqué.                                                                                  | Lu           | Insérer la CSP dans le HTML exporté (balise `meta`) ou servir l'interface par un protocole personnalisé qui pose l'en-tête. Deux CSP distinctes : développement et production. |
| E3  | **Aucune restriction de navigation.** Pas de `setWindowOpenHandler` ni de `will-navigate`, alors que le contrôle de l'expéditeur accepte n'importe quel `file://` et tout `localhost:3000`, et que le preload est exposé à toute page chargée.                                                                                                                                                                | Lu           | Refuser toute navigation hors de l'origine de l'application, ouvrir les liens externes dans le navigateur système, resserrer `verifierExpediteur`.                             |
| E4  | **`ajouterNouveauxEmployes` ignore les jours ouvrables de l'opération.** Essai : opération à 20 jours, employé ajouté ensuite → sa ligne a 22 jours (`A=20, B=22`), donc un prorata faux.                                                                                                                                                                                                                     | **Confirmé** | Reprendre les jours ouvrables de l'opération, mémoriser la valeur d'ouverture.                                                                                                 |
| E5  | **On peut insérer une ligne dans une paie terminée.** Les déclencheurs ne couvrent que `UPDATE` et `DELETE`, pas `INSERT`.                                                                                                                                                                                                                                                                                    | **Confirmé** | Ajouter un déclencheur `BEFORE INSERT ON ligne_paie` (migration `0002`).                                                                                                       |
| E6  | **Le contrôle décimal SQL est trop faible.** `GLOB '[0-9]*'` accepte `12abc`. Essai : un salaire `12abc` est enregistré. Seule la validation zod de l'IPC protège aujourd'hui.                                                                                                                                                                                                                                | **Confirmé** | Remplacer par un contrôle de forme strict (un seul point, aucun caractère étranger) dans la migration `0002`.                                                                  |

### 3.3 Moyens

| N°  | Constat                                                                                                                                                                                                                                                                         | Preuve                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| M1  | **Faux sentiment de chiffrement.** `cleChiffrement` est ignorée sans erreur (`try/catch` vide) si SQLCipher est absent. Les salaires, téléphones, codes bancaires et les 10 sauvegardes sont en clair. Il faut au moins lever une erreur si une clé est fournie sans SQLCipher. | Lu                           |
| M2  | **`restaurer()` laisse l'application sur une connexion fermée.** La base est fermée puis rouverte, mais les services IPC gardent l'ancienne référence. Pas encore exposé à l'interface ; à corriger avant de l'exposer. Les migrations ne sont pas rejouées après restauration. | Lu                           |
| M3  | **Journal d'audit incomplet.** Une modification de retrait ne laisse aucune trace (0 entrée, confirmé). Idem pour les changements de diviseur et d'unité d'arrondi, et la désactivation d'un employé est journalisée comme une simple mise à jour.                              | **Confirmé** (retrait) et Lu |
| M4  | **Le salaire d'une ligne ne suit pas la fiche.** Essai : fiche corrigée à 600, ligne restée à 500, et `lignes.modifier` ne permet pas de la corriger. Il faut une action « actualiser depuis la fiche », journalisée.                                                           | **Confirmé**                 |
| M5  | **CI incomplète.** `test:desktop` n'y figure pas (le lanceur est codé en dur sur `electron.exe`), ni `format:check`, ni le build Docker. Les sauvegardes sont sur le même disque que la base. Pas de verrou d'instance unique.                                                  | Lu                           |
| M6  | **Net négatif : erreur au lieu d'avertissement.** Le moteur lève `GLOBAL_NEGATIF`, ce qui bloque la terminaison ; le prompt demandait un avertissement. À trancher.                                                                                                             | Lu                           |

### 3.4 Faibles

- Messages visibles sans apostrophe : « L opération », « l identifiant », « d absence ».
- Le script `lint` de `apps/web` utilise `next lint`, retiré de Next 16 (le lint racine fonctionne).
- Les tests du moteur sont 4 contre 6 annoncés en phase 0 : écart non expliqué.
- Les jours fractionnaires passent par `parseFloat` avant le moteur décimal : sans effet sur des demi-journées, mais incohérent avec la règle « jamais de flottant ».
- Le numéro d'un employé supprimé logiquement reste réservé par la contrainte d'unicité et provoque une erreur SQL brute au lieu d'une erreur métier.

## 4. Ce qui est solide (reproduit ou lu)

- 36 tests desktop et 4 tests du moteur passent.
- Déclencheurs `UPDATE` et `DELETE` effectifs sur les paies terminées et le journal.
- Migrateur transactionnel avec somme de contrôle qui normalise les fins de ligne Windows.
- `terminer` et `rouvrir` atomiques ; résultats figés réellement relus depuis la base pour les paies terminées (les changements de paramètres ne modifient pas les anciennes paies).
- Validation zod avant tout appel au domaine ; erreurs techniques journalisées sans montant ni coordonnée.
- `contextIsolation`, `sandbox` et `nodeIntegration: false` correctement réglés ; page de contrôle exclue de l'export de production.

## 5. Plan de correction recommandé

1. **Prouver que l'application démarre** : ouvrir la fenêtre Electron, vérifier `window.api`, `db:ping` et la page de contrôle (C1, C2).
2. **Prouver que l'installeur fonctionne** : lancer le `.exe` empaqueté (C3).
3. **Corriger le code banque** (E1), puis la migration `0002` (E1, E5, E6).
4. **Durcir Electron** (E2, E3, M1).
5. **Corriger la logique** (E4, M2, M3, M4, M6).
6. **Compléter la CI** (M5).

## 6. Prompt de correction à transmettre à Agy

> Tu corriges la phase 1 du projet Paie Rafiki à partir du fichier `docs/AUDIT_PHASE_1.md`. Exécute **un seul groupe à la fois**, committe, rapporte et arrête-toi. Pour chaque constat, écris d'abord un test qui échoue, puis le correctif, puis relance les tests. N'écris « réussi » que pour ce que tu as réellement exécuté ; indique « non testé » sinon.
>
> **Groupe A — Démarrage réel (C1, C2, C3).** Embarque `@rafiki/contrat` dans le preload (`noExternal`). Calcule `estDev` dans le processus principal et passe-le au preload par `additionalArguments`. Corrige l'empaquetage (`extraResources`, chemin via `process.resourcesPath`). Preuve exigée : sortie des journaux montrant `window.api` défini et `db:ping` reçu en développement, puis le `.exe` empaqueté qui affiche une page.
>
> **Groupe B — Données (E1, E4, E5, E6).** Supprime toute valeur par défaut `804` et tout `|| '804'`. Écris la migration `0002` (ne modifie jamais `0001`) : déclencheur `BEFORE INSERT` sur `ligne_paie` pour les paies terminées, contrôles décimaux stricts. Reprends les jours ouvrables de l'opération dans `ajouterNouveauxEmployes`. Le compteur « sans code banque » doit fonctionner. Le code banque est identique pour tous les employés : il devient un paramètre de l'école (`parametre.code_banque_defaut`) copié à la création de chaque employé, jamais une valeur par défaut du schéma. Applique `SPEC_BORDEREAU_BANQUE.md` (téléphone de paiement, validation, doublons, export PDF et Excel). **La valeur du code est 840, fixée par le client, et non 804** : elle est la valeur initiale du paramètre, remplace toute mention de 804 (code, seed, tests, documentation) et n'est jamais écrite en dur.
>
> **Groupe C — Sécurité Electron (E2, E3, M1).** CSP effective en développement et en production (balise `meta` ou protocole personnalisé), sans `unsafe-inline` ni `localhost:3000` en production. `setWindowOpenHandler` et `will-navigate` restrictifs. Erreur explicite si `cleChiffrement` est fournie sans SQLCipher.
>
> **Groupe D — Logique (M2, M3, M4, M6).** Restauration qui recrée proprement les services et rejoue les migrations. Journal pour les modifications de lignes (retrait, HS, jours), les paramètres et la désactivation d'un employé. Action « actualiser le salaire d'une ligne depuis la fiche », journalisée. Net négatif : avertissement affiché, terminaison bloquée seulement après confirmation explicite, comportement décrit dans le rapport.
>
> **Groupe E — Qualité (M5 et faibles).** `test:desktop` et `format:check` dans la CI, lanceur de tests portable, apostrophes des messages, script `lint` de `apps/web`, erreurs métier pour la réutilisation d'un numéro supprimé.
