import { app } from 'electron';
import type Database from 'better-sqlite3';
import { ouvrirBaseDeDonnees } from './database';
import {
  EmployeService,
  OperationService,
  LigneService,
  JournalService,
  ErreurMetier,
} from '../domain';

export const DONNEES_PROTOTYPE_EMPLOYES = [
  {
    nom: 'Kabongo',
    postnom: 'Ilunga',
    prenom: 'Gloire',
    fonction: 'Professeur',
    telephone: '+243 81 000 0010',
    salaire_base: '500',
    variables: {
      hs: '40',
      retrait: '20',
      jours_maladie: '2',
      jours_conge: '1',
      jours_absence: '1',
    },
  },
  {
    nom: 'Mutombo',
    postnom: 'Kasongo',
    prenom: 'Aimé',
    fonction: 'Préfet',
    telephone: '+243 81 000 0011',
    salaire_base: '450',
    variables: {},
  },
  {
    nom: 'Ngoy',
    postnom: 'Banza',
    prenom: 'Rachel',
    fonction: 'Secrétaire',
    telephone: '+243 81 000 0012',
    salaire_base: '380',
    variables: {
      jours_absence: '2',
    },
  },
  {
    nom: 'Tshibangu',
    postnom: 'Mwamba',
    prenom: 'Daniel',
    fonction: 'Professeur',
    telephone: '+243 81 000 0013',
    salaire_base: '600',
    variables: {
      hs: '30',
    },
  },
  {
    nom: 'Kalala',
    postnom: 'Ngandu',
    prenom: 'Esther',
    fonction: 'Ouvrière',
    telephone: '+243 81 000 0014',
    salaire_base: '320',
    variables: {
      jours_maladie: '1',
    },
  },
  {
    nom: 'Mulumba',
    postnom: 'Kyungu',
    prenom: 'Patrick',
    fonction: 'Surveillant',
    telephone: '+243 81 000 0015',
    salaire_base: '410',
    variables: {
      retrait: '50',
    },
  },
];

export interface OptionsSeed {
  force?: boolean;
}

export function executerSeed(db: Database.Database, options: OptionsSeed = {}): void {
  // 1. Refuser si empaqueté
  if (app?.isPackaged) {
    throw new ErreurMetier(
      'SEED_INTERDIT_EN_PRODUCTION',
      'Le chargement des données de test est strictement interdit dans une application empaquetée.'
    );
  }

  // 2. Vérifier si des données existent déjà
  const nbEmployes = (db.prepare('SELECT count(*) as nb FROM employe').get() as { nb: number }).nb;

  if (nbEmployes > 0 && !options.force) {
    throw new ErreurMetier(
      'BASE_NON_VIDE',
      `La base contient déjà ${nbEmployes} employé(s). Pour écraser et recharger le jeu d exemple, utilisez l option --force.`
    );
  }

  const employeService = new EmployeService(db);
  const operationService = new OperationService(db);
  const ligneService = new LigneService(db);
  const journalService = new JournalService(db);

  // 3. Réinitialiser si --force
  if (nbEmployes > 0 && options.force) {
    const txNettoyage = db.transaction(() => {
      // Passer les opérations en statut 'ouverte' pour autoriser la suppression des lignes par les déclencheurs
      db.exec(`
        UPDATE operation_paie SET statut = 'ouverte';
        DELETE FROM ligne_paie;
        DELETE FROM operation_paie;
        DELETE FROM employe;
      `);
    });
    txNettoyage();
  }

  // 4. Charger les employés
  const employesCrees: any[] = [];
  for (const item of DONNEES_PROTOTYPE_EMPLOYES) {
    const emp = employeService.creer({
      nom: item.nom,
      postnom: item.postnom,
      prenom: item.prenom,
      fonction: item.fonction,
      telephone: item.telephone,
      salaire_base: item.salaire_base,
    });
    employesCrees.push({ emp, variables: item.variables });
  }

  // 5. Créer l'opération d'octobre 2026 (22 jours)
  const op = operationService.ouvrir(2026, 10, 22);
  const detailOp = operationService.obtenir(op.id);

  // 6. Renseigner les variables spécifiques du prototype
  for (const { emp, variables } of employesCrees) {
    const ligne = detailOp.lignes.find((l) => l.employe_id === emp.id);
    if (!ligne) continue;

    if (Object.keys(variables).length > 0) {
      ligneService.modifier(ligne.id, variables);
    }
  }

  // 7. Clôturer l'opération (calcule, fige les montants et journalise)
  operationService.terminer(op.id);

  const opFinale = operationService.obtenir(op.id);

  journalService.ajouter({
    action: 'SEED_INITIALISE',
    entite: 'systeme',
    detail: `Jeu d exemple chargé : ${employesCrees.length} employés, opération 10/2026 clôturée (total viré: ${opFinale.totaux.total_virement} USD)`,
  });
}

// Point d'entrée CLI lorsqu'exécuté directement via script
if (require.main === module) {
  const force = process.argv.includes('--force');
  const db = ouvrirBaseDeDonnees();
  try {
    executerSeed(db, { force });
    console.log('[SEED] Données d exemple du prototype chargées avec succès !');
    process.exit(0);
  } catch (err: any) {
    console.error('[SEED ERREUR]', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
}
