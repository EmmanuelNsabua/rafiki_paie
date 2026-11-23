# Prompt Antigravity — Phase 2 (v2) : interface selon la maquette de l'école

Ce prompt **remplace** `PROMPT_ANTIGRAVITY_PHASE_2.md`. Il décrit l'interface d'après la maquette dessinée par le client.

## 1. Mission

Les phases 0 et 1 ont posé le monorepo, le moteur de calcul, la base SQLite, les règles métier et le pont IPC. **Cette phase construit l'interface réelle de l'application desktop** dans Next.js avec shadcn/ui, branchée sur la vraie base par `window.api`.

**À la fin de la phase, on doit pouvoir démontrer : une paie complète saisie avec la vraie base.** Concrètement : créer l'opération du mois, saisir les variations des employés, voir les montants se recalculer, saisir des absences, terminer la paie, la rouvrir, gérer les employés et les réglages, fermer l'application, la rouvrir et tout retrouver.

**Hors périmètre** (phase 3) : bulletins de paie, bordereau de virement, récapitulatif, exports PDF et Excel, import du classeur Excel. Les boutons correspondants sont **affichés mais inactifs** (voir 6.4), sans aucune logique derrière.

## 2. Prérequis et références

Ce prompt a été écrit **sans relire le code actuel**. Les noms de canaux viennent de la phase 1. En cas de différence, **`packages/contrat` fait foi** : adapte l'interface, ne modifie pas le domaine, sauf pour les extensions de la section 5.

**Prérequis, à vérifier à l'étape 0.** Si l'un manque, arrête-toi et signale-le, sans le corriger toi-même :

