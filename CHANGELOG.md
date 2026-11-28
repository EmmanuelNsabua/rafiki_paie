# Journal des versions — École RAFIKI

Toutes les modifications notables apportées au logiciel École RAFIKI sont consignées dans ce document.
Ce journal est rédigé en français pour être clair et accessible à l'équipe administrative de l'école.

---

## [0.1.5] — 2026-11-27

### Amélioré

- **Splash Screen officiel de l'École RAFIKI** : Intégration du logo officiel de l'école tel quel, adoption de la charte couleur officielle (bleu `#168FB8`, vert `#8CD16D`, marron `#7A421D` sur fond blanc), et affichage dynamique de la version de l'application (`v0.1.5`).

---

## [0.1.4] — 2026-11-27

### Corrigé

- **Erreur `SQLITE_CONSTRAINT_UNIQUE` lors de l'import Excel** : Lorsqu'une opération de paie pour une période donnée (mois/année) avait été précédemment supprimée, la réouverture ou la ré-importation sur cette même période échouait sur la contrainte d'unicité SQLite. La période supprimée est désormais purgée proprement avant réouverture.
- **Réinitialisation au point zéro (`sauvegarde-service.ts`)** : Correction des noms de tables et d'identifiants (`journal`, `parametre.id = 'default'`) lors de la réinitialisation complète.
- **Logs techniques enrichis** : Inclusion du message SQLite exact (sans données personnelles) dans la Fiche Journal des Logs pour un diagnostic immédiat.

---

## [0.1.3] — 2026-11-27

### Nouveau

- **Suppression d'employés** : Ajout de l'action « Supprimer » dans le menu de la liste des employés avec boîte de dialogue de confirmation (protégée si l'employé figure dans une paie existante).
- **Restauration au point zéro** : Réinitialisation complète de la base de données après sauvegarde de sécurité et saisie de confirmation explicite (`Supprimer toutes les données`).
- **Importation directe d'un fichier de base de données (`.db` / `.sqlite`)** : Nouveau sélecteur natif placé à côté des mises à jour dans les Réglages.
- **Outil Fiche Journal des Logs & Raccourci Bureau** : Enregistrement persistant des erreurs et événements dans `%APPDATA%\rafiki-paie\logs\rafiki-paie.log`, fenêtre de consultation dédiée avec filtre et bouton « Copier tout », et création automatique d'un raccourci `Journal Logs École RAFIKI` sur le Bureau Windows.

### Amélioré

- **Exportation de sauvegarde via explorateur natif** : Remplacement du champ de saisie manuelle par un sélecteur de dossier générant automatiquement un fichier `.db`.
- **Écran Réglages simplifié** : Suppression de l'ancienne section d'import Excel redondante et affichage dynamique exact de la version de l'application (`v0.1.3`).

---

## [0.1.2] — 2026-11-27

### Corrigé

- **Importation Excel sans collision de numéros** : L'attribution des numéros d'employés est désormais entièrement gérée par la base de données locale SQLite de manière auto-incrémentale (`coalesce(max(numero), 0) + 1`). Le numéro de ligne Excel n'est plus forcé comme matricule système, éliminant tout risque de collision ou de rejet d'importation lorsqu'un employé de numéro 1 ou identique existe déjà dans l'application.

---

## [0.1.1] — 2026-11-27

### Modifié

- **Renommage officiel de l'application** : Adoption intégrale du nom **École RAFIKI** à travers l'interface utilisateur, la barre de titre, le splash screen, les raccourcis Windows, l'installeur NSIS et la landing page.
- **Landing page mise à jour** : Nouvelle structure modulaire et refonte des libellés pour refléter la release `v0.1.1` et l'installeur `Ecole-RAFIKI-Setup-0.1.1.exe`.

---

## [0.1.0] — 2026-11-27

Première version officielle du gestionnaire de paie pour l'École Rafiki.

### Nouveau

- **Gestion complète de la paie locale** : saisie des salaires, calculs certifiés sans erreur d'arrondi selon la formule officielle de l'école.
- **Installeur Windows dédié** : installation simple en un clic sans besoin de privilèges administrateur.
- **Écran de démarrage fluide** : affichage d'un écran d'accueil visuel pendant le chargement des données.
- **Importation de classeurs Excel** : récupération automatique des employés et des opérations de paie directement depuis le classeur historique.
- **Impression et exports officiels** :
  - Bulletins de paie individuels et collectifs conformes au format officiel.
  - Bordereau de virement bancaire (format Pepele Mobile / Rawbank).
  - Synthèse Récapitulatif & Contrôle avec correction automatique de l'écart d'arrondi.
- **Sauvegarde et restauration automatiques** : protection continue de la base de données SQLite avec rotation sécurisée des 10 dernières sauvegardes.
- **Mises à jour automatiques transparentes** : recherche des mises à jour en tâche de fond avec notification non bloquante et sauvegarde de sécurité avant installation.

### Amélioré

- **Stabilité des données utilisateur** : les bases de données et sauvegardes sont conservées intactes même en cas de réinstallation ou désinstallation de l'application.
- **Thèmes clair et sombre** : adaptation instantanée selon les préférences d'affichage avec contraste soigné et lisible.

### Corrigé

- Prise en charge native de la sélection de fichiers Excel dans l'environnement sécurisé Electron via `webUtils`.
- Verrou d'instance unique empêchant l'ouverture accidentelle de deux fenêtres simultanées sur la même base locale.
