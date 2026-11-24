# Rapport Phase 3 : Import, Export et Reprise des Données

**Date** : 24 novembre 2026  
**Auteur** : Antigravity (Équipe Rafiki Paie)  
**Branche** : `main`  
**Statut** : Validé

---

## 1. Objectifs de la Phase 3

Implémenter et garantir de bout en bout :

1. **L'importation du classeur Excel historique** (`docs/annexes/02-GESTION_PAIE_ECOLE_RAFIKI_COMPLET.xlsx`, strictement en lecture seule).
2. **La parité exacte centime par centime** entre le moteur TypeScript (`packages/calcul`) et les formules du classeur historique.
3. **Les exports métier complets** : Employés (XLSX/CSV), Opération mensuelle (XLSX/CSV), Récapitulatif mensuel (XLSX/CSV), Bulletins individuels et collectifs (HTML/PDF), Bordereau bancaire (PDF, CSV, XLSX).
4. **La reprise et sauvegarde intègre de la base SQLite locale** : Sauvegardes horodatées, export vers un dossier choisi, restauration avec vérification d'intégrité et de compatibilité de schéma, sauvegarde de précaution automatique avant remplacement.

---

## 2. Parité des Calculs Métier

Le classeur Excel d'origine sert de référence de calcul. Les tests de parité (`apps/desktop/tests/parite-excel.test.ts`) vérifient chaque formule contre le moteur de calcul `packages/calcul` :

| Grandeur             | Formule Excel historique        | Moteur TypeScript (`decimal.js`)                      | Statut   |
| :------------------- | :------------------------------ | :---------------------------------------------------- | :------- |
| **Salaire à payer**  | `=F5+G5-H5`                     | `salaire + hs - retrait`                              | Conforme |
| **Taux journalier**  | `=F5/J` (J = jours ouvrables)   | `salaire / jours_ouvrables`                           | Conforme |
| **Retenue Maladie**  | `=(F5/J)/3 * jours_maladie`     | `taux_journalier / 3 * jours_maladie`                 | Conforme |
| **Retenue Congé**    | `=(F5/J)/3 * jours_conge`       | `taux_journalier / 3 * jours_conge`                   | Conforme |
| **Retenue Absence**  | `=(F5/J) * jours_absence`       | `taux_journalier * jours_absence`                     | Conforme |
| **Net Global**       | `=I5 - retenues`                | `salaire_a_payer - total_retenues`                    | Conforme |
| **Virement arrondi** | `=MROUND(P5, 10)`               | Arrondi à la dizaine la plus proche (la moitié monte) | Conforme |
| **Écart d'arrondi**  | Formule Excel erronée `=B10-B9` | **Corrigé** : `somme(virements) - somme(globaux)`     | Conforme |

### Cas de référence validé

- Employé : `KABONGO ILUNGA GLOIRE`
- Salaire de base : **500,00 $**
- Heures supplémentaires : **40,00 $**
- Retrait / Avance : **20,00 $**
- Jours ouvrables : **22**
- Absences : 2 j maladie, 1 j congé, 1 j injustifié
- Taux journalier : `500 / 22 = 22,7272... $`
- Retenues : `(22.7272.../3)*2 + (22.7272.../3)*1 + 22.7272...*1 = 45,45 $`
- Net global : `(500 + 40 - 20) - 45,45 = 474,55 $`
- Virement bancaire arrondi : **470,00 $**

---

## 3. Architecture Technique et Sécurité

### 3.1 Dépendance XLSX

- `xlsx` (SheetJS) a été sélectionné pour `apps/desktop` afin d'assurer une lecture stable sans régression sur les éléments graphiques internes du classeur (`xl/drawings/drawing1.xml`), tout en supportant les cellules à formules sans cache.

### 3.2 Importation Excel (`ImportExcelService`)

- **Validation du format** : Vérification des signatures magic bytes (ZIP/PK `50 4B 03 04`) côté processus principal Node.js.
- **Prévisualisation sans persistance** : Détection des anomalies (salaire négatif, absence > jours ouvrables), détection des doublons existants (par nom complet ou numéro d'ordre).
- **Atomicité** : Transaction SQLite globale (`db.transaction`). En cas d'erreur sur une ligne, aucun enregistrement n'est inséré.
- **Audit et confidentialité** : Journalisation de l'import sans exposition de données personnelles sensibles (PII).

### 3.3 Protection Anti-Injection Formules (CSV)

- Tout export CSV neutralise les préfixes de formules potentiellement malveillants (`=`, `+`, `-`, `@`) en les préfixant d'une apostrophe `'`.
- Encodage en **UTF-8 avec BOM** (`\uFEFF`) pour une ouverture directe et sans corruption d'accents dans Microsoft Excel.

### 3.4 Sauvegarde & Restauration (`SauvegardeService`)

- Sauvegarde à chaud via l'API native `db.backup()`.
- Vérification d'intégrité avant restauration : `PRAGMA integrity_check`.
- Contrôle de structure de base : présence obligatoire de `schema_migrations`, `employe`, `operation_paie`, `ligne_paie`.
- Sauvegarde de précaution automatique horodatée avant tout écrasement lors de la restauration.

---

## 4. Résultats des Validations

- `packages/calcul` : **100% passants** (Vecteurs et cas limites).
- `apps/desktop` tests :
  - `parite-excel.test.ts` : 4 tests passants.
  - `import-excel.test.ts` : 5 tests passants.
  - `exports.test.ts` : 5 tests passants.
  - `sauvegarde.test.ts` : 9 tests passants.
  - Autres suites (Bordereau, Clôture, Audit, Migrations) : 100% passants.
