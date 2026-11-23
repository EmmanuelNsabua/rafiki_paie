# Prompt Antigravity — Phase 2, lot correctif : densité, fenêtre, thème, outils de développement

## 1. Contexte et mission

L'interface de la phase 2 fonctionne, mais deux défauts apparaissent sur les captures fournies :

1. **Tout est beaucoup trop grand.** Les dimensions viennent d'une maquette dessinée pour 1920 × 1080 et appliquées telles quelles : le titre fait 44 px, les entrées de menu 22 px, les lignes de tableau 60 px. À côté d'Antigravity (texte d'environ 14 px), l'application paraît zoomée à 150 %.
2. **La fenêtre est celle d'Electron par défaut** : barre de titre native, second bandeau « File Edit View Window », outils de développement accessibles (Ctrl+Maj+I, clic droit, F12).

**Cette phase corrige les deux.** Elle ne change **aucune logique métier, aucun calcul, aucune règle** : seuls les styles de `apps/web`, le processus principal et le preload de `apps/desktop`, et un petit espace de contrat `fenetre` sont concernés.

Livrables, en trois lots :

- **Lot 1 — Densité** (groupe F) : échelle typographique et dimensions compactes, sur tous les écrans.
- **Lot 2 — Fenêtre et thème** (groupe G, partie 1) : fenêtre sans cadre, barre de titre personnalisée, menu du logo (taille du texte, zoom, thème, fenêtre, redémarrage), palette Windows claire et sombre, thème du système par défaut, préférences mémorisées.
- **Lot 3 — Verrouillage et renommage** (groupe G, partie 2) : outils de développement bloqués dans l'application installée, nom « Gestionnaire de paie », conservation des données, durcissement, tests.

## 2. Références et prérequis

Place ces deux captures de l'utilisateur dans le dépôt avant de commencer (si elles manquent, demande-les et arrête-toi) :

- `docs/phase-2/etat-actuel-trop-grand.png` : l'application actuelle (Liste des employés, 1920 × 1080).
- `docs/phase-2/reference-densite-antigravity.png` : la densité visée (Antigravity). **Mesure-la** : taille du texte de l'explorateur, hauteur des lignes, hauteur de la barre de titre, largeur de la barre latérale. La table de la section 3.1 donne les cibles numériques ; si ta mesure s'en écarte de plus de 1 px sur le texte, signale-le dans le rapport.

Prérequis : phase 2 en cours ou terminée, `npm run typecheck`, `lint` et `test:desktop` verts. Ne modifie ni `docs/annexes/` ni le domaine.

**Invariants hérités, toujours valables** : aucun calcul ni règle métier dans l'interface ; aucune donnée métier hors de la base ; une paie terminée en lecture seule ; pas de `eval`, de style en ligne ou de ressource distante ; compatibilité `app://`. **Preuve par le rendu** : toute vérification visuelle se prouve par capture ou journal venant du processus de rendu (Playwright), jamais seulement par le processus principal ; sinon écris « non testé ».

## 3. Groupe F — Densité typographique et dimensions

### 3.1 Nouvelle échelle (valeurs à 100 %, en pixels)

Remplace toutes les dimensions héritées de la maquette 1920 × 1080 par celles-ci, dans **un seul endroit** (variables CSS dans `globals.css`).

| Élément                                | Avant                                  | Après                                                                                   |
| -------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| Racine                                 | fluide (`clamp(13px, 0.8333vw, 16px)`) | **fixe : `html { font-size: 14px }`**, multipliée par `var(--echelle-texte)` (défaut 1) |
| Titre de page                          | 44                                     | **24 / 32 / 600**                                                                       |
| Titre de carte ou de section           | 26                                     | **16 / 24 / 600**                                                                       |
| Marque « École Rafiki »                | 34                                     | **16 / 20 / 700** ; sous-titre **12 / 16**                                              |
| Entrées de menu latéral                | 22, hauteur 58                         | **14 / 20 / 500**, hauteur **36**, icône **18**, arrondi 6                              |
| Texte courant, cellules de tableau     | 21                                     | **14 / 20 / 400** (noms en 500, salaire net en 600)                                     |
| En-têtes de tableau                    | 20                                     | **12 / 16 / 500**                                                                       |
| Légendes, pieds de tableau             | 15 à 17                                | **12 / 16**                                                                             |
| Libellé de carte de synthèse           | 22                                     | **13 / 18 / 500**                                                                       |
| Valeur de carte de synthèse            | 40                                     | **24 / 32 / 700**                                                                       |
| Boutons                                | 22, hauteur 54                         | **13 / 18 / 600**, hauteur **34**, arrondi 6                                            |
| Champs et cellules de saisie           | –                                      | hauteur **32**, texte **14**                                                            |
| Pastilles                              | 15                                     | **12 / 16 / 600**, hauteur **22**                                                       |
| Date (barre du haut)                   | 22                                     | **13 / 18 / 500**                                                                       |
| Recherche globale                      | 500 × 57                               | **320 × 32**, texte **13**, pastille « Ctrl K » en **11**                               |
| Largeur de la barre latérale           | 334                                    | **232**                                                                                 |
| Hauteur de la barre du haut            | 94                                     | **52**                                                                                  |
| Barre de titre (nouvelle, lot 2)       | –                                      | **32**                                                                                  |
| Marges du contenu ; écart entre cartes | 24 ; 19                                | **20 ; 16**                                                                             |
| Lignes de tableau                      | 60                                     | **44**                                                                                  |
| Cartes de synthèse                     | 190 de haut                            | **112**                                                                                 |
| Carte d'en-tête de page                | 110 de haut                            | **64**                                                                                  |
| Dialogues ; panneaux latéraux          | 480 ; 440 à 480                        | **420 ; 400**                                                                           |
| Info-bulles                            | 14                                     | **12**                                                                                  |

Règles : aucune taille de police au-dessus de 24 px (sauf les valeurs de cartes, 24) ; les rapports de proportions de la maquette sont conservés (même disposition, mêmes alignements) ; toutes les dimensions s'écrivent en `rem` (1 rem = 14 px × échelle) pour que « Taille du texte » (lot 2) fonctionne.

### 3.2 Autres corrections de ce groupe

- Supprime l'indicateur de développement de Next (la pastille « N · 1 Issue » qui recouvre le bas de la barre latérale) : `devIndicators: false` dans `next.config`.
- Fenêtre : taille minimale **1100 × 650**.
- Les écrans doivent rester utilisables sans défilement horizontal à 1100 px de large.

### 3.3 Étapes du lot 1

1. **Mesure** : exécute un script Playwright qui relève, sur les quatre écrans, les tailles calculées (`getComputedStyle`) des éléments listés ci-dessus et les consigne dans `docs/phase-2/mesures-avant.json`.
2. **Application** de l'échelle, écran par écran : coque, Opération mensuelle, Journal de paie, Liste des employés, Réglages, dialogues, panneaux, info-bulles, états vides.
3. **Mesure après** (`mesures-apres.json`) et **captures avant et après** à 1920 × 1080 et à 1366 × 768 dans `docs/phase-2/captures-densite/`.

### 3.4 Conditions de fin du lot 1 (preuve par exécution)

1. Test automatique : sur chaque écran, `body` a `font-size` 14 px ; une entrée de menu latéral 14 px, hauteur 36 ± 1 ; une cellule de tableau 14 px ; le titre de page 24 px ; la largeur de la barre latérale 232 ± 2 ; la hauteur de la barre du haut 52 ± 1 ; une ligne de tableau 44 ± 1.
2. À **1366 × 768**, l'écran Opération mensuelle montre, sans défilement, l'en-tête, les quatre cartes et **au moins 5 lignes d'employés**.
3. Aucune police de plus de 24 px dans l'interface (contrôle automatique sur tous les éléments visibles).
4. Captures avant et après fournies aux deux tailles, **un contrôle visuel par comparaison avec `reference-densite-antigravity.png`** décrit dans le rapport.
5. `typecheck`, `lint`, `format:check`, `test:web` verts ; aucune régression du parcours Playwright de la phase 2.

## 4. Groupe G — Fenêtre, thème, outils de développement

### 4.1 Fenêtre sans cadre et barre de titre personnalisée

- `new BrowserWindow({ frame: false, autoHideMenuBar: true, title: "Gestionnaire de paie", ... })` et **`Menu.setApplicationMenu(null)`** avant toute création de fenêtre : plus de barre de titre native, **plus de bandeau « File Edit View Window »**.
- **Barre de titre** dans l'interface (composant `BarreTitre`, hauteur **32 px**, fond `--fenetre`, **sans trait inférieur**) : à gauche, **uniquement** le **logo** (tuile verte de 20 px, arrondi 4, « R » blanche) puis le nom **« Gestionnaire de paie »** (12 / 16 / 500). **Rien d'autre**, ni à droite, ni au centre.
- Toute la barre est une zone de déplacement (`-webkit-app-region: drag`), sauf le bouton du logo (`no-drag`). **Double-clic** sur la barre : agrandir ou restaurer.
- Le logo est un bouton (`aria-label` « Menu de l'application », info-bulle identique, `aria-haspopup="menu"`), accessible au clavier (Entrée, Espace, Échap pour fermer). Au survol : fond `--survol`.
- Les raccourcis système restent actifs (Alt+F4, Win+flèches). La fenêtre reste redimensionnable par ses bords.
- Sur Windows, l'événement `system-context-menu` (clic droit sur la barre) est **empêché** : aucun menu système ni menu d'outils de développement.

### 4.2 Menu du logo

Panneau flottant sous le logo (composant `Popover`, largeur **300**, arrondi 8, ombre douce, fond `--carte`, texte 13 px), trois sections séparées par un trait fin :

1. **Affichage**
   - **Taille du texte** : ligne « Taille du texte » avec boutons `−` et `+` et la valeur (« 14 px ») ; pas de 1 px entre **12 et 20** ; bouton « Rétablir ». Elle règle `--echelle-texte` (valeur/14) sur la racine.
   - **Zoom** : `−`, valeur (« 100 % »), `+`, « Rétablir » ; de **50 % à 200 %**, par pas de 10 % ; appelle `webContents.setZoomFactor`. Raccourcis affichés à droite : Ctrl+−, Ctrl++, Ctrl+0.
   - **Thème** : trois boutons segmentés **« Système »** (défaut), **« Clair »**, **« Sombre »**, avec icônes moniteur, soleil, lune.
2. **Fenêtre** : **« Réduire »**, **« Agrandir »** (devient **« Restaurer »** quand la fenêtre est agrandie), **« Fermer »** (Alt+F4).
3. **Application** : **« Redémarrer l'application »** (icône flèches circulaires) ; en bas, une ligne discrète « Version 0.x.y » (valeur lue par IPC).

Les boutons `−`, `+`, les trois thèmes ne ferment pas le panneau ; les actions de fenêtre et de redémarrage le ferment.

**Raccourcis**. Comme il n'y a plus de menu d'application, enregistre à la main dans `webContents.on("before-input-event")` : Ctrl + `=` ou `+` (y compris pavé numérique) = zoom avant ; Ctrl + `-` = zoom arrière ; Ctrl + `0` = rétablir ; et gère l'événement `zoom-changed` (Ctrl + molette). Ajuste de la même façon et mets à jour l'état du menu.

### 4.3 Thème : suit le système par défaut, palette Windows

- **Au démarrage** : `nativeTheme.themeSource` = préférence mémorisée, `"system"` par défaut. Le CSS s'appuie sur `prefers-color-scheme`, que `themeSource` pilote : pas de classe de thème à gérer côté interface. Changer le thème dans le menu appelle `fenetre.definirTheme("systeme" | "clair" | "sombre")`, qui met à jour `themeSource`. Quand le thème du système change pendant que l'application tourne en mode « Système », l'interface suit sans redémarrage.
- **La fenêtre, la barre de titre, la barre latérale, la barre du haut et le fond de page ont la même couleur** : celle que Windows 11 utilise pour ses fenêtres. Seules les cartes se détachent. Définis `BrowserWindow.backgroundColor` selon le thème au démarrage et à chaque changement (`nativeTheme.on("updated")`), pour supprimer tout flash blanc.

**Tokens (remplacent `--page` et `--surface` de la phase 2) :**

| Token                                                                     | Clair                             | Sombre                            |
| ------------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| `--fenetre` (barre de titre, barre latérale, barre du haut, fond de page) | `#F3F3F3`                         | `#202020`                         |
| `--carte` (cartes, tableaux, panneaux, menus)                             | `#FFFFFF`                         | `#2B2B2B`                         |
| `--entete-tableau`                                                        | `#F9F9F9`                         | `#272727`                         |
| `--trait`                                                                 | `#E5E5E5`                         | `#3A3A3A`                         |
| `--texte`                                                                 | `#1A1A1A`                         | `#FFFFFF`                         |
| `--texte-2`                                                               | `#5F5F5F`                         | `#C5C5C5`                         |
| `--survol`                                                                | `rgba(0,0,0,.05)`                 | `rgba(255,255,255,.06)`           |
| `--primary` (fonds pleins, texte blanc dessus)                            | `#16A34A`                         | `#15803D`                         |
| `--primary-strong` (petit texte ou contour vert)                          | `#15803D`                         | `#4ADE80`                         |
| `--primary-tint` / texte                                                  | `#DCFCE7` / `#15803D`             | `#14532D` / `#86EFAC`             |
| `--danger` / `--danger-tint`                                              | `#DC2626` / `#FEE2E2`             | `#F87171` / `#3B1A1D`             |
| `--warning-tint` / `--warning-trait` / `--warning-texte`                  | `#FEF3C7` / `#FCD34D` / `#92400E` | `#3A2E10` / `#7A5A12` / `#FCD34D` |

Les valeurs `--fenetre` et `--carte` sont les couleurs de base de Windows 11 (Fluent) en clair et en sombre. Le logo vert, l'entrée de menu active (vert plein, texte blanc) et les pastilles de variation (vert et rouge) restent ceux de la maquette. Vérifie le contraste de chaque paire texte/fond dans les deux thèmes (≥ 4,5 : 1 pour le texte courant) et corrige au besoin en restant au plus près de ces valeurs.

### 4.4 Outils de développement bloqués (application installée)

Dans l'application **empaquetée** (`app.isPackaged`), **tout accès aux outils de développement est impossible** par les voies ordinaires :

- `webPreferences: { devTools: false }`.
- Raccourcis neutralisés dans `before-input-event` (`event.preventDefault()`) : **Ctrl+Maj+I**, **Ctrl+Maj+J**, **Ctrl+Maj+C**, **F12**, **Ctrl+U**, ainsi que **F5**, **Ctrl+R**, **Ctrl+Maj+R** (le rechargement perdrait une saisie en cours ; l'utilisateur dispose de « Redémarrer l'application »).
- **Clic droit** : `webContents.on("context-menu")` est géré ; il n'existe **aucun** menu « Inspecter ». Seul un **menu minimal** apparaît, uniquement dans un champ de saisie ou sur un texte sélectionné : « Couper », « Copier », « Coller », « Tout sélectionner » (bouton grisé s'il ne s'applique pas), construit avec `Menu.buildFromTemplate`. Partout ailleurs : aucun menu.
- Filet de sécurité : `webContents.on("devtools-opened", () => webContents.closeDevTools())`.
- Au démarrage de l'application installée, si la ligne de commande contient `--remote-debugging-port`, `--remote-debugging-pipe` ou `--inspect*`, **quitte immédiatement**. Ajoute à la configuration d'`electron-builder` (hook `afterPack`) les **fusibles Electron** `@electron/fuses` : `EnableNodeCliInspectArguments` désactivé, `EnableNodeOptionsEnvironmentVariable` désactivé, `OnlyLoadAppFromAsar` activé.
- **En développement** (`!app.isPackaged`), les outils de développement restent **fermés par défaut** et ne s'ouvrent que si la variable d'environnement `RAFIKI_DEVTOOLS=1` est définie (script `npm run dev:desktop:devtools`).

Ce blocage écarte l'utilisateur normal ; il ne prétend pas arrêter un développeur déterminé qui modifierait le programme. Écris-le tel quel dans le rapport.

### 4.5 Préférences de l'interface

Stocke dans `userData/preferences-interface.json` (jamais dans la base métier, ni dans `localStorage`) : `theme` (`systeme`, `clair`, `sombre`), `zoom` (0,5 à 2,0), `tailleTexte` (12 à 20), et la dernière position et taille de la fenêtre avec son état agrandi. Validation `zod` à la lecture ; en cas de fichier absent, invalide ou corrompu : valeurs par défaut, sans erreur affichée. Écriture groupée et différée (≈ 300 ms). Les préférences s'appliquent **avant l'affichage de la fenêtre** pour éviter tout saut visuel.

### 4.6 Canaux ajoutés (espace `fenetre`)

Dans `packages/contrat` et le preload, sans accès générique :

| Canal                                                                   | Rôle                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `fenetre.lirePreferences`                                               | Lit les préférences et l'état (agrandi ou non, version) |
| `fenetre.definirTheme`                                                  | `"systeme" \| "clair" \| "sombre"`                      |
| `fenetre.definirZoom`                                                   | Facteur de 0,5 à 2,0                                    |
| `fenetre.definirTailleTexte`                                            | Entier de 12 à 20                                       |
| `fenetre.reduire` · `fenetre.basculerAgrandissement` · `fenetre.fermer` | Actions de fenêtre                                      |
| `fenetre.redemarrer`                                                    | Relance l'application                                   |

Entrées validées par `zod` ; **contrôle de l'expéditeur** identique aux autres canaux ; l'état « agrandi » remonte à l'interface par un événement pour mettre à jour le libellé « Agrandir ou Restaurer ».

### 4.7 Fermeture et redémarrage sans perte

Avant de fermer la fenêtre ou de redémarrer, le processus principal envoie `avant-fermeture` à l'interface. L'interface **termine les enregistrements en attente** (anti-rebond des cellules, requêtes en cours) et répond ; le processus principal attend au plus **2 secondes**, puis ferme ou relance (`app.relaunch()` puis `app.exit(0)`). Cela vaut pour Alt+F4, le bouton « Fermer » et « Redémarrer l'application ».

### 4.8 Nom « Gestionnaire de paie » sans perdre les données

- Nom affiché partout : titre de la fenêtre, barre de titre, `<title>`, `productName` d'`electron-builder` (nom du programme, du raccourci et de l'installeur), nom de l'application dans le menu Démarrer.
- **Attention : changer `productName` change le dossier `userData`, donc la base serait introuvable.** Avant de renommer, **relève le chemin `userData` actuel** (note-le dans le rapport) et **fixe-le explicitement** avec `app.setPath("userData", …)` sur ce même dossier, **ou** migre au premier lancement la base, ses sauvegardes et les préférences vers le nouveau dossier, sans perte et sans écraser. Prouve-le par un test : une base créée avec l'ancien dossier est retrouvée après le renommage.
- Le sous-titre « Gestionnaire de paie » sous « École Rafiki » dans la barre latérale ne change pas.

### 4.9 Étapes des lots 2 et 3

**Lot 2 :** (1) fenêtre sans cadre, menu d'application supprimé, barre de titre ; (2) menu du logo, canaux `fenetre`, préférences, raccourcis de zoom ; (3) thème système et palette Windows (tokens, `backgroundColor`, contraste) ; (4) fermeture et redémarrage sans perte.
**Lot 3 :** (5) verrouillage des outils de développement et fusibles ; (6) renommage et conservation des données ; (7) tests et rapport.

## 5. Preuves et tests

Playwright avec `_electron` (`npm run test:e2e`), en plus des tests de composants. Captures dans `docs/phase-2/captures-fenetre/`, en clair et en sombre.

1. `Menu.getApplicationMenu()` vaut `null` ; la fenêtre est sans cadre ; son titre est « Gestionnaire de paie » ; la barre de titre contient le logo et le nom, **et rien d'autre**.
2. Le clic sur le logo ouvre le menu avec toutes ses entrées ; chaque action est testée : taille du texte (le `font-size` calculé change), zoom (`getZoomFactor`), thème (`nativeTheme.themeSource` et couleur de fond calculée = token attendu dans chaque thème), réduire, agrandir et restaurer, fermer.
3. **Thème du système** : avec `themeSource = "system"`, forcer le thème clair puis sombre du système (via `nativeTheme.themeSource` simulé dans le test) change les couleurs sans redémarrage ; la couleur de la barre de titre est **identique** à celle de la barre latérale, de la barre du haut et du fond de page dans les deux thèmes (vérifié par `getComputedStyle`).
4. **Outils de développement** (application empaquetée, `app.isPackaged`) : Ctrl+Maj+I, Ctrl+Maj+J, F12 n'ouvrent rien (`isDevToolsOpened()` faux) ; `devTools` désactivé dans les préférences web ; un clic droit sur une zone sans champ ne montre aucun menu ; un clic droit dans un champ montre seulement « Couper, Copier, Coller, Tout sélectionner » ; un clic droit sur la barre de titre ne montre aucun menu système ; le lancement avec `--remote-debugging-port` quitte l'application.
5. **Préférences** : thème, zoom, taille du texte et position de la fenêtre sont retrouvés après un redémarrage ; un `preferences-interface.json` corrompu ne casse rien.
6. **Fermeture sans perte** : saisir une valeur dans une cellule puis fermer immédiatement (Alt+F4 simulé) enregistre la valeur.
7. **Renommage** : voir 4.8, avec le test de conservation de la base.
8. **Redémarrage** : testé avec un espion sur `app.relaunch` (variable `RAFIKI_TEST=1`) ; ajoute dans le rapport la procédure de vérification manuelle.

## 6. Règles de travail

- PowerShell, Windows 11. Versions exactes vérifiées avant installation (`npm view`).
- Un commit par étape ; arbre propre à la fin de chaque lot ; **arrête-toi à la fin d'un lot**.
- Ne marque « réussi » que ce que tu as exécuté ; sinon « non testé » avec la raison.
- Aucun secret dans le dépôt. Pas de déploiement.
- Si une consigne se révèle impossible ou dangereuse sur Windows (par exemple un comportement de zone de déplacement), signale-le avec une alternative plutôt que de la contourner en silence.

## 7. Critères d'acceptation

1. Lot 1 : les cinq conditions de la section 3.4.
2. Lot 2 : barre de titre limitée au logo et au nom ; menu du logo complet et fonctionnel ; aucun bandeau de menu ; thème du système suivi par défaut ; couleurs de la barre de titre, de la barre latérale, de la barre du haut et du fond identiques dans les deux thèmes ; préférences conservées.
3. Lot 3 : outils de développement bloqués dans l'application installée par toutes les voies du 4.4 ; nom « Gestionnaire de paie » ; base conservée après renommage ; fermeture sans perte ; fusibles activés.
4. `typecheck`, `lint`, `format:check`, `test:calcul`, `test:desktop`, `test:web`, `test:e2e` verts.
5. Rapport `docs/decisions/rapport-phase-2-densite-fenetre.md` : chaque critère marqué réussi, échoué ou non testé, avec sa preuve (capture ou journal du rendu), le chemin `userData` retenu, les limites du blocage des outils de développement, et les écarts avec ce prompt.
