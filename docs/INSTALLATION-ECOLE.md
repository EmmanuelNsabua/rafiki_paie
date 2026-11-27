# Guide d'Installation et d'Utilisation — École RAFIKI

Bienvenue dans le guide officiel de **École RAFIKI - Gestionnaire de paie**.
Ce guide a été rédigé sans jargon technique pour vous accompagner pas à pas lors de la première installation et de l'utilisation quotidienne du logiciel.

---

## 1. Configuration minimale requise

Pour faire fonctionner Starclip dans les meilleures conditions :

- **Système d'exploitation** : Microsoft Windows 10 ou Windows 11 (architecture 64 bits).
- **Espace disque disponible** : 500 Mo minimum.
- **Mémoire vive (RAM)** : 4 Go recommandés.
- **Écran** : Résolution minimale de 1280 x 720 pixels.

> [!IMPORTANT]
> **Une session Windows par poste :**
> Starclip enregistre les données de paie localement sous le compte utilisateur Windows actuellement connecté (`%APPDATA%\rafiki-paie`).
> Veillez à **toujours ouvrir la même session Windows** sur l'ordinateur de l'école pour retrouver l'ensemble de vos données, historiques et sauvegardes.

---

## 2. Téléchargement et Somme de contrôle

1. Téléchargez le fichier d'installation officiel : `Ecole-RAFIKI-Setup-<version>.exe` depuis la page des publications (Releases).
2. _(Optionnel mais recommandé)_ **Vérification de l'intégrité (SHA256)** :
   Pour vérifier que le fichier téléchargé n'a pas été altéré, vous pouvez ouvrir une invite PowerShell et taper :
   ```powershell
   Get-FileHash .\Ecole-RAFIKI-Setup-0.1.1.exe -Algorithm SHA256
   ```
   L'empreinte obtenue doit être rigoureusement identique à celle indiquée dans le fichier `SHA256SUMS.txt`.

---

## 3. Installation pas à pas (Gestion des avertissements Windows)

L'installeur s'exécute **sans droits d'administrateur** et ne modifie aucun fichier système sensible de Windows.

### Étape A : Avertissement « Windows a protégé votre ordinateur » (SmartScreen)

Comme Starclip est un logiciel interne dédié à l'école sans certificat d'autorité payant, Windows SmartScreen peut afficher une fenêtre bleue préventive :

1. Cliquez sur le lien **« Informations complémentaires »** situé sous le texte d'avertissement.
2. Un bouton **« Exécuter quand même »** apparaît en bas à droite : cliquez dessus.

### Étape B : Contrôle intelligent des applications (Windows 11)

Si l'ordinateur utilise le mode de _Contrôle intelligent des applications_, Windows peut afficher une notification de blocage. Dans ce cas, une simple exclusion du fichier ou le basculement temporaire de la politique permet son exécution sécurisée.

### Étape C : Assistant d'installation

1. L'assistant s'affiche entièrement en **français**.
2. Il installe le logiciel dans votre dossier utilisateur et crée automatiquement un raccourci **Starclip** sur votre Bureau et dans votre Menu Démarrer.
3. À la fin de l'installation, laissez cochée la case « Lancer Starclip » puis cliquez sur **Fermer**.

---

## 4. Premier lancement et Écran d'accueil

Au démarrage, un écran d'accueil visuel vous informe du chargement rapide des composants.
Dès l'ouverture, l'application est prête à l'emploi :

- **Journal de paie** : pour créer ou importer une opération mensuelle.
- **Récapitulatif & Contrôle** : pour vérifier la synthèse financière et le bordereau bancaire.
- **Liste des employés** : pour enregistrer et gérer le personnel actif.
- **Réglages** : pour consulter les sauvegardes automatiques et rechercher des mises à jour.

---

## 5. Mises à jour automatiques du logiciel

Starclip intègre un mécanisme de mise à jour automatique :

- Dès que le poste est connecté à Internet, Starclip vérifie en arrière-plan (sans jamais ralentir votre travail) si une version plus récente est disponible.
- Si une mise à jour est trouvée, elle est téléchargée en tâche de fond.
- Une notification discrète s'affiche dans l'application : **« Starclip est prête. Redémarrez pour l'installer. »** avec un bouton **« Redémarrer et installer »**.
- **Aucun redémarrage n'est jamais forcé** : vous pouvez continuer votre travail et choisir d'installer la mise à jour plus tard à la fermeture de l'application.
- **Sécurité absolue** : avant chaque mise à jour, Starclip crée automatiquement une copie de sécurité intégrale de votre base (`..._avant-maj-<version>.sqlite`).

---

## 6. Sauvegardes et Désinstallation sans perte

### Où se trouvent vos données ?

Vos données et sauvegardes automatiques sont conservées dans le dossier :
`C:\Users\<VotreNom>\AppData\Roaming\rafiki-paie`

### Comment désinstaller sans perdre vos données ?

Si vous désinstallez Starclip depuis les Paramètres Windows (_Applications installées_) :

1. Les fichiers du programme sont proprement supprimés.
2. **Vos bases de données, vos sauvegardes et vos préférences restent 100% conservées** sur le disque dur.
3. Lors d'une future réinstallation de Starclip, l'application retrouvera instantanément l'ensemble de vos données sans aucune manipulation nécessaire.

---

## 7. Que faire si l'antivirus signale le fichier ?

Certains antivirus peuvent marquer un programme récent comme « inconnu » :

1. Ajoutez une exception sur le fichier `Starclip-Setup-<version>.exe` ou sur le dossier `%LOCALAPPDATA%\Programs\starclip`.
2. Le code source de Starclip est entièrement audité, certifié sans composant malveillant et fonctionne en circuit fermé (aucune donnée financière n'est transmise vers l'extérieur).
