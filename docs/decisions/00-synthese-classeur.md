# Synthèse de l'analyse du classeur de paie — École Rafiki

Ce document consigne les formules réelles observées dans le classeur d'origine `GESTION_PAIE_ECOLE_RAFIKI_COMPLET.xlsx` (onglets « Paie Mensuelle », « Récapitulatif & Contrôle », « Fiche de Paie Individuelle »), les anomalies identifiées et les corrections appliquées.

---

## 1. Onglet « Paie Mensuelle »

Le tableau principal contient 30 lignes de salariés (lignes 5 à 34) et une ligne de total général (ligne 35).

### 1.1 Colonnes de saisie

| Colonne | En-tête                                        | Rôle / Description                                |
| ------- | ---------------------------------------------- | ------------------------------------------------- |
| **A**   | `N°`                                           | Numéro d'ordre de l'employé (entier 1 à 30)       |
| **B**   | `NOM`                                          | Nom de famille                                    |
| **C**   | `POSTNOM`                                      | Postnom                                           |
| **D**   | `PRENOM`                                       | Prénom                                            |
| **E**   | `FONCTION`                                     | Poste occupé (ex: Professeur, Préfet, Secrétaire) |
| **F**   | `SALAIRE`                                      | Salaire de base contractuel en USD                |
| **G**   | `HS`                                           | Heures supplémentaires et primes en USD           |
| **H**   | `RETRAIT`                                      | Retraits, avances ou acomptes sur salaire en USD  |
| **J**   | `NBRE OUVRABLE`                                | Nombre de jours ouvrables du mois (ex: 22)        |
| **M**   | `MALADIE`                                      | Jours de maladie justifiés                        |
| **O**   | `CONGE DE CIRCONSTANCE / MATERNITE / DEUIL`    | Jours de congé spécial                            |
| **Q**   | `ABSENCE NON JUSTIFIEE + RETARD + MISE A PIED` | Jours d'absence non justifiée                     |
| **U**   | `N° TEL`                                       | Numéro de téléphone de l'employé                  |

### 1.2 Colonnes calculées et formules réelles (ligne 5)

| Colonne | En-tête                     | Formule réelle dans le classeur         | Interprétation                                                                                                                |
| ------- | --------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **I**   | `SALAIRE A PAYER`           | `=IF(B5="","",F5+G5-H5)`                | Sous-total des gains bruts diminués des avances : `salaire + hs - retrait`                                                    |
| **K**   | `NBRE PRESTE`               | `=IF(B5="","",J5-M5-O5-Q5)`             | Jours prestés effectifs : `ouvrables - maladie - congé - absence`                                                             |
| **L**   | `NET A PAYER`               | `=IF(B5="","",IFERROR((F5/J5)*K5,0))`   | **Valeur purement indicative** (prorata du salaire de base selon les jours prestés). N'entre pas dans le calcul du net final. |
| **N**   | `NET MALADIE`               | `=IF(B5="","",IFERROR((F5/J5/3)*M5,0))` | Retenue maladie : 1/3 du taux journalier par jour de maladie                                                                  |
| **P**   | `NET CONGE`                 | `=IF(B5="","",IFERROR((F5/J5/3)*O5,0))` | Retenue congé spécial : 1/3 du taux journalier par jour de congé                                                              |
| **R**   | `NET ABSENCE`               | `=IF(B5="","",IFERROR((F5/J5)*Q5,0))`   | Retenue absence non justifiée : taux journalier plein (100%) par jour d'absence                                               |
| **S**   | `GLOBAL`                    | `=IF(B5="","",I5-N5-P5-R5)`             | Salaire net exact avant arrondi : `salaire_a_payer - net_maladie - net_conge - net_absence`                                   |
| **T**   | `VIREMENT BANQUE (ARRONDI)` | `=IF(B5="","",ROUND(S5,-1))`            | Montant net à transférer à la banque, arrondi à la dizaine de dollars la plus proche (demi-dizaine au supérieur)              |

### 1.3 Ligne 35 (Total Général)

Les colonnes F, G, H, I, L, N, P, R, S, T sont sommées par `SUM(col5:col34)`.

---

