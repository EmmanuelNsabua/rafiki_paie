# Documentation de conception — Gestion de la paie, École Rafiki

Logiciel web local d'abord, en remplacement du classeur GESTION\_PAIE\_ECOLE\_RAFIKI\_COMPLET.xlsx. Version 1.0 — 18 novembre 2026.

## 1. Objet et périmètre

Ce document décrit la conception d'un logiciel de gestion de la paie mensuelle de l'École Rafiki. Il reprend à l'identique la logique de calcul du classeur Excel actuellement utilisé, la corrige là où elle est fautive, et la place dans une application web composée d'un frontend, d'un backend et d'une base de données, capable de fonctionner hors ligne.

Trois décisions cadrent le périmètre.

- **Fidélité au classeur.** Le logiciel ne calcule aucune retenue légale (CNSS, IPR ou autre). Le net est obtenu uniquement par les gains et les retenues déjà présents dans le classeur.
- **Un seul administrateur.** Une personne gère le logiciel. Il n'y a ni rôles, ni droits différenciés, ni circuit de validation.
- **Local d'abord.** L'application fonctionne entièrement sur l'appareil de l'administrateur, sans connexion, puis synchronise ses données avec le serveur dès qu'une connexion existe, selon le principe d'un outil comme Notion.

Le logiciel doit pouvoir être utilisé par n'importe qui sans formation préalable : l'interface suit le vocabulaire du classeur (salaire, HS, retrait, maladie, congé, absence, global, virement) et ne demande aucune notion informatique.

## 2. Analyse de l'existant

### 2.1 Structure du classeur

Le classeur comporte trois onglets.

| Onglet | Rôle |
| --- | --- |
| Paie Mensuelle | Saisie et calcul. Registre de 30 lignes (5 à 34), ligne de total en 35. |
| Récapitulatif & Contrôle | Synthèse : effectif, totaux par rubrique, total viré, écart d'arrondi. |
| Fiche de Paie Individuelle | Bulletin A4 d'un employé choisi par son numéro d'ordre (cellule C1). |

Colonnes de saisie de l'onglet principal : N°, NOM, POSTNOM, PRENOM, FONCTION, SALAIRE (F), HS (G), RETRAIT (H), NBRE OUVRABLE (J), MALADIE (M), CONGE DE CIRCONSTANCE / MATERNITE / DEUIL (O), ABSENCE NON JUSTIFIEE + RETARD + MISE A PIED (Q), N° TEL (U). Colonnes calculées : I, K, L, N, P, R, S, T.

### 2.2 Règles de calcul relevées

Les formules du fichier, ligne n, avec F = salaire, G = HS, H = retrait, J = jours ouvrables, M = jours de maladie, O = jours de congé, Q = jours d'absence non justifiée :

- I = F + G − H (salaire à payer)
- K = J − M − O − Q (jours prestés)
- L = (F / J) × K (valeur indicative, hors du calcul du net)
- N = (F / J / 3) × M (retenue maladie)
- P = (F / J / 3) × O (retenue congé)
- R = (F / J) × Q (retenue absence)
- S = I − N − P − R (global exact)
- T = ARRONDI(S ; −1) (virement, à la dizaine de dollars)

Le montant est exprimé en dollars américains. Le total général (ligne 35) additionne chaque colonne numérique.

### 2.3 Constats

L'analyse du fichier et de son manuel fait ressortir les points suivants, que la conception traite explicitement.

