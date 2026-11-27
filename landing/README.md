# Landing Page de Release — École RAFIKI (v0.1.1)

Cette landing page présente la publication officielle de l'application desktop **École RAFIKI** (v0.1.1), selon les standards visuels et typographiques de l'application et inspirée de l'esthétique minimaliste d'[OpenAI Codex](https://openai.com/fr-FR/codex/).

## 1. Structure de la page (3 sections)

- **Section 1 : Hero & Annonce de la Release**
  - Badge de release officielle `v0.1.1` (Windows x64 NSIS)
  - Titre principal et accroche bivalente
  - Bouton direct de téléchargement de l'exécutable `Ecole-RAFIKI-Setup-0.1.1.exe`
  - Aperçu haute résolution de l'application dans un cadre de fenêtre desktop
  - Métriques clés (0.00 $ flottant, 100% local, 10 sauvegardes glissantes, 1 clic export bancaire)
- **Section 2 : Capacités clés & Captures d'écran interactives**
  - Showcase interactif avec 3 onglets commutables (Matrice de paie, Continuité Excel, Synthèse et contrôle)
  - Cartes des 3 piliers techniques (Sécurité SQLite WAL, Formules officielles et bordereau XLSX, interface haute densité)
- **Section 3 : Téléchargement, Intégrité SHA-256 & Installation**
  - Carte de téléchargement direct du binaire
  - Bloc d'empreinte cryptographique SHA-256 avec bouton de copie en un clic
  - Commande PowerShell prête à l'emploi (`Get-FileHash ...`)
  - Guide d'installation en 3 étapes (Télécharger, SmartScreen, Prêt à l'emploi)

## 2. Démarrage et construction

Depuis la racine du projet :

```bash
# Lancer le serveur de développement local (port 3333)
npm run dev:landing

# Construire la version statique de production (dossier landing/dist)
npm run build:landing

# Prévisualiser la version de production
npm run preview:landing
```
