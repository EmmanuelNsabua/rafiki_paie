# Prompt Antigravity — Phase 2 : interface (Next.js, shadcn/ui, vraie base)

## 1. Mission

Les phases 0 et 1 ont posé le monorepo, le moteur de calcul, la base SQLite, les règles métier et le pont IPC. **Cette phase construit l'interface réelle de l'application desktop** : les écrans du prototype, portés dans Next.js avec shadcn/ui et branchés sur la vraie base par `window.api`.

**À la fin de la phase, on doit pouvoir démontrer : une paie complète saisie, comme dans le prototype, mais avec la vraie base.** Concrètement : créer l'opération du mois, remplir la liste des employés, voir les montants se recalculer, terminer la paie, la rouvrir, gérer les employés et les réglages, fermer l'application, la rouvrir et retrouver tout.

**Hors périmètre** (phase 3) : bulletins de paie, bordereau de virement, exports PDF et Excel, import du classeur Excel. Ne les ajoute pas, pas même sous forme de boutons inactifs.

## 2. Prérequis et contexte

Ce prompt a été écrit **sans relire le code actuel**. Les noms de canaux et de champs viennent de la phase 1. En cas de différence, **`packages/contrat` fait foi** : adapte l'interface, ne modifie pas le domaine, sauf pour les extensions listées à la section 5.

**Prérequis, à vérifier à l'étape 0.** Si l'un manque, arrête-toi et signale-le, sans le corriger toi-même :