- les groupes A, A2 et B de la correction de la phase 1 sont terminés et poussés (application empaquetée stylée, `window.api` défini, code banque en paramètre de l'école, `operation_paie.jours_ouvrables` existant) ;
- `AGENTS.md` et `docs/decisions/` sont lisibles.

**Référence visuelle : `docs/phase-2/maquette-reference.png`** (si le fichier manque, demande-le à l'utilisateur et arrête-toi). C'est une capture 1920 × 1080 dessinée par le client : **elle fait foi pour la composition, les proportions, les espacements et le style**. Ouvre-la et regarde-la avant d'écrire une ligne d'interface. Ses données (noms, montants, « Données d'exemple ») sont fictives : ne les reprends pas. La section 6 décrit la maquette et liste les **écarts assumés** (6.1) : en cas de contradiction entre la maquette et ce prompt, **ce prompt prime**.

Les fichiers `DESIGN_ECRAN_OPERATION.md` et `DESIGN_INTERFACE_V2.md`, s'ils existent dans le dépôt, sont **abandonnés** : ne t'en sers pas.

## 3. Invariants non négociables

1. **Aucun calcul métier dans l'interface.** Tous les montants, totaux, pourcentages et moyennes affichés viennent du processus principal. L'interface met en forme ; elle ne calcule jamais un net, un total, une moyenne, un pourcentage, un arrondi ni un prorata. `decimal.js` n'est autorisé que pour **formater** une chaîne.
2. **Aucune règle métier dans l'interface.** Validations, blocages, avertissements viennent du domaine. L'interface les affiche. Elle peut seulement aider à la saisie (caractères acceptés, champ vide) et filtrer des listes par texte.
3. **Aucune donnée métier hors de la base.** Pas de `localStorage`, pas de copie persistante en mémoire. Chaque écran relit la base par IPC.
4. **Les montants sont des chaînes**, de la saisie à l'affichage. Jamais de `Number`, `parseFloat` ni d'opérateur arithmétique sur un montant.
5. **Une paie terminée est en lecture seule** dans toute l'interface, sans exception.
6. **Aucune valeur par défaut métier dans le code** (ni code banque, ni jours ouvrables, ni diviseur de retenue) : tout vient de la base. Les textes d'aide qui citent une règle (« 1/3 du salaire journalier ») lisent le paramètre.
7. **Compatibilité future avec une politique de contenu stricte** : pas de `eval`, pas de script ni de style en ligne que Next ne génère pas lui-même, pas de contenu distant, pas de police ou d'image externes.
8. **L'interface fonctionne dans le protocole `app://`** de l'application empaquetée et sur `http://localhost:3000` en développement : aucun chemin absolu `file://`, aucun lien en dur.

## 4. Choix techniques arrêtés

- **Routage compatible avec l'export statique** (`output: "export"`, `trailingSlash: true`). Routes : `/operation/` (Opération mensuelle), `/journal-de-paie/`, `/employes/`, `/reglages/`. L'identifiant d'une opération passe par la requête : `/operation/?id=<uuid>` (lue avec `useSearchParams` dans un `Suspense`). Sans `id`, `/operation/` affiche l'opération **en cours**, sinon la plus récente, sinon l'état vide. La racine `/` redirige vers `/operation/`.
- **Accès aux données.** `lib/api.ts` encapsule `window.api` : déballe `{ ok, data } | { ok: false, erreur }`, lève une `ErreurMetier` typée, et signale l'absence de `window.api` (écran « Cette page doit être ouverte dans l'application Paie Rafiki »).
- **État serveur.** `@tanstack/react-query` : requêtes, invalidation après mutation, états de chargement et d'erreur.
- **Composants.** shadcn/ui : `button`, `input`, `label`, `select`, `switch`, `dialog`, `alert-dialog`, `sheet`, `table`, `badge`, `skeleton`, `tooltip`, `popover`, `dropdown-menu`, `command`, `sonner`, `form` (avec `react-hook-form` et `zod`).
- **Police : Poppins** (graisses 400, 500, 600, 700), fichiers embarqués dans l'application (pas de CDN), repli `"Segoe UI", system-ui, sans-serif`. Active `font-variant-numeric: tabular-nums` partout où des montants sont alignés ; **si Poppins n'a pas de chiffres tabulaires, applique « IBM Plex Sans » (embarquée) aux montants uniquement** et note-le dans le rapport.
- **Échelle fluide.** La maquette est dessinée à 1920 × 1080. Toutes les dimensions s'écrivent en **rem**, avec 1 rem = 16 px à 1920 px de large : racine `html { font-size: clamp(13px, 0.8333vw, 16px); }`. Les valeurs en pixels de la section 6 sont celles de la maquette ; divise-les par 16 pour obtenir les rem. Fenêtre Electron : taille minimale 1200 × 680, titre « Paie Rafiki ».
- **Thème clair uniquement** pour cette phase.
- **Formats.** `lib/format.ts` : `formaterMontant(chaine, decimales)` (arrondi moitié vers le haut, séparateur de milliers espace insécable fine, virgule décimale, suffixe « $ » précédé d'une espace insécable : « 15 000 $ », « 474,55 $ »), `formaterPourcentage(chaine)` (« +2,5 % » avec signe et espace insécable fine avant %), `libelleMois(n)`, `libelleOperation(annee, mois)`, `formaterDate(date)` (« Dimanche 22 nov. 2026 »), `normaliserSaisieDecimale(texte)` (voir 6.4).
- **Tests.** Vitest et Testing Library pour les composants (`npm run test:web`). Playwright avec `_electron` pour le parcours complet (`npm run test:e2e`).

## 5. Extensions autorisées du contrat

Seules extensions permises, si elles n'existent pas déjà. Chacune : contrat zod, domaine, IPC, tests.

1. **`operations.modifierJours(operation_id, jours_ouvrables)`** : met à jour `operation_paie.jours_ouvrables` **et toutes les lignes** dans une transaction ; refuse si l'opération est terminée ; valide `jours_ouvrables ≥ 1` et la cohérence avec les absences saisies ; journalise ; retourne l'opération recalculée.
2. **`synthese` dans `operations.obtenir` et dans la réponse de `lignes.modifier`**, calculée dans le domaine avec `decimal.js` (valeurs figées si l'opération est terminée) :
   - `masse_salariale` : somme des `salaire_base` des lignes ;
   - `total_paye` : somme des `virement` (montants arrondis réellement versés) ;
   - `total_net_exact` et `ecart_arrondi` (déjà présents en phase 1 ; à inclure) ;
   - `salaire_moyen` : `masse_salariale` ÷ `nombre_employes`, 2 décimales, moitié vers le haut ;
   - `nombre_employes` : nombre de lignes ;
   - pour chacun de `masse_salariale`, `total_paye`, `salaire_moyen`, `nombre_employes` : une `variation` `{ pourcentage: string | null, sens: "hausse" | "baisse" | "stable" | null }`. Référence : l'opération **terminée** la plus récente antérieure à celle-ci. `pourcentage` = (courant − précédent) ÷ précédent × 100, 1 décimale, moitié vers le haut ; `null` s'il n'y a pas d'opération de comparaison ou si la valeur précédente est nulle.
3. **`operations.lister`** retourne en plus, pour chaque opération : `total_paye`, `nombre_employes`, `terminee_le`, `jours_ouvrables`, et la `variation` du `total_paye` (même définition).

N'ajoute aucun autre canal sans le justifier dans le rapport.

## 6. Spécification de l'interface

### 6.1 Écarts assumés par rapport à la maquette

| Maquette                                           | Paie Rafiki                                                                       | Raison                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| « Ecole Rafiki »                                   | « École Rafiki »                                                                  | Accent                                                                                                   |
| Carte « Budget total » avec boutons + et −         | Carte **« Masse salariale »**, sans boutons                                       | Le budget n'existe pas dans le classeur ; la masse salariale est la somme des salaires de base           |
| Points et boutons bleus                            | **Points verts**, aucun bleu                                                      | Le vert est la seule couleur d'accent                                                                    |
| « $15.000 »                                        | « 15 000 $ »                                                                      | Le point se confond avec la virgule décimale                                                             |
| « ⌘K »                                             | « Ctrl K »                                                                        | Application Windows                                                                                      |
| Date « Dimanche, 22 nov. 2026 »                    | « Dimanche 22 nov. 2026 »                                                         | Typographie française                                                                                    |
| Menu de ligne : Absences, Bulletin, **Désactiver** | Absences, Bulletin, **Voir la fiche**                                             | Désactiver un employé se fait dans « Liste des employés » : la ligne reste dans la paie en cours         |
| Un seul bouton « Exporter le bulletin »            | « **Exporter** » avec menu (inactif en phase 2) + bouton **« Terminer la paie »** | Le bordereau, les bulletins et le récapitulatif sortent d'un même menu ; il manquait l'action principale |
| Aucun mois affiché                                 | **Sélecteur de mois** et pastille d'état à côté du titre                          | On doit toujours savoir quelle paie on remplit                                                           |
| Aucune alerte                                      | **Bandeau d'avertissement** (6.4)                                                 | Téléphone ou code banque manquant, numéro en double                                                      |
| Pied « Données d'exemple »                         | Supprimé                                                                          | Donnée fictive                                                                                           |
| Pastilles de variation vert et rouge               | **Conservées**, avec flèche et signe                                              | Choix du client ; la couleur n'est jamais le seul signal                                                 |

### 6.2 Tokens

| Token                                                    | Valeur                            | Usage                                                                                  |
| -------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `--page`                                                 | `#EFEFEF`                         | Fond gris de la zone de contenu                                                        |
| `--surface`                                              | `#FFFFFF`                         | Barre latérale, barre du haut, cartes                                                  |
| `--text`                                                 | `#111111`                         | Texte principal                                                                        |
| `--text-2`                                               | `#6B6B6B`                         | Texte secondaire, entrées de menu inactives                                            |
| `--border`                                               | `#E4E4E7`                         | Contours, séparateurs                                                                  |
| `--table-head`                                           | `#F5F6FA`                         | Fond de l'en-tête de tableau                                                           |
| `--primary`                                              | `#16A34A`                         | Vert de la maquette : fonds, icônes, contours (à ajuster à la pipette sur la maquette) |
| `--primary-strong`                                       | `#15803D`                         | Petit texte vert (≥ 4,5 : 1 sur blanc)                                                 |
| `--primary-tint`                                         | `#DCFCE7`                         | Pastilles vertes (hausse, « En cours »)                                                |
| `--danger`                                               | `#DC2626`                         | « Désactiver », erreurs, baisse                                                        |
| `--danger-tint`                                          | `#FEE2E2`                         | Pastille de baisse, fond d'une ligne en erreur                                         |
| `--warning-tint` / `--warning-border` / `--warning-text` | `#FEF3C7` / `#FCD34D` / `#92400E` | Bandeau d'avertissement                                                                |
| `--hover`                                                | `#F4F4F5`                         | Survol d'une ligne ou d'une entrée de menu                                             |

Texte blanc sur `--primary` autorisé seulement à partir de 16 px graisse 600 (menu actif, boutons pleins) ; en dessous, utilise `--primary-strong` comme fond.

**Typographie** (valeurs à 1920 px) : marque 34 / 40 / 700 ; titre de page 44 / 52 / 600 ; titre de section 26 / 32 / 600 ; entrées de menu 22 / 28 / 500 ; libellé de carte 22 / 28 / 500 ; valeur de carte 40 / 48 / 700 ; texte de tableau 21 / 26 / 400 (noms en 500, salaire net en 600) ; en-têtes de tableau 20 / 24 / 500 `--text-2` ; légendes 15 à 17 `--text-2`.

**Formes** : cartes de page arrondi 12 ; cartes de synthèse arrondi 10 avec ombre `0 2px 8px rgba(0,0,0,.12)` ; carte de tableau arrondi 8, contour 1 px `--border` ; boutons arrondi 6 ; pastilles arrondi 999 ; entrée de menu active arrondi 8. **Mouvement** : 150 à 250 ms, `cubic-bezier(0.2, 0.8, 0.2, 1)`, uniquement sur ouvertures et fermetures ; appui : échelle 0,97 dès l'appui ; rien si `prefers-reduced-motion`. **Focus** : anneau 2 px `--primary`, décalé de 2 px.

### 6.3 La coque (sur tous les écrans)

Maquette à 1920 × 1080. Une trame blanche en L (barre latérale + barre du haut) entoure une zone de contenu grise.

**Barre latérale** (x 0 à 334, hauteur totale, fond `--surface`) :

- **Marque** : tuile verte 72 × 72, arrondi 12, en (16, 30), « R » blanche ; à droite (x 98) « École Rafiki » 34 px / 700 et en dessous « Gestionnaire de paie » 20 px `--text-2`.
- **Entrées** : x 16 à 318, hauteur 58, pas vertical 68, arrondi 8, icône 24 px en x 44, libellé en x 70.
  1. **« Journal de paie »** (icône tableau), y 163 à 221.
  2. **« Opération mensuelle »** (icône presse-papiers coché), y 231 à 289.
  3. **« Liste des employés »** (icône liste de personnes), y 299 à 357.
  - **Actif** : fond `--primary`, texte et icône blancs, graisse 600. **Inactif** : texte et icône `--text-2`, graisse 500 ; survol : fond `--hover`.
- **« Réglages »** (icône engrenage) : en bas, centré sur y 1023, même gabarit que les entrées.
- Aucun profil, aucun bouton de déconnexion, aucune autre entrée.

**Barre du haut** (x 334 à 1920, y 0 à 94, fond `--surface`) :

- **Date** en x 358, centrée sur y 46, 22 px / 500, au format « Dimanche 22 nov. 2026 », mise à jour à l'ouverture.
- **Recherche globale** : champ x 1396 à 1896 (500 × 57), y 18 à 75, contour 1 px `--text-2`, arrondi 4, loupe 24 px en x 1421, texte « Rechercher… » 22 px `--text-2` en x 1443, pastille « Ctrl K » à droite (38 × 36, contour, arrondi 4). **Ctrl+K** donne le focus au champ. À la frappe, une liste déroulante (largeur du champ, arrondi 8, ombre douce) propose jusqu'à 5 **Employés** (nom complet, fonction) puis jusqu'à 5 **Opérations** (« Novembre 2026 », état), filtrés par texte sans accents ni casse. Navigation ↑ ↓, Entrée pour ouvrir, Échap pour fermer. Un employé ouvre la Liste des employés avec sa fiche ; une opération ouvre l'Opération mensuelle.

**Zone de contenu** : à partir de x 334, y 94, fond `--page`, marges de 24 px : contenu de x 358 à 1896 (largeur 1538). Le contenu défile ; la barre du haut et la barre latérale restent fixes.

### 6.4 Écran « Opération mensuelle »

**Carte d'en-tête** : x 358 à 1896, y 118 à 228 (hauteur 110), fond `--surface`, arrondi 12, padding horizontal 24.

- **Titre** « Opération mensuelle » (44 / 52 / 600), centré verticalement.
- À droite du titre, trois éléments en ligne, hauteur 40 :
  - **Sélecteur de mois** : « Novembre 2026 » 20 / 500 avec chevron bas, fond `--page`, arrondi 999. Ouvre une liste des opérations (une par ligne, avec leur état) et, en bas, « Nouvelle opération… ».
  - **Pastille d'état** : « En cours » (fond `--primary-tint`, texte `--primary-strong`, point vert) ou « Terminée » (fond `--hover`, texte `--text`, cadenas 14 px).
  - **Pastille « 22 jours ouvrables »** avec icône crayon (inactive si terminée). Au clic : petit panneau flottant avec un champ numérique et un bouton « Enregistrer » (appelle `operations.modifierJours`).
  - Sous 1 500 px de large, ces éléments passent sous le titre et la carte s'agrandit.
- **Boutons à droite** (bord x 1872), de gauche à droite :
  - **« Exporter »** : contour 2 px `--primary`, texte `--primary-strong` 22 / 500, icône téléchargement et chevron bas, hauteur 54, arrondi 6. **Inactif en phase 2** (opacité réduite) avec l'info-bulle « Bientôt disponible ». Le menu prévu (phase 3) : Bordereau de la banque (PDF), Bordereau de la banque (Excel), Récapitulatif du mois (PDF), Bulletins de paie (PDF).
  - **« Terminer la paie »** : fond `--primary`, texte blanc 22 / 600, hauteur 54, arrondi 6. Inactif tant qu'une ligne est en erreur (info-bulle « 2 lignes à corriger »). **Au clic** : dialogue de confirmation rappelant le total payé et les avertissements, précisant que les montants seront figés. **Si la paie est terminée**, ce bouton devient **« Rouvrir la paie »** (contour vert, texte `--primary-strong`) avec confirmation (« Les montants figés seront recalculés. »).

**Bandeau d'avertissement** (seulement s'il y en a ; juste sous la carte d'en-tête, hauteur 52, arrondi 10, fond `--warning-tint`, contour `--warning-border`, texte `--warning-text` 17 px, icône triangle) : « 2 points à vérifier : 1 employé sans code banque · 1 numéro de téléphone en double » et le lien **« Voir la liste des employés »**. Les nombres viennent des totaux du domaine (`nombre_sans_code_banque`, `nombre_telephones_en_double`).

**Panneau des cartes de synthèse** : x 358 à 1896, y 248 (ou plus bas si le bandeau est présent), fond `--surface`, arrondi 12, padding 20. Quatre cartes égales (largeur ≈ 361, espacement ≈ 19, hauteur 190) :

- fond `--surface`, arrondi 10, ombre douce ;
- **en-tête** (hauteur 47, trait 1 px `--border` en dessous) : point vert de 10 px à 16 px du bord, libellé 22 / 500 à 20 px du point ;
- **valeur** : 40 / 48 / 700, à gauche, à environ 52 px sous le trait ;
- **pied** : flèche (22 px) et pastille de variation, puis « Par rapport au mois dernier » 15 px `--text-2`.
  - **Hausse** : flèche et pastille verts (fond `--primary-tint`, texte `--primary-strong`), « +2,5 % ».
  - **Baisse** : flèche et pastille rouges (fond `--danger-tint`, texte `--danger`), « −3,2 % ».
  - **Stable** : flèche horizontale grise, pastille neutre « 0,0 % ».
  - **Aucun mois de comparaison** : pas de pastille, texte « Aucun mois de comparaison » `--text-2`.
- Contenu :
  1. **Masse salariale** : somme des salaires de base. Info-bulle « Somme des salaires de base des employés ».
  2. **Total payé** : somme des virements (arrondis à 10 $). Info-bulle : « Somme des virements arrondis. Salaire net exact : 2 575,15 $ · Écart d'arrondi : +4,85 $. » (valeurs du domaine.)
  3. **Salaire moyen** : moyenne des salaires de base. Info-bulle « Masse salariale divisée par le nombre d'employés ».
  4. **Nombre d'employés**.

**Carte du tableau** : x 358 à 1876 dans le panneau (sinon pleine largeur), fond `--surface`, contour 1 px `--border`, arrondi 8, marge supérieure 28 sous les cartes de synthèse.

- **Bandeau de titre** (hauteur 71) : « Salaires des employés » 26 / 600 à gauche ; à droite « 6 employés affichés · Montants en dollars ($) » 18 px `--text-2`.
- **En-tête de colonnes** : hauteur 55, fond `--table-head`, texte 20 / 500 `--text-2`. Colonnes : **N°** (x 402) · **Employé** (x 482) · **HS / Primes ($)** (aligné à droite sur x 1107) · **Retrait ($)** (aligné à droite sur x 1347) · **Salaire net ($)** (aligné à droite sur x 1647) · **Action** (centré sur x 1775). Les en-têtes « HS / Primes » et « Retrait » portent une petite icône « ? » de 14 px avec info-bulle : « Heures supplémentaires et primes : somme qui s'ajoute au salaire. » et « Avance déjà versée ou retenue convenue : somme qui est retirée du salaire. »
- **Lignes** : hauteur 60, texte 21 px, survol `--hover`, séparateur fin `--border`.
  - **N°** : numéro de l'employé sur deux chiffres (« 01 »), `--text-2`.
  - **Employé** : nom complet, graisse 500. Si l'employé a des absences, une petite pastille grise « Absences 4 j » (icône horloge 14 px) à droite du nom ; elle ouvre le panneau des absences. Le total en jours vient de la ligne.
  - **HS / Primes** et **Retrait** : valeurs modifiables **directement dans la cellule**, alignées à droite. **Au repos**, elles ressemblent à du texte (« 125 $ », zéro en `--text-2`). **Au survol**, un fond `--hover` et un contour fin apparaissent. **Au clic**, le champ s'active (anneau de focus, valeur sans « $ », unité « $ » discrète à droite).
  - **Salaire net** : **net exact**, toujours deux décimales (« 474,55 $ »), graisse 600. Valeur renvoyée par le domaine.
  - **Action** : bouton « ⋯ » de 40 × 40, contour 1 px `--border`, arrondi 6. Menu (largeur ≈ 200, arrondi 8, ombre) : **« Absences »**, **« Bulletin »** (inactif en phase 2, info-bulle « Bientôt disponible »), **« Voir la fiche »** (ouvre la fiche de l'employé dans la Liste des employés).
- **Pied** (hauteur 45) : « Affichage de 1 à 6 employés » 17 px `--text-2` à gauche.

**Saisie, comme dans un tableur**

- Les champs sont du texte avec `inputmode="decimal"` (pas `type="number"`). `normaliserSaisieDecimale` accepte chiffres et un seul séparateur (virgule ou point, converti en point), supprime les espaces, refuse tout autre caractère. Champ vide envoyé comme `"0"`. Le contenu est sélectionné au focus.
- Clavier : Tab et Maj+Tab entre cellules ; Entrée passe à la même colonne de la ligne suivante ; Échap annule et restaure la valeur.
- **Recalcul** : à chaque modification (anti-rebond d'environ 300 ms), appel `lignes.modifier`. L'interface affiche uniquement les valeurs retournées (ligne et synthèse). Les requêtes d'une même ligne sont **sérialisées** ; une réponse obsolète n'écrase jamais une saisie plus récente. Pendant l'attente, un indicateur discret sur la ligne. La grille n'est pas rechargée en entier : focus et saisie sont conservés. La cellule qui vient de changer prend la teinte `--primary-tint` pendant 600 ms.
- **Erreur d'une ligne** : message du domaine sous la ligne (`--danger`, `aria-live`), fond `--danger-tint`, trait de 3 px `--danger` à gauche.

**Panneau « Absences »** : panneau latéral droit (`sheet`), largeur 440. Titre « Absences — Kabongo Ilunga Gloire ». Trois champs numériques en jours : **« Maladie »**, **« Congé de circonstance »**, **« Absence non justifiée »**, avec la même saisie et le même recalcul que la grille. En dessous, **« Retenues »** : trois lignes (maladie, congé, absence) et **« Total des retenues »**, valeurs retournées par le domaine. Texte d'aide : « Maladie et congé : 1/3 du salaire journalier par jour. Absence non justifiée : le salaire journalier complet. » (le « 1/3 » lit le paramètre `diviseur_retenue`). Bouton « Fermer ». Si l'opération est terminée, champs en lecture seule.

**Ajout d'employés** : si des employés actifs ne sont pas dans l'opération, un bouton secondaire « Ajouter N nouveaux employés » s'affiche dans le bandeau de titre du tableau.

**État vide** (aucune opération) : au centre de la zone, icône dans un cercle teinté, « Aucune opération pour le moment », « Créez celle du mois pour commencer. », bouton « Nouvelle opération ».

### 6.5 Écran « Journal de paie » (liste des opérations)

Même langage visuel. **Carte d'en-tête** : titre « Journal de paie » ; à droite, bouton plein **« + Nouvelle opération »**. **Carte de tableau** : titre « Opérations de paie », à droite « 6 opérations · Montants en dollars ($) » et un sélecteur d'année (pastille « 2026 »). Colonnes : **Période** (« Novembre 2026 » 500 et en dessous « 22 jours ouvrables » 15 px `--text-2`) · **Employés** · **Total payé ($)** (aligné à droite, 600) · **Variation** (pastille verte ou rouge avec flèche, comme les cartes de synthèse) · **Terminée le** (« 30 oct. 2026 » ou « — ») · **État** (pastille « En cours » verte ou « Terminée » grise) · **Action** (« ⋯ » : « Ouvrir », « Bordereau de la banque » inactif en phase 2, « Rouvrir la paie » si terminée). Un clic sur la ligne ouvre l'opération. Pied « Affichage de 1 à 6 opérations ».

**Nouvelle opération** : dialogue (largeur 480) avec mois, année, jours ouvrables (valeur proposée : `parametre.jours_ouvrables_defaut`). Mois proposé : le suivant de la dernière opération, sinon le mois courant. Si elle existe déjà : « Cette opération existe déjà. » avec le lien « L'ouvrir ». S'il n'y a **aucun employé actif**, le dialogue affiche « Ajoutez d'abord vos employés » avec un lien vers la Liste des employés.

### 6.6 Écran « Liste des employés »

**Carte d'en-tête** : titre « Liste des employés » ; à droite, bouton plein **« + Ajouter un employé »**. **Carte de tableau** : titre « Employés », à droite « 6 employés actifs · Montants en dollars ($) » et un interrupteur « Afficher les inactifs ». Colonnes : **N°** · **Employé** (nom complet ; fonction en dessous, 15 px `--text-2`) · **Téléphone** · **Code banque** · **Salaire de base ($)** (aligné à droite) · **État** (pastille « Actif » verte ou « Inactif » grise) · **Action** (« ⋯ » : « Modifier », et « Désactiver » en rouge ou « Réactiver »). Un champ vide s'affiche « Manquant » en `--warning-text` avec une petite icône triangle. Un clic sur la ligne ouvre la fiche. Le champ de recherche de la barre du haut ouvre une fiche depuis n'importe où.

**Fiche employé** : panneau latéral (`sheet`, largeur 480) : nom, postnom, prénom, fonction, téléphone, code banque, salaire de base ($), interrupteur « Actif ». Le **code banque d'un nouvel employé est pré-rempli** avec `parametre.code_banque_defaut`, modifiable et pouvant être vidé (il reste alors vide, rien ne le remplace). Les erreurs de validation du domaine s'affichent sous le champ concerné. Texte d'aide sous le salaire : « Les opérations déjà ouvertes gardent l'ancien salaire. »

### 6.7 Écran « Réglages »

**Carte d'en-tête** : titre « Réglages ». Dessous, deux onglets en pastille : **« Paramètres »** et **« Journal d'activité »**.

- **Paramètres** (carte blanche) : jours ouvrables par défaut ; retenue maladie et congé (« 1 / … du salaire journalier ») ; virement arrondi au multiple de ; **code banque proposé aux nouveaux employés**. Bouton plein « Enregistrer », notification de succès. Aide : « Ces réglages s'appliquent aux prochaines opérations. »
- **Journal d'activité** (carte de tableau, lecture seule) : colonnes **Date**, **Action**, **Concerne**, **Détail**, filtre par type d'action. Titre « Journal d'activité », à droite « Dernières 100 actions ».

### 6.8 États transverses

Chargement : squelettes, jamais de page blanche. Erreur inattendue : notification (`sonner`) avec message clair et bouton « Réessayer », sans détails techniques. Aucun montant, nom, téléphone ou code banque dans la console. Info-bulles : fond `#111111`, texte blanc 14 px, arrondi 6, délai de 350 ms au survol et **immédiates au focus clavier** ; chaque bouton icône porte un `aria-label` identique.

### 6.9 Correspondance écrans, actions et canaux IPC

| Écran ou action                | Canal                                                | Comportement                                                    |
| ------------------------------ | ---------------------------------------------------- | --------------------------------------------------------------- |
| Journal de paie : liste        | `operations.lister`                                  | Période, employés, total payé, variation, date, état            |
| Nouvelle opération             | `operations.ouvrir`                                  | Refus du doublon avec lien vers l'existante                     |
| Opération mensuelle            | `operations.obtenir`                                 | Lignes, synthèse, totaux, avertissements                        |
| Modifier HS, retrait, absences | `lignes.modifier`                                    | Retourne la ligne recalculée et la synthèse                     |
| Pastille « jours ouvrables »   | `operations.modifierJours`                           | Voir section 5                                                  |
| Ajouter les nouveaux employés  | `operations.ajouterNouveauxEmployes`                 | Bouton visible seulement s'il y en a                            |
| Terminer la paie               | `operations.terminer`                                | Confirmation d'abord ; refus affiché si une ligne est en erreur |
| Rouvrir la paie                | `operations.rouvrir`                                 | Confirmation d'abord                                            |
| Liste des employés             | `employes.lister`, `creer`, `modifier`, `desactiver` | Voir 6.6                                                        |
| Réglages                       | `parametres.lire`, `parametres.modifier`             | Voir 6.7                                                        |
| Journal d'activité             | `journal.lister`                                     | Lecture seule                                                   |

## 7. Étapes

Avant chaque lot, écris un plan court. Un commit conventionnel par étape. À la fin d'un lot, arrête-toi et rapporte.

### Lot 1 — Socle, coque, Journal de paie (étapes 0 à 2)

**Étape 0 — Prérequis.** Vérifie la section 2 par exécution (application empaquetée stylée, `window.api` défini côté rendu, `test:desktop` vert). Note les écarts entre ce prompt et `packages/contrat`. Ouvre `docs/phase-2/maquette-reference.png`.

**Étape 1 — Socle et coque.** Dépendances (versions exactes vérifiées avec `npm view`), composants shadcn, police Poppins embarquée, variables de la section 6.2, échelle rem fluide, `lib/api.ts`, `lib/format.ts` avec tests, fournisseur `react-query`, barre latérale, barre du haut (date, recherche globale Ctrl+K), routes, écran d'avertissement sans `window.api`, titre et taille minimale de la fenêtre.

**Étape 2 — Journal de paie et nouvelle opération.** Écran 6.5 complet, dialogue de création, extension de `operations.lister` (section 5.3). Tests de composants avec `window.api` simulé.

### Lot 2 — Opération mensuelle (étapes 3 et 4)

**Étape 3 — Écran Opération mensuelle.** Tout le 6.4 : carte d'en-tête, sélecteur de mois, jours ouvrables, bandeau d'avertissement, cartes de synthèse (extension section 5.2), tableau, saisie dans les cellules, panneau Absences, terminer et rouvrir, ajout des nouveaux employés, états vides.

**Étape 4 — Tests de la saisie.** Composants : normalisation, anti-rebond, sérialisation et réponses obsolètes, conservation du focus, désactivation après terminaison, blocage de « Terminer la paie », pastilles de variation (hausse, baisse, stable, sans comparaison), panneau Absences. Formats : `formaterMontant` sur au moins 15 cas, `formaterPourcentage` sur au moins 8.

### Lot 3 — Employés, réglages, parcours complet (étapes 5 à 7)

**Étape 5 — Liste des employés.** Écran 6.6 complet.
**Étape 6 — Réglages et journal.** Écran 6.7 complet.
**Étape 7 — Parcours de bout en bout et rapport.** Test Playwright avec `_electron` sur une base vierge (dossier de données temporaire) :

1. créer l'employé « Test Un » (salaire de base 500, téléphone `+243 81 000 0010`, code banque pré-rempli) ;
2. créer l'opération de novembre 2026 (22 jours) ;
3. saisir HS 40 et Retrait 20 dans la grille, puis ouvrir « Absences » et saisir maladie 2, congé 1, absence 1 : le **salaire net** affiché est **474,55 $** et la carte **Total payé** affiche **470 $** ;
4. terminer la paie : champs désactivés, pastille « Terminée », bouton « Rouvrir la paie » ;
5. fermer l'application, la relancer sur la même base : l'opération est là, terminée, mêmes montants ;
6. rouvrir, modifier une valeur, terminer à nouveau ;
7. avec la base d'exemple (`db:seed`), l'opération d'octobre 2026 affiche **Masse salariale 2 660 $**, **Total payé 2 580 $**, **Salaire moyen 443,33 $**, **Nombre d'employés 6** (si le seed donne d'autres valeurs, signale l'écart sans l'ajuster) ;
8. la recherche globale (Ctrl+K) trouve un employé et une opération.

Le test enregistre des **captures d'écran** de chaque étape dans `docs/phase-2/captures/`, à 1920 × 1080 et à 1366 × 768. Rédige ensuite `docs/decisions/rapport-phase-2.md`.

## 8. Règles de travail

- PowerShell, Windows 11. Versions exactes vérifiées, jamais devinées.
- **Preuve par le rendu.** Une vérification de l'interface se prouve par une capture ou un journal venant **du processus de rendu** (événement `console-message` ou Playwright), jamais seulement par le processus principal. Ne marque une vérification « réussie » que si tu l'as exécutée ; sinon écris « non testé » et pourquoi.
- **Fidélité à la maquette.** Compare chaque écran terminé à `maquette-reference.png` et signale dans le rapport les différences visibles, avec leur raison.
- Aucun secret dans le dépôt. Ne modifie pas `docs/annexes/`. Pas de déploiement.
- Si un canal ou un champ attendu manque dans le contrat (hors section 5), **arrête-toi et signale-le** plutôt que de contourner.
- Un commit par étape ; arbre propre à la fin de chaque lot ; arrête-toi à la fin d'un lot.

## 9. Critères d'acceptation de la phase

1. `npm run typecheck`, `lint`, `format:check`, `test:calcul`, `test:desktop`, `test:web` passent.
2. `npm run test:e2e` déroule le parcours de la section 7, étape 7, avec ses captures.
3. Dans l'application **empaquetée**, l'interface s'affiche stylée et le parcours des étapes 1 à 5 fonctionne (preuve par capture du rendu).
4. Aucun montant ni pourcentage n'est calculé, parsé ou arrondi dans `apps/web` : un contrôle automatique (recherche de `parseFloat`, `Number(` et opérateurs arithmétiques sur des champs monétaires) ne trouve rien en dehors de `lib/format.ts`.
5. Aucune occurrence de `localStorage`, `eval` ou de ressource distante dans `apps/web/src`.
6. L'interface est utilisable à 1366 × 768 et à 1920 × 1080 (captures aux deux tailles) et ressemble à la maquette : barre latérale, barre du haut, carte d'en-tête, quatre cartes de synthèse, tableau.
7. Une paie terminée n'expose aucun champ modifiable.
8. Les boutons « Exporter » et « Bulletin » sont affichés, inactifs, avec l'info-bulle « Bientôt disponible », et ne déclenchent rien.
9. Rapport `docs/decisions/rapport-phase-2.md` : chaque critère marqué réussi, échoué ou non testé, avec sa preuve.

## 10. Rapport final

Étapes terminées, vérifications exécutées avec leur résultat réel, écarts avec la maquette et avec ce prompt, extensions du contrat, blocages, et liste des tâches de la phase 3 (bulletins, bordereau, récapitulatif, exports PDF et Excel, import du classeur Excel).
