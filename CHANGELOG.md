# Journal des versions — Starclip

Toutes les modifications notables apportées au logiciel Starclip sont consignées dans ce document.
Ce journal est rédigé en français pour être clair et accessible à l'équipe administrative de l'école.

---

## [0.1.0] — 2026-11-27

Première version officielle de **Starclip - Gestionnaire de paie** pour l'École Rafiki.

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