- les groupes A, A2 et B de la correction de la phase 1 sont terminés et poussés (l'application empaquetée affiche une page stylée, `window.api` est défini, le code banque est un paramètre de l'école, `operation_paie.jours_ouvrables` existe) ;
- `AGENTS.md`, `docs/decisions/` et les annexes sont lisibles. Références à lire : `docs/annexes/04-prototype-paie-rafiki.html` (comportement et vocabulaire à reproduire, avec son code, qu'on peut ouvrir dans un navigateur) et `docs/SPEC_BORDEREAU_BANQUE.md` (pour les champs téléphone et code banque uniquement).

Direction visuelle : skill `apple-design` d'Emil Kowalski (dépôt `emilkowalski/skills`, fichier `skills/apple-design/SKILL.md`), à lire avant de dessiner quoi que ce soit.

## 3. Invariants non négociables

1. **Aucun calcul monétaire dans l'interface.** Tous les montants affichés viennent du processus principal (réponses de `lignes.modifier` et `operations.obtenir`). L'interface met en forme, elle ne calcule jamais un net, un total, un arrondi ni un prorata. `decimal.js` n'est autorisé que pour **formater** une chaîne.
2. **Aucune règle métier dans l'interface.** Validations, blocages, avertissements : ils viennent du domaine. L'interface les affiche. Elle peut seulement aider à la saisie (caractères acceptés, champ vide).
3. **Aucune donnée métier hors de la base.** Pas de `localStorage`, pas de copie persistante en mémoire. Chaque écran relit la base par IPC.
4. **Les montants sont des chaînes**, de la saisie à l'affichage. Jamais de `Number`, `parseFloat` ni d'opérateur arithmétique sur un montant.
5. **Une paie terminée est en lecture seule** dans toute l'interface, sans exception.
6. **Aucune valeur par défaut métier dans le code** (ni code banque, ni jours ouvrables) : tout vient de la base.
7. **Compatibilité future avec une politique de contenu stricte** : pas de `eval`, pas de script ni de style en ligne que Next ne génère pas lui-même, pas de contenu distant, pas de police ou d'image externes.
8. **L'interface fonctionne dans le protocole `app://`** de l'application empaquetée et sur `http://localhost:3000` en développement : aucun chemin absolu `file://`, aucun lien en dur.

## 4. Choix techniques arrêtés

- **Routage compatible avec l'export statique.** Avec `output: "export"`, les identifiants d'opération ne peuvent pas être des segments dynamiques. L'écran d'une opération est une page unique `/operation/?id=<uuid>` qui lit l'identifiant avec `useSearchParams` (dans un `Suspense`). `trailingSlash: true` reste actif.
- **Accès aux données.** Un module `lib/api.ts` encapsule `window.api` : il déballe `{ ok, data } | { ok: false, erreur }`, lève une `ErreurMetier` typée en cas d'échec, et signale clairement l'absence de `window.api` (écran d'avertissement « Cette page doit être ouverte dans l'application Paie Rafiki »).
- **État serveur.** `@tanstack/react-query` : requêtes, invalidation après chaque mutation, états de chargement et d'erreur.
- **Composants.** shadcn/ui : `button`, `input`, `label`, `select`, `switch`, `dialog`, `alert-dialog`, `sheet`, `table`, `badge`, `skeleton`, `tooltip`, `sonner`, `form` (avec `react-hook-form` et `zod`). Ajoute-les avec la CLI.
- **Formats.** `lib/format.ts` : `formaterMontant(chaine, decimales = 2)` (arrondi moitié vers le haut, séparateur de milliers espace insécable fin, virgule décimale, suffixe ` $`), `libelleMois(n)`, `libelleOperation(annee, mois)`, `normaliserSaisieDecimale(texte)` (voir section 6).
- **Tests.** Vitest et Testing Library pour les composants (`npm run test:web`). Playwright avec `_electron` pour le parcours complet (`npm run test:e2e`).
- **Titre de la fenêtre** : « Paie Rafiki ». Taille minimale de la fenêtre : 900 × 600 (seule modification autorisée du processus principal, avec les extensions de la section 5).

## 5. Extensions autorisées du contrat

Une seule, si elle n'existe pas déjà : `operations.modifierJours(operation_id, jours_ouvrables)`. Elle met à jour `operation_paie.jours_ouvrables` **et toutes les lignes de l'opération** dans une seule transaction, refuse si l'opération est terminée, valide `jours_ouvrables ≥ 1` et la cohérence avec les absences saisies, et inscrit l'action au journal. Elle retourne l'opération recalculée. Ajoute-la au contrat zod, au domaine, à l'IPC et aux tests. N'ajoute aucun autre canal sans le justifier dans le rapport.

## 6. Spécification de l'interface

### 6.1 Principes visuels

- **Esprit** : sobre, lisible, proche d'une application système. Pas de dégradé, pas d'émoji, pas d'illustration décorative, pas de carte dans une carte.
- **Thème** : variables CSS shadcn de la phase 0 (fond `#f5f5f7` / `#000`, surface `#fff` / `#1c1c1e`, texte `#1d1d1f` / `#f5f5f7`, accent `#0a7a5a` / `#34c58f`, danger `#c4372c` / `#ff6961`), clair et sombre selon le système. Pas de bascule manuelle.
- **Typographie** : pile système. Grand titre de page (`clamp(30px, 4vw, 40px)`, graisse 700, espacement des lettres −0,022 em). Montants en chiffres tabulaires (`tabular-nums`), alignés à droite.
- **Listes** : groupes arrondis (14 px) avec séparateurs fins, comme les listes groupées d'iOS.
- **Retour immédiat à l'appui** : état `:active` (échelle 0,97) sur tout élément cliquable, appliqué dès l'appui.
- **Mouvement** : 150 à 250 ms, courbe `cubic-bezier(0.2, 0.8, 0.2, 1)`, uniquement sur ouverture et fermeture de dialogues, panneaux et déplis. Aucune animation si `prefers-reduced-motion`. Barres translucides (`backdrop-filter`), sauf si `prefers-reduced-transparency`.
- **Accessibilité** : étiquettes sur chaque champ, anneau de focus visible, zone cliquable d'au moins 40 px de haut, `aria-live="polite"` sur les totaux et sur les messages d'erreur d'une ligne, contraste suffisant dans les deux thèmes.
- **Langue** : français uniquement, première lettre en majuscule et pas de point final dans les titres, apostrophes typographiques (’), guillemets français. Vocabulaire du prototype : opération de paie, Terminer la paie, Rouvrir la paie, Net global, Virement, HS / primes, Retrait.

### 6.2 Structure générale

Barre supérieure translucide avec le nom « Paie Rafiki » et trois entrées : **Paie**, **Employés**, **Réglages**. Contenu centré, largeur maximale 1 100 px. Remplace la page de démonstration de la phase 0 à la racine ; garde `/dev/controle`.

### 6.3 Correspondance écrans, actions et canaux IPC

| Écran ou action                | Canal                                                | Comportement attendu                                                         |
| ------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Accueil : liste                | `operations.lister`                                  | Mois, nombre d'employés, total à virer, état                                 |
| Nouvelle opération             | `operations.ouvrir`                                  | Mois et année, jours ouvrables ; refus du doublon avec lien vers l'existante |
| Ouvrir une opération           | `operations.obtenir`                                 | Lignes, montants calculés, totaux, avertissements                            |
| Modifier une cellule           | `lignes.modifier`                                    | Retourne la ligne recalculée et les totaux                                   |
| Jours ouvrables de l'opération | `operations.modifierJours`                           | Voir section 5                                                               |
| Ajouter les nouveaux employés  | `operations.ajouterNouveauxEmployes`                 | Bouton visible seulement s'il y en a                                         |
| Terminer la paie               | `operations.terminer`                                | Confirmation d'abord ; refus affiché si une ligne est en erreur              |
| Rouvrir la paie                | `operations.rouvrir`                                 | Confirmation d'abord                                                         |
| Employés                       | `employes.lister`, `creer`, `modifier`, `desactiver` | Voir 6.6                                                                     |
| Réglages                       | `parametres.lire`, `parametres.modifier`             | Voir 6.7                                                                     |
| Journal                        | `journal.lister`                                     | Lecture seule                                                                |

### 6.4 Accueil (liste des opérations)

- Grand titre « Paie », phrase d'introduction (« Une opération par mois : remplissez la liste des employés, le logiciel calcule le virement. »), bouton principal **Nouvelle opération**.
- Liste groupée : libellé « Novembre 2026 », sous-titre « 6 employés », total à virer à droite, pastille d'état (**En cours** teinte d'accent, **Terminée** teinte neutre). Un clic ouvre l'opération.
- Tri : la plus récente d'abord. État vide : « Aucune opération. Créez celle du mois pour commencer. » avec le bouton.
- **Nouvelle opération** : dialogue avec mois, année, jours ouvrables (valeur proposée : `parametre.jours_ouvrables_defaut`). Mois proposé : le suivant de la dernière opération, sinon le mois courant. Si l'opération existe déjà, message « Cette opération existe déjà. » avec le lien **L’ouvrir**.

