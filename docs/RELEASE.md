# Procédure de Publication d'une Version — École RAFIKI

Ce document décrit pas à pas la procédure stricte pour préparer, tester et publier une nouvelle version de École RAFIKI.

> [!IMPORTANT]
> **Règle d'or :** Ne publiez jamais une mise à jour sans l'avoir testée au préalable sur un poste d'essai représentatif de l'environnement de l'école (Windows 10/11 64 bits).

---

## 1. Préparation de la version

1. **Vérification de l'état du dépôt** :
   Assurez-vous que la branche `main` est propre et que tous les tests passent :

   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm run test:calcul
   npm run test --workspace=apps/desktop
   cd apps/web && npx vitest run
   ```

2. **Mise à jour du numéro de version** (SemVer : `MAJEUR.MINEUR.CORRECTIF`) :
   Mettez à jour le champ `"version"` dans :
   - `package.json` (racine)
   - `apps/desktop/package.json`
   - `apps/web/package.json`
   - `packages/contrat/package.json`
   - `packages/calcul/package.json`

3. **Mise à jour du journal des versions** :
   Complétez `CHANGELOG.md` avec la nouvelle section datée décrivant les changements en français simple dans les trois catégories :
   - `### Nouveau`
   - `### Amélioré`
   - `### Corrigé`

---

## 2. Construction et validation locale préalable

1. **Génération de l'installeur local sans publication** :
   ```bash
   npm run dist:desktop
   ```
2. **Génération des sommes de contrôle SHA256** :

   ```bash
   node scripts/generate-checksums.mjs
   ```

   Vérifiez que le fichier `release/SHA256SUMS.txt` contient bien l'empreinte de `Ecole-RAFIKI-Setup-<version>.exe`.

3. **Test d'installation sur poste de test** :
   - Exécutez l'installeur généré dans un environnement vierge.
   - Vérifiez le bon fonctionnement de l'import Excel, du calcul de la paie et de l'export des bulletins.
   - Vérifiez que la base SQLite préexistante est bien reconnue et que les données restent intactes.

---

## 3. Déclenchement de la Release GitHub

Une fois le test local validé avec succès :

1. **Commiter et taguer la version** :

   ```bash
   git add .
   git commit -m "chore(release): v<version>"
   git tag v<version>
   ```

2. **Pousser la branche et le tag vers GitHub** :

   ```bash
   git push origin main
   git push origin v<version>
   ```

3. **Action automatique GitHub Actions** :
   Le workflow `.github/workflows/release.yml` se déclenche automatiquement à la détection du tag `v*` :
   - Exécute l'ensemble des suites de tests automatisés.
   - Compile l'application Next.js et Electron.
   - Construit l'installeur NSIS Windows 64 bits.
   - Calcule le fichier `SHA256SUMS.txt`.
   - Publie la release GitHub en joignant l'installeur exécutable, le fichier de bloc de mise à jour `latest.yml` et `SHA256SUMS.txt`.

---

## 4. Vérification post-publication

1. Rendez-vous sur la page des Releases du dépôt GitHub.
2. Vérifiez la présence des fichiers :
   - `Starclip-Setup-<version>.exe`
   - `latest.yml`
   - `SHA256SUMS.txt`
3. Lancez Starclip sur un poste déjà équipé de la version précédente pour vérifier que la mise à jour automatique en arrière-plan se déclenche et propose la notification de redémarrage après 12 secondes.