## 2. Onglet « Récapitulatif & Contrôle »

| Cellule | Indicateur                        | Formule réelle du classeur         | Statut & Correction                                                                                                                                             |
| ------- | --------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B4**  | Effectif actif                    | `=COUNTA('Paie Mensuelle'!B5:B34)` | Conforme                                                                                                                                                        |
| **B5**  | Total Salaires de Base            | `='Paie Mensuelle'!F35`            | Conforme                                                                                                                                                        |
| **B6**  | Total Heures Supplémentaires      | `='Paie Mensuelle'!G35`            | Conforme                                                                                                                                                        |
| **B7**  | Total Retraits / Avances          | `='Paie Mensuelle'!H35`            | Conforme                                                                                                                                                        |
| **B8**  | Total Retenues Maladie            | `='Paie Mensuelle'!N35`            | Conforme                                                                                                                                                        |
| **B9**  | Total Retenues Congés             | `='Paie Mensuelle'!P35`            | Conforme                                                                                                                                                        |
| **B10** | Total Retenues Absences           | `='Paie Mensuelle'!R35`            | Conforme                                                                                                                                                        |
| **B11** | Total GLOBAL (avant arrondi)      | `='Paie Mensuelle'!S35`            | Conforme                                                                                                                                                        |
| **B12** | TOTAL VIREMENT BANQUE             | `='Paie Mensuelle'!T35`            | Conforme                                                                                                                                                        |
| **B13** | **Écart d'arrondissement global** | `=B10-B9`                          | **ANOMALIE MAJEURE** : B10-B9 soustrait les retenues de congés aux retenues d'absence ! La vraie formule doit être `B12-B11` (`Total Virement - Total Global`). |

---

## 3. Onglet « Fiche de Paie Individuelle »

Le bulletin référence le numéro d'ordre saisi en cellule **C1** et retrouve les informations par indexation matricielle :

- Identité de l'agent : `INDEX('Paie Mensuelle'!$B$5:$B$34, MATCH($C$1, 'Paie Mensuelle'!$A$5:$A$34, 0)) & " " & INDEX(...)`
- **Période affichée (cellule E7)** : `=TEXT(TODAY(), "mmmm yyyy")` -> **ANOMALIE** : dépend de la date du jour de l'ordinateur (`TODAY()`) au lieu de la période réelle de paie.
- Formules de sous-totaux :
  - `E17` = `E14+E15-F16` (Salaire de base + HS - Retrait = Salaire à payer)
  - `F21` = `SUM(F18:F20)` (Total retenues absences/maladie/congés)
  - `E23` = `E17-F21` (Global net avant arrondi)
  - `E24` = `ROUND(E23, -1)` (Net arrondi à virer)

---

## 4. Anomalies constatées et décisions de conception

1. **Écart d'arrondi faux (cellule B13 du récapitulatif)** :
   - _Constat_ : `=B10-B9` (retenues absences − retenues congés).
   - _Correction_ : le logiciel calcule `somme(virements) - somme(globaux)`.
2. **Période dynamique du bulletin (cellule E7)** :
   - _Constat_ : `=TEXT(TODAY(), "mmmm yyyy")` altère les bulletins lors de toute réimpression ultérieure.
   - _Correction_ : chaque bulletin est rattaché de façon immuable à sa période de paie (`mois`, `annee`).
3. **Division par zéro masquée par IFERROR** :
   - _Constat_ : si les jours ouvrables sont à 0 ou non renseignés, `IFERROR` renvoie 0 en masquant le problème.
   - _Correction_ : validation stricte `jours_ouvrables >= 1`.
4. **Colonne L trompeuse** :
   - _Constat_ : la colonne L « NET A PAYER » calcule `(F/J)*K`, ce qui déduit à 100% maladie et congé au lieu de 1/3, introduisant une confusion avec le vrai net (colonne S).
   - _Correction_ : supprimée de l'interface principale de paie pour éviter toute ambiguïté.
5. **Absence de contrôle sur les absences** :
   - _Constat_ : aucune validation n'empêche `maladie + congé + absence > ouvrables`.
   - _Correction_ : validation bloquante dans le moteur de calcul et l'interface.