### 6.5 Opération (la saisie)

C’est l’écran principal : c’est lui qui doit ressembler au prototype.

**En-tête** : titre « Novembre 2026 » avec la pastille d’état ; résumé en grand : **Total à virer** (chiffre très grand), puis « Net avant arrondi », « Écart d’arrondi », nombre d’employés ; champ **Jours ouvrables** de l’opération (désactivé si terminée) ; boutons **Terminer la paie** ou **Rouvrir la paie**.

**Avertissements** (venant du domaine, non bloquants), sous le résumé : « 2 employés sans téléphone ou sans code banque », « 1 numéro de téléphone en double », avec un lien vers **Employés**. Ils s’affichent à partir des totaux (`nombre_sans_code_banque`, `nombre_telephones_en_double`).

**Grille**, une ligne par employé, comme dans Excel :

- **Largeur ≥ 900 px** : tableau avec en-têtes fixes. Colonnes : Employé (nom complet et fonction), HS / primes, Retrait, Maladie (j), Congé (j), Absence (j), Net global, Virement. Les cinq colonnes de saisie sont des champs directement modifiables.
- **Largeur < 900 px** : chaque ligne devient un accordéon (nom, fonction, virement en en-tête ; au dépli, les cinq champs avec étiquettes, le net global et le virement). Plusieurs lignes peuvent être dépliées. Le dépli persiste pendant les mises à jour.
- **Champs de saisie** : texte avec `inputmode="decimal"` (pas `type="number"`). `normaliserSaisieDecimale` accepte chiffres, un seul séparateur (virgule ou point, converti en point), supprime les espaces, refuse tout autre caractère à la frappe. Champ vide envoyé comme `"0"`. Sélection du contenu au focus.
- **Clavier** : Tab et Maj+Tab entre les champs ; Entrée passe au même champ de la ligne suivante ; Échap annule la saisie en cours et restaure la valeur.
- **Recalcul** : à chaque modification (anti-rebond d’environ 300 ms), appel `lignes.modifier`. L’interface affiche uniquement les valeurs retournées. Les requêtes d’une même ligne sont **sérialisées**, et une réponse obsolète n’écrase jamais une saisie plus récente. Pendant l’attente, un indicateur discret sur la ligne ; pas de rechargement complet de la grille, le focus et le dépli sont conservés.
- **Erreurs d’une ligne** : message du domaine sous la ligne (rouge, `aria-live`), la ligne est surlignée. **Terminer la paie** est désactivé tant qu’une ligne est en erreur, avec le motif « 2 lignes à corriger ».
- **Terminer la paie** : dialogue de confirmation rappelant le total à virer et les avertissements, et précisant que les montants seront figés. **Rouvrir la paie** : confirmation (« Les montants figés seront recalculés. »).
- **Paie terminée** : champs désactivés, valeurs figées affichées, pastille **Terminée**, aucun bouton de saisie.
- **Ajouter les nouveaux employés** : bouton visible seulement si des employés actifs ne figurent pas dans l’opération, avec leur nombre.
- Les lignes dont le code banque est vide affichent « — ».

