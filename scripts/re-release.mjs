import { execSync } from 'node:child_process';

const tag = process.argv[2] || 'v0.1.1';
const commitMessage =
  process.argv[3] || `chore(release): ${tag} - renommage en École RAFIKI et release ${tag}`;

function run(cmd, ignoreError = false) {
  console.log(`\n> ${cmd}`);
  try {
    const output = execSync(cmd, { stdio: 'inherit', encoding: 'utf8' });
    return output;
  } catch (err) {
    if (!ignoreError) {
      console.error(`Échec de la commande : ${cmd}`);
      process.exit(1);
    }
  }
}

console.log(`=== Publication automatique de la release (${tag}) ===\n`);

// 1. Validation de style Prettier
run('npx prettier --write .');

// 2. Ajout des fichiers modifiés et commit
run('git add .');

const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
if (status.length > 0) {
  run(`git commit -m "${commitMessage}"`);
} else {
  console.log('Aucun changement à commiter.');
}

// 3. Push de la branche main vers GitHub
run('git push origin main');

// 4. Suppression locale de l'ancien tag (si existant)
run(`git tag -d ${tag}`, true);

// 5. Suppression distante de l'ancien tag sur GitHub (si existant)
run(`git push origin :refs/tags/${tag}`, true);

// 6. Création du nouveau tag sur le commit actuel
run(`git tag ${tag}`);

// 7. Push du nouveau tag pour déclencher le workflow GitHub Actions
run(`git push origin ${tag}`);

console.log(`\n Release ${tag} déclenchée avec succès sur GitHub !`);
console.log('Suivi en direct : https://github.com/EmmanuelNsabua/rafiki_paie/actions');