1. **Écart d'arrondi faux.** Dans l'onglet Récapitulatif, la cellule B13 calcule B10 − B9, c'est-à-dire retenues d'absence moins retenues de congé. L'écart d'arrondi doit être le total viré moins le total global (B12 − B11). Le logiciel calcule l'écart correct.
2. **Période du bulletin.** La fiche individuelle affiche le mois par la fonction TODAY(). Un bulletin réimprimé un mois plus tard porte donc le mauvais mois, et rien n'est conservé d'un mois à l'autre. Le logiciel rattache chaque bulletin à une période de paie enregistrée.
3. **Division par zéro masquée.** Les formules de prorata sont enveloppées dans SIERREUR(…; 0). Si le nombre de jours ouvrables est vide ou nul, les retenues valent silencieusement zéro au lieu de signaler l'erreur. Le logiciel refuse un nombre de jours ouvrables inférieur à 1.
4. **Écart entre manuel et fichier.** Le manuel décrit des RECHERCHEV sur la fiche individuelle ; le fichier emploie INDEX et EQUIV. Sans effet sur le résultat, mais le manuel n'est pas une source fiable pour les détails techniques.
5. **Colonne L ambiguë.** Le « NET A PAYER » de la colonne L exclut les jours de maladie et de congé à taux plein, alors que le global S ne les retient qu'au tiers. Lue comme un net réel, elle trompe. Le logiciel la supprime des écrans et la remplace, si nécessaire, par un libellé explicite de « salaire proratisé aux jours prestés ».
6. **HS et primes confondues.** La colonne G mélange heures supplémentaires et primes. Le logiciel conserve un seul champ « HS / primes » pour rester fidèle, avec un libellé facultatif.
7. **Plafond de 30 employés et absence d'historique.** Le logiciel n'impose aucun plafond et conserve toutes les périodes.
8. **Pas de contrôle de cohérence.** Rien n'empêche une somme M + O + Q supérieure à J, ni un global négatif. Le logiciel contrôle la saisie.

## 3. Exigences fonctionnelles

### 3.1 Employés