### 6.6 Employés

- Liste groupée avec recherche (nom, postnom, prénom, fonction). Chaque ligne : nom complet, fonction, salaire de base, pastille « Inactif » le cas échéant, mentions « Téléphone manquant » ou « Code banque manquant » si le champ est vide.
- **Ajouter / modifier** dans un panneau latéral (`sheet`) : nom, postnom, prénom, fonction, téléphone, code banque, salaire de base, interrupteur **Actif**. Le code banque d’un nouvel employé est **pré-rempli** avec `parametre.code_banque_defaut`, et reste modifiable (et peut être vidé : il reste vide, rien ne le remplace).
- Les erreurs de validation du domaine s’affichent sous le champ concerné (téléphone invalide, salaire invalide, nom vide). Texte d’aide sous le salaire : « Les opérations déjà ouvertes gardent l’ancien salaire. »
- Pas de suppression : seulement désactivation, avec l’interrupteur.

### 6.7 Réglages

- **Paramètres** : jours ouvrables par défaut, retenue maladie et congé (« 1 / … du salaire journalier »), arrondi du virement au multiple de, **code banque proposé aux nouveaux employés**. Bouton **Enregistrer** explicite, notification de succès. Texte d’aide : « Ces réglages s’appliquent aux prochaines opérations. »
- **Journal** : page ou section en lecture seule listant les dernières actions (date, action, entité, détail) avec un filtre par type d’action.

### 6.8 États transverses

Chargement : squelettes (`skeleton`), jamais de page blanche. Erreur inattendue : notification (`sonner`) avec message clair et bouton **Réessayer**, sans détails techniques. Aucun montant, nom, téléphone ou code banque dans la console.

## 7. Étapes

Avant chaque lot, écris un plan court. Après chaque étape, un commit conventionnel. À la fin d’un lot, arrête-toi et rapporte.

### Lot 1 — Socle, accueil, nouvelle opération (étapes 0 à 2)

**Étape 0 — Prérequis.** Vérifie la section 2 par exécution : application empaquetée stylée, `window.api` défini dans le rendu, test:desktop vert. Note les écarts éventuels entre ce prompt et `packages/contrat`.

**Étape 1 — Socle.** Dépendances (versions exactes vérifiées avec `npm view`), composants shadcn, variables de thème, `lib/api.ts`, `lib/format.ts` avec ses tests unitaires, fournisseur `react-query`, barre supérieure et navigation, écran d’avertissement sans `window.api`, titre et taille de fenêtre.

**Étape 2 — Accueil et nouvelle opération.** Écran 6.4 complet, états vide et chargement, dialogue de création, gestion du doublon. Tests de composants avec `window.api` simulé.

### Lot 2 — Saisie de la paie (étapes 3 et 4)

