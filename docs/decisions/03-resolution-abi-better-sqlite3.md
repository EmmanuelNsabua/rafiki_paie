# Décision technique : Résolution du conflit d'ABI de better-sqlite3

## 1. Contexte et Problématique

Dans l'application Paie Rafiki :

- L'environnement hôte dispose de Node.js v26 (utilisant l'ABI interne `NODE_MODULE_VERSION 147`).
- L'application desktop Electron utilise Electron 42 (basé sur Chromium / Node.js avec `NODE_MODULE_VERSION 146`).
- Le module natif `better-sqlite3@12.11.1` est compilé pour Electron (`NODE_MODULE_VERSION 146`).

Lorsqu'un exécutable `node` classique tente de charger `better-sqlite3` lors de l'exécution des tests Vitest, une erreur `ERR_DLOPEN_FAILED` survient :

```
Error: The module '...better_sqlite3.node' was compiled against a different Node.js version using NODE_MODULE_VERSION 146. This version of Node.js requires NODE_MODULE_VERSION 147.
```

## 2. Options Envisagées

1. **Option A : Deux binaires distincts ou compilation croisée**
   - Maintenir deux versions de `better_sqlite3.node` dans des dossiers distincts et intercepter le chargement via un wrapper ou recompiler avant chaque suite de tests (`electron-rebuild` vs `node-gyp rebuild`).
   - _Inconvénients_ : Nécessite la présence des outils de build C++ (Visual Studio Build Tools) sur la machine hôte pour la version Node, ralentit considérablement la CI et crée un risque de divergence de comportement ou de version de SQLite entre le runtime et les tests.

2. **Option B : Exécution des tests via Electron en mode Node (`ELECTRON_RUN_AS_NODE=1`)**
   - Utiliser le binaire d'Electron déjà présent dans `node_modules/electron/dist/electron.exe` en activant la variable d'environnement `ELECTRON_RUN_AS_NODE=1`.
   - Dans ce mode, Electron s'exécute exactement comme un interpréteur Node.js, mais avec son ABI native (`NODE_MODULE_VERSION 146`), identique à celle utilisée par l'application en production.
   - _Avantages_ :
     - Zéro recompilation.
     - Aucune dépendance envers un compilateur C++ local.
     - Garantie absolue que les tests du domaine s'exécutent sur le même moteur V8/Node et avec la même librairie SQLite que le runtime de production.

## 3. Décision Adoptée

Nous retenons l'**Option B**.

Un script runner `scripts/run-desktop-tests.mjs` a été mis en place. Il lance l'exécutable Electron avec `ELECTRON_RUN_AS_NODE=1` pour exécuter Vitest sur `apps/desktop/tests/`. La commande standard npm est configurée ainsi :

```json
"test:desktop": "node scripts/run-desktop-tests.mjs run --dir apps/desktop/tests"
```

Cette solution est transparente, robuste, et garantit la parité d'exécution stricte entre les tests et le runtime Electron.
