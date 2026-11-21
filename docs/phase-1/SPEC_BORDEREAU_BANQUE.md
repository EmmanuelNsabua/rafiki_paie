# Spécification — Bordereau de virement (retour de la comptabilité)

Cette spécification complète l'addendum du prompt de la phase 0 et **prime sur lui**. Elle s'applique au groupe B de la correction de la phase 1 (`AUDIT_PHASE_1.md`) et à la phase 3 (sorties).

## 1. Contexte métier

Le bordereau de virement est le document que la promotrice de l'école envoie à la banque pour ordonner la paie. Le paiement passe par **Pepele Mobile** (mobile money) : le numéro de téléphone de chaque employé est la **destination du paiement**, et non un simple contact. Le service accepte les numéros de **tous les opérateurs**, pas seulement Vodacom : aucune règle ne doit restreindre un numéro à un opérateur ou à un préfixe. La promotrice reçoit le document **sous forme de fichier**, envoyé depuis un téléphone, puis le transmet. L'impression seule ne suffit pas.

## 2. Contenu du bordereau

Colonnes, dans cet ordre : **N°, nom, postnom, prénom, téléphone, code banque, virement**, puis une ligne **Total à provisionner**.

## 3. Téléphone

- Obligatoire pour qu'un employé figure correctement au bordereau.
- Validation à la saisie : après suppression des espaces, points et tirets, le numéro contient de 9 à 15 chiffres, avec un `+` facultatif en tête. Une valeur invalide est refusée avec un message en français.
- Avertissement (non bloquant) si deux employés actifs ont le même numéro : c'est soit un doublon, soit une fraude possible.
- Toute modification est inscrite au journal avec la valeur avant et après (déjà exigé).

## 4. Code banque

- La comptabilité confirme que **tous les employés ont le même code**. Il est modélisé comme un **paramètre de l'école** (`parametre.code_banque_defaut`), copié dans la fiche de chaque nouvel employé (champ pré-rempli, modifiable).
- **Aucune valeur par défaut dans le schéma SQL, les services ou les schémas du contrat. Aucune substitution silencieuse** (le `|| '804'` actuel est interdit).
- **Valeur fixée par le client : 840**, et non 804 (valeur erronée présente dans le dépôt). Elle devient la valeur initiale du paramètre de l'école, jamais une constante du code, du schéma ou des tests. Toute mention de 804 est remplacée.
- Un code manquant sur une fiche déclenche un avertissement visible (compteur « sans code banque » qui fonctionne) ; le bordereau affiche « — » dans la cellule.
- À la terminaison de la paie, le code et le téléphone sont copiés dans la ligne de paie et ne changent plus.

## 5. Export

- **PDF** : A4 portrait, lisible sur téléphone, en-tête de colonnes répété si plusieurs pages. Dans Electron, utiliser `webContents.printToPDF` avec une boîte de dialogue d'enregistrement ; nom proposé : `Bordereau-virement-<Mois>-<Année>.pdf`.
- **Excel** : fichier `.xlsx` (au minimum un CSV UTF-8 avec BOM et séparateur `;`), mêmes colonnes et même total.
- Chaque export est journalisé (`EXPORTER_BORDEREAU`, format, nombre de lignes, total), **sans** téléphone ni code banque dans le détail.
- Un bordereau réexporté après terminaison de la paie est identique au premier.

## 6. Tests à écrire

- Validation du numéro : formats valides (`+243 81 000 0010`, `0810000010`), invalides (lettres, trop court, trop long).
- Avertissement de doublon de numéro.
- Code banque manquant : compteur correct, aucune substitution, cellule « — ».
- Le paramètre est copié à la création d'un employé et modifiable ensuite.
- Figement du téléphone et du code à la terminaison.
- Le PDF et le fichier Excel existent, ne sont pas vides et contiennent les sept colonnes et le total.