**Étape 3 — Écran Opération.** Tout le 6.5 : en-tête, avertissements, grille responsive, saisie, recalcul sérialisé, erreurs de ligne, terminer et rouvrir, ajout des nouveaux employés, extension `operations.modifierJours` si nécessaire.

**Étape 4 — Tests de la saisie.** Composants : normalisation de la saisie, anti-rebond, sérialisation et réponses obsolètes, conservation du focus et du dépli, désactivation après terminaison, blocage du bouton Terminer, avertissements. Formats : `formaterMontant` sur au moins 15 cas (zéro, grands montants, 6 décimales, arrondi moitié vers le haut, valeurs négatives du net).

### Lot 3 — Employés, réglages, parcours complet (étapes 5 à 7)

**Étape 5 — Employés.** Écran 6.6 complet.

**Étape 6 — Réglages et journal.** Écran 6.7 complet.

**Étape 7 — Parcours de bout en bout et rapport.** Test Playwright avec `_electron` qui lance l’application sur une base vierge (dossier de données temporaire) et déroule **le parcours de démonstration** :

1. créer un employé « Test Un » (salaire 500, téléphone `+243 81 000 0010`, code banque pré-rempli) ;
2. ouvrir l’opération de novembre 2026 (22 jours) ;
3. saisir HS 40, retrait 20, maladie 2, congé 1, absence 1 : le net global affiché est **474,55 $** et le virement **470 $** ;
4. terminer la paie : champs désactivés, total à virer **470 $** ;
5. fermer l’application, la relancer sur la même base : l’opération est là, terminée, avec les mêmes montants ;
6. rouvrir la paie, modifier une valeur, terminer à nouveau ;
7. avec la base d’exemple (`db:seed`), l’opération d’octobre 2026 terminée affiche le total du prototype (**2 580 $** ; si le seed donne un autre total, signale l’écart sans l’ajuster).

Le test enregistre des **captures d’écran** de chaque étape dans `docs/phase-2/captures/`. Rédige ensuite `docs/decisions/rapport-phase-2.md`.

## 8. Règles de travail

- PowerShell, Windows 11. Versions exactes vérifiées, jamais devinées.
- **Preuve par le rendu.** Une vérification de l’interface se prouve par une capture ou un journal venant **du processus de rendu** (événement `console-message` ou Playwright), jamais seulement par le processus principal. Ne marque une vérification « réussie » que si tu l’as exécutée ; sinon écris « non testé » et pourquoi.
- Aucun secret dans le dépôt. Ne modifie pas `docs/annexes/`. Pas de déploiement.
- Si un canal ou un champ attendu manque dans le contrat (hors section 5), **arrête-toi et signale-le** plutôt que de contourner.
- Un commit par étape ; arbre propre à la fin de chaque lot. À la fin d’un lot, arrête-toi.

## 9. Critères d’acceptation de la phase

1. `npm run typecheck`, `lint`, `format:check`, `test:calcul`, `test:desktop`, `test:web` passent.
2. `npm run test:e2e` déroule le parcours de la section 7, étape 7, avec ses captures.
3. Dans l’application **empaquetée**, l’interface s’affiche stylée et le parcours des étapes 1 à 5 fonctionne (preuve par capture du rendu).
4. Aucun montant n’est calculé, parsé ou arrondi dans `apps/web` : un contrôle automatique (recherche de `parseFloat`, `Number(` et opérateurs arithmétiques sur des champs monétaires) ne trouve rien en dehors de `lib/format.ts`.
5. Aucune occurrence de `localStorage`, `eval` ou de ressource distante dans `apps/web/src`.
6. L’interface est utilisable à 900 px et à 1 366 px de large (captures aux deux largeurs), en clair et en sombre.
7. Une paie terminée n’expose aucun champ modifiable.
8. Rapport `docs/decisions/rapport-phase-2.md` : chaque critère marqué réussi, échoué ou non testé, avec sa preuve.

## 10. Rapport final

Contenu : étapes terminées, vérifications exécutées avec leur résultat réel, écarts avec ce prompt, extensions du contrat, blocages, et liste des tâches de la phase 3 (bulletins, bordereau, exports PDF et Excel, import du classeur).