- Créer, modifier, désactiver un employé (jamais le supprimer s'il figure dans une paie clôturée).
- Champs : numéro d'ordre, nom, postnom, prénom, fonction, téléphone, salaire de base, statut actif ou inactif.
- Numéro d'ordre attribué automatiquement, modifiable, unique.

### 3.2 Périodes de paie

- Ouvrir une période (mois et année) avec un nombre de jours ouvrables par défaut de 22, modifiable par employé comme dans le classeur.
- À l'ouverture, une ligne de paie est créée pour chaque employé actif, avec le salaire de base repris de la fiche employé, les variables à zéro.
- Clôturer une période : les montants calculés sont figés et la période devient en lecture seule.
- Rouvrir une période clôturée : action explicite, confirmée, inscrite au journal.

### 3.3 Saisie mensuelle

- Grille de saisie semblable à un tableur : une ligne par employé, colonnes de saisie modifiables, colonnes calculées en lecture seule, ligne de totaux.
- Recalcul instantané à chaque modification, y compris hors ligne.
- Contrôles : jours ouvrables ≥ 1 ; jours de maladie, de congé et d'absence entiers ou demi-journées positifs ; M + O + Q ≤ J ; avertissement si le global est négatif ; avertissement si le retrait dépasse le salaire à payer.

### 3.4 Récapitulatif et contrôle

Indicateurs identiques à l'onglet du classeur, avec l'écart d'arrondi corrigé : effectif actif, total des salaires de base, total HS, total des retraits, total des retenues maladie, congé et absence, total global avant arrondi, total viré, écart d'arrondi.

### 3.5 Bulletin de paie individuel

- Un bulletin par employé et par période, sélectionnable dans la liste.
- Contenu repris du classeur : en-tête « École Rafiki — Bulletin de paie individuel » et mention « République Démocratique du Congo — Document officiel de paie mensuelle » ; identification (numéro, nom complet, fonction, téléphone, période, jours ouvrables, jours prestés, mode de paiement « Virement bancaire ») ; détail des gains et retenues ; sous-total salaire à payer ; total des retenues d'absences et congés ; salaire net global avant arrondi ; net à payer arrondi à la dizaine ; zones de signature de l'employé (pour acquit) et de la direction (cachet et signature).
- La période affichée est celle de la paie, jamais la date du jour.
- Impression A4 portrait sur une seule page ; export PDF.
- Impression ou export groupé de tous les bulletins d'une période.

### 3.5 bis Bordereau de virement

Le manuel prévoit un bordereau nominatif transmis à la banque avec les colonnes N°, nom, postnom, prénom et virement. Le logiciel le génère pour une période, avec le total à provisionner, en PDF et en CSV.

### 3.6 Historique et export

- Consultation de toutes les périodes clôturées.
- Export de la paie d'une période au format Excel (.xlsx) et CSV, dans une disposition proche de l'ancien classeur.
- Import initial depuis le classeur actuel (voir section 9).

## 4. Règles de gestion et de calcul

### 4.1 Paramètres

| Paramètre | Valeur initiale | Rôle |
| --- | --- | --- |
| Devise | USD | Unique, affichée avec deux décimales. |
| Jours ouvrables par défaut | 22 | Proposé à l'ouverture d'une période. |
| Fraction retenue maladie | 1/3 | Part du taux journalier retenue par jour de maladie. |
| Fraction retenue congé | 1/3 | Part du taux journalier retenue par jour de congé de circonstance. |
| Unité d'arrondi du virement | 10 | Multiple exigé par la banque. |

Les fractions sont des paramètres, non des constantes du code, afin de suivre un changement de règle sans modifier le logiciel. Leur valeur initiale reproduit exactement le classeur.

### 4.2 Formules

Pour une ligne de paie : taux journalier = salaire / jours ouvrables.

- salaire\_a\_payer = salaire + hs − retrait
- jours\_prestes = jours\_ouvrables − maladie − conge − absence
- retenue\_maladie = taux\_journalier × fraction\_maladie × jours\_maladie
- retenue\_conge = taux\_journalier × fraction\_conge × jours\_conge
- retenue\_absence = taux\_journalier × jours\_absence
- global = salaire\_a\_payer − retenue\_maladie − retenue\_conge − retenue\_absence
- virement = arrondi(global, unité)
- ecart\_arrondi\_total = somme(virement) − somme(global)

### 4.3 Précision et arrondi

Les retenues sont des fractions (par exemple 500 / 22 / 3) qui n'ont pas de représentation décimale exacte. Pour que le logiciel retrouve au centime près les résultats du classeur :

- les calculs intermédiaires ne sont jamais arrondis, et ils emploient une arithmétique décimale de haute précision ou des fractions exactes, jamais des nombres à virgule flottante ;
- le global est stocké avec une précision de six décimales et affiché avec deux ;
- le virement applique l'arrondi du classeur : au multiple de 10 le plus proche, la moitié étant arrondie vers le haut (555,00 donne 560 ; 554,99 donne 550 ; 557,20 donne 560) ;
- le terme « arrondi bancaire » du manuel est abandonné au profit de « arrondi à la dizaine », seule appellation exacte.

### 4.4 Cas d'essai de référence

Agent d'exemple du classeur : salaire 500 $, HS 40 $, retrait 20 $, 22 jours ouvrables, 2 jours de maladie, 1 jour de congé, 1 jour d'absence non justifiée.

| Rubrique | Résultat |
| --- | --- |
| Salaire à payer | 520,00 $ |
| Jours prestés | 18 |
| Retenue maladie | 15,15 $ |
| Retenue congé | 7,58 $ |
| Retenue absence | 22,73 $ |
| Global | 474,55 $ |
| Virement | 470 $ |

Ce cas, et les cas limites de la section 10, constituent le critère de conformité du moteur de calcul.

## 5. Architecture

### 5.1 Vue d'ensemble

L'application se compose de quatre éléments.

- **Frontend** : application web progressive (PWA), installable sur ordinateur et téléphone, qui fonctionne sans connexion.
- **Base locale** : stockage dans le navigateur (IndexedDB), source de vérité pendant l'utilisation.
- **Backend** : API qui reçoit les modifications, les valide, les enregistre et les redistribue aux appareils de l'administrateur.
- **Base de données serveur** : PostgreSQL, copie de référence et point de sauvegarde.

Le moteur de calcul est un module unique, écrit une fois et exécuté à la fois dans le navigateur et sur le serveur. Le navigateur l'emploie pour l'affichage instantané, y compris hors ligne ; le serveur le rejoue à la réception de chaque modification et refuse tout écart, ce qui garantit que les deux côtés produisent les mêmes montants.

### 5.2 Choix techniques recommandés

| Couche | Choix | Justification |
| --- | --- | --- |
| Langage | TypeScript partout | Un seul langage et un moteur de calcul partagé entre client et serveur. |
| Frontend | React avec Vite | Écosystème large, rendu rapide de grilles de saisie. |
| Hors ligne | Service worker, IndexedDB via Dexie | Mise en cache de l'application et stockage local structuré. |
| Calcul décimal | Bibliothèque décimale (decimal.js) | Précision exigée par la section 4.3. |
| Backend | Node.js avec Fastify | Léger, simple à héberger. |
| Base serveur | PostgreSQL | Types numériques exacts, transactions, contraintes. |
| Génération PDF | Rendu HTML vers PDF côté navigateur (impression A4) | Fonctionne hors ligne, sans serveur de rendu. |
| Export Excel | Bibliothèque de génération .xlsx côté navigateur | Fonctionne hors ligne. |

Ces choix sont remplaçables sans changer la conception : seules les interfaces décrites aux sections 6 à 8 sont contraignantes.

### 5.3 Authentification

Un seul compte administrateur, avec identifiant et mot de passe. Le serveur enregistre le mot de passe sous forme hachée (Argon2id) et délivre une session à durée limitée. Après une première connexion, l'application reste utilisable hors ligne sans nouvelle authentification, derrière un code de verrouillage local facultatif.

## 6. Modèle de données

Tous les identifiants sont des UUID générés sur l'appareil, ce qui permet de créer des données hors ligne sans collision. Chaque enregistrement porte les champs techniques `version`, `mis_a_jour_le` et `supprime_le` (suppression logique), utilisés par la synchronisation.

### 6.1 Tables

**administrateur** : id, identifiant, mot\_de\_passe\_hache.

**parametre** : id, devise, jours\_ouvrables\_defaut, fraction\_maladie, fraction\_conge, unite\_arrondi.

**employe** : id, numero (entier unique), nom, postnom, prenom, fonction, telephone, salaire\_base, actif.

**periode** : id, annee, mois, statut (ouverte ou cloturee), cloturee\_le. Unicité sur (annee, mois).

**ligne\_paie** : id, periode\_id, employe\_id, puis :

- copie figée de l'identité au moment de l'ouverture : numero, nom, postnom, prenom, fonction, telephone ;
- variables saisies : salaire, hs, libelle\_hs, retrait, jours\_ouvrables, jours\_maladie, jours\_conge, jours\_absence ;
- résultats calculés : salaire\_a\_payer, jours\_prestes, retenue\_maladie, retenue\_conge, retenue\_absence, global, virement.

Unicité sur (periode\_id, employe\_id). La copie de l'identité garantit qu'un bulletin ancien reste identique même si l'employé change de fonction ou de téléphone.

**journal** : id, horodatage, action (ouverture, clôture, réouverture, import, export, modification), entite, entite\_id, detail. Les réouvertures de période y sont toujours inscrites.

### 6.2 Contraintes

- jours\_ouvrables ≥ 1 ;
- jours\_maladie, jours\_conge, jours\_absence ≥ 0 et leur somme ≤ jours\_ouvrables ;
- montants monétaires en numérique exact (jamais en flottant) ;
- une ligne de période clôturée n'accepte aucune modification tant que la période n'est pas rouverte ;
- un employé rattaché à au moins une ligne de paie ne peut pas être supprimé, seulement désactivé.

### 6.3 Règle de figement

Pendant qu'une période est ouverte, les résultats calculés sont recalculés à chaque modification. À la clôture, les valeurs calculées sont enregistrées telles quelles ; un bulletin imprimé plus tard reprend ces valeurs et non un nouveau calcul.

## 7. Interface

### 7.1 Écrans

| Écran | Contenu |
| --- | --- |
| Connexion | Identifiant et mot de passe. |
| Tableau de bord | Période en cours, effectif, total à virer, accès aux actions du mois, état de la synchronisation. |
| Employés | Liste, recherche, création, modification, désactivation. |
| Paie du mois | Grille de saisie et de calcul, totaux, boutons Clôturer et Générer les bulletins. |
| Récapitulatif | Indicateurs de contrôle de la période. |
| Bulletins | Sélection de l'employé, aperçu A4, impression, export PDF, export groupé. |
| Bordereau de virement | Liste nominative et total à provisionner, export PDF et CSV. |
| Historique | Périodes passées, consultation et réexport. |
| Paramètres | Devise, jours par défaut, fractions de retenue, unité d'arrondi, import, sauvegarde. |

### 7.2 Grille de la paie du mois

La grille reprend l'ordre des colonnes du classeur pour que l'administrateur retrouve ses repères. Les colonnes de saisie sont éditables au clavier (flèches, tabulation, entrée) ; les colonnes calculées sont grisées. La ligne de totaux reste visible en bas. Une ligne en anomalie (contrôle de la section 3.3) est surlignée avec le motif au survol. Sur téléphone, la grille se transforme en fiche par employé.

### 7.3 Indicateur de synchronisation

Un indicateur permanent affiche l'un des états suivants : « Hors ligne », « Modifications en attente », « Synchronisé », « Conflit à résoudre ». L'administrateur n'est jamais bloqué par l'état du réseau.

## 8. Fonctionnement hors ligne et synchronisation

### 8.1 Principe

Toute action s'applique d'abord à la base locale, puis est inscrite dans une file de modifications en attente. Dès que la connexion existe, l'application envoie la file au serveur et récupère les modifications faites ailleurs.

### 8.2 Interfaces de l'API

| Méthode et chemin | Rôle |
| --- | --- |
| POST /auth/connexion | Ouvre une session. |
| POST /synchro/envoi | Reçoit un lot de modifications : entité, identifiant, version de base, nouvelles valeurs. |
| GET /synchro/reception?depuis=curseur | Renvoie les modifications serveur postérieures au curseur. |
| GET /export/periode/{id}?format=xlsx\|csv | Export serveur d'une période. |
| GET /sauvegarde | Archive complète des données. |

Les opérations courantes (employés, périodes, lignes) passent toutes par la synchronisation : il n'existe pas de point d'écriture direct qui contournerait la file locale.

### 8.3 Résolution des conflits

L'administrateur étant unique, un conflit ne survient que s'il modifie le même enregistrement sur deux appareils sans synchronisation intermédiaire. Règles :

- chaque modification envoyée porte la version de base qu'elle a lue ;
- si la version serveur est identique, la modification est acceptée et la version augmente ;
- si la version serveur est plus récente, la modification n'est pas écrasée : l'écran « Conflit à résoudre » affiche les deux valeurs et l'administrateur choisit ;
- toute modification visant une période clôturée est refusée par le serveur, y compris si elle a été saisie hors ligne avant la clôture sur un autre appareil ; l'administrateur est alors invité à rouvrir la période.

### 8.4 Reprise

Si l'envoi échoue en cours de route, la file est rejouée sans doublon : chaque modification porte un identifiant unique que le serveur reconnaît et ignore s'il l'a déjà traitée.

## 9. Migration depuis le classeur

Une fonction d'import lit le fichier GESTION\_PAIE\_ECOLE\_RAFIKI\_COMPLET.xlsx.

1. Lecture de l'onglet Paie Mensuelle, lignes 5 à 34, colonnes A à H, J, M, O, Q et U ; les lignes dont la colonne NOM est vide sont ignorées.
2. Création des employés à partir de A à F et U, puis d'une période choisie par l'administrateur avec une ligne de paie par employé.
3. Contrôle de parité : le logiciel recalcule chaque ligne et la compare aux colonnes S et T du classeur. Les écarts sont listés ; l'import n'est confirmé qu'après acceptation explicite de l'administrateur.
4. Les formules du fichier ne sont pas importées : seuls les nombres saisis le sont, les résultats étant recalculés par le moteur.

Pendant une période de transition, l'export Excel permet de produire une feuille comparable à l'ancien état de paie.

## 10. Tests et critères d'acceptation

### 10.1 Moteur de calcul

- Le cas de la section 4.4 donne exactement les résultats indiqués.
- Cas d'arrondi : global 554,99 donne 550 ; 555,00 donne 560 ; 557,20 donne 560 ; 474,55 donne 470 ; 0,00 donne 0.
- Aucun écart d'un centime entre le moteur du navigateur et celui du serveur sur un jeu de 1 000 lignes tirées au hasard.
- Jours ouvrables à 0 : saisie refusée.
- Somme des absences supérieure aux jours ouvrables : saisie refusée.
- Ligne sans absence, sans HS et sans retrait : global égal au salaire, virement arrondi du salaire.
- Écart d'arrondi total égal à la somme des virements moins la somme des globaux.

### 10.2 Parité avec le classeur

Sur le classeur fourni et sur au moins deux autres états de paie réels anonymisés, les colonnes S et T de chaque ligne et les totaux de la ligne 35 sont retrouvés à l'identique, hors la cellule B13 du récapitulatif, dont la formule est corrigée.

### 10.3 Hors ligne et synchronisation

- Création d'une période, saisie complète et clôture sans connexion, puis synchronisation réussie.
- Modification du même enregistrement sur deux appareils : conflit détecté et proposé à l'administrateur.
- Coupure de connexion pendant l'envoi : aucune perte ni doublon à la reprise.
- Modification d'une période clôturée refusée par le serveur.

### 10.4 Bulletin

- Un bulletin d'une période passée reste identique, au caractère près, quand il est réimprimé plus tard.
- La mise en page tient sur une page A4 portrait, avec les zones de signature visibles.

## 11. Sécurité et sauvegarde

Les données traitées sont des salaires et des coordonnées de personnes. Mesures :

- liaison chiffrée (HTTPS) entre l'application et le serveur ;
- mots de passe stockés sous forme hachée, session à durée limitée, verrouillage après plusieurs échecs ;
- code de verrouillage local facultatif pour l'application installée ;
- sauvegarde automatique quotidienne de la base serveur, conservée plusieurs jours, et archive complète téléchargeable à tout moment depuis les paramètres ;
- journal des actions sensibles (clôture, réouverture, import, export) ;
- conservation indéfinie des périodes clôturées, sans suppression possible depuis l'interface.

## 12. Hors périmètre de la version 1

- retenues légales et déclarations sociales (CNSS, IPR) ;
- plusieurs administrateurs, rôles et circuit de validation ;
- plusieurs établissements ;
- paiement bancaire automatique ;
- devise secondaire (franc congolais) ;
- gestion des présences par pointage.

Le modèle de données et les paramètres sont construits pour accueillir ces évolutions sans refonte : les retenues légales s'ajouteraient comme des rubriques de retenue paramétrables dans le moteur de calcul, et les rôles comme une table d'utilisateurs rattachée à la même API.

## 13. Plan de réalisation

| Étape | Contenu | Résultat vérifiable |
| --- | --- | --- |
| 1. Moteur de calcul | Module partagé, tests de la section 10.1. | Cas de référence et cas limites validés. |
| 2. Application locale | Employés, périodes, grille de paie, récapitulatif, bulletin, bordereau, base locale. | Une paie complète produite sans serveur. |
| 3. Serveur et synchronisation | API, base PostgreSQL, file de modifications, conflits, clôture. | Tests de la section 10.3 réussis. |
| 4. Migration et finitions | Import du classeur, parité, exports Excel et CSV, sauvegarde, sécurité. | Parité de la section 10.2 atteinte. |
