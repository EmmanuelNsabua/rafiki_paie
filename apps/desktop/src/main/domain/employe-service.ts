import type Database from 'better-sqlite3';
import * as crypto from 'crypto';
import type { Employe } from '@rafiki/contrat';
import { ErreurMetier } from './erreurs';
import { JournalService } from './journal-service';

export interface EmployeCreation {
  numero?: number;
  nom: string;
  postnom?: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  code_banque?: string;
  salaire_base: string;
  actif?: number;
}

export interface EmployeModification {
  numero?: number;
  nom?: string;
  postnom?: string;
  prenom?: string;
  fonction?: string;
  telephone?: string;
  code_banque?: string;
  salaire_base?: string;
  actif?: number;
}

export class EmployeService {
  private journalService: JournalService;

  constructor(private db: Database.Database) {
    this.journalService = new JournalService(db);
  }

  /**
   * Retourne la liste des employés (par défaut actifs et non supprimés).
   */
  lister(options: { inclureInactifs?: boolean } = {}): Employe[] {
    if (options.inclureInactifs) {
      return this.db
        .prepare(
          `SELECT id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le, supprime_le
           FROM employe
           WHERE supprime_le IS NULL
           ORDER BY numero ASC`
        )
        .all() as Employe[];
    }

    return this.db
      .prepare(
        `SELECT id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le, supprime_le
         FROM employe
         WHERE supprime_le IS NULL AND actif = 1
         ORDER BY numero ASC`
      )
      .all() as Employe[];
  }

  /**
   * Obtient un employé par son identifiant UUID.
   */
  obtenir(id: string): Employe {
    const employe = this.db
      .prepare(
        `SELECT id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le, supprime_le
         FROM employe
         WHERE id = ? AND supprime_le IS NULL`
      )
      .get(id) as Employe | undefined;

    if (!employe) {
      throw new ErreurMetier(
        'EMPLOYE_INTROUVABLE',
        `Employé introuvable avec l identifiant ${id}.`
      );
    }

    return employe;
  }

  /**
   * Crée un nouvel employé.
   * Si le numéro n'est pas fourni, calcule automatiquement max(numero) + 1.
   */
  creer(data: EmployeCreation): Employe {
    if (!data.nom || data.nom.trim() === '') {
      throw new ErreurMetier('NOM_REQUIS', 'Le nom de famille est obligatoire.');
    }

    let numeroFinal = data.numero;
    if (numeroFinal === undefined || numeroFinal === null) {
      const maxRow = this.db
        .prepare('SELECT coalesce(max(numero), 0) as max_num FROM employe')
        .get() as { max_num: number };
      numeroFinal = maxRow.max_num + 1;
    }

    // Vérifier l'unicité du numéro
    const existant = this.db
      .prepare('SELECT id FROM employe WHERE numero = ? AND supprime_le IS NULL')
      .get(numeroFinal);
    if (existant) {
      throw new ErreurMetier(
        'NUMERO_EMPLOYE_DEJA_UTILISE',
        `Le numéro d employé ${numeroFinal} est déjà attribué.`
      );
    }

    const id = crypto.randomUUID();
    const maintenant = new Date().toISOString();
    const codeBanque = data.code_banque ?? '804';
    const postnom = data.postnom ?? '';
    const prenom = data.prenom ?? '';
    const fonction = data.fonction ?? '';
    const telephone = data.telephone ?? '';
    const actif = data.actif ?? 1;

    this.db
      .prepare(
        `INSERT INTO employe (id, numero, nom, postnom, prenom, fonction, telephone, code_banque, salaire_base, actif, version, mis_a_jour_le, supprime_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NULL)`
      )
      .run(
        id,
        numeroFinal,
        data.nom.trim(),
        postnom.trim(),
        prenom.trim(),
        fonction.trim(),
        telephone.trim(),
        codeBanque.trim(),
        data.salaire_base,
        actif,
        maintenant
      );

    this.journalService.ajouter({
      action: 'CREER_EMPLOYE',
      entite: 'employe',
      entite_id: id,
      detail: `Création de l employé N°${numeroFinal} ${data.nom} (salaire: ${data.salaire_base} USD)`,
    });

    return this.obtenir(id);
  }

  /**
   * Modifie un employé.
   * Règle stricte : Toute modification de salaire_base, telephone ou code_banque
   * est inscrite au journal avec la valeur avant et la valeur après.
   */
  modifier(id: string, modifs: EmployeModification): Employe {
    const actuel = this.obtenir(id);

    // Contrôle unicité numéro si modifié
    if (modifs.numero !== undefined && modifs.numero !== actuel.numero) {
      const doublon = this.db
        .prepare('SELECT id FROM employe WHERE numero = ? AND id != ? AND supprime_le IS NULL')
        .get(modifs.numero, id);
      if (doublon) {
        throw new ErreurMetier(
          'NUMERO_EMPLOYE_DEJA_UTILISE',
          `Le numéro ${modifs.numero} est déjà utilisé par un autre employé.`
        );
      }
    }

    const nouveauNumero = modifs.numero ?? actuel.numero;
    const nouveauNom = (modifs.nom ?? actuel.nom).trim();
    const nouveauPostnom = (modifs.postnom ?? actuel.postnom).trim();
    const nouveauPrenom = (modifs.prenom ?? actuel.prenom).trim();
    const nouvelleFonction = (modifs.fonction ?? actuel.fonction).trim();
    const nouveauTelephone = (modifs.telephone ?? actuel.telephone).trim();
    const nouveauCodeBanque = (modifs.code_banque ?? actuel.code_banque).trim();
    const nouveauSalaire = modifs.salaire_base ?? actuel.salaire_base;
    const nouvelActif = modifs.actif ?? actuel.actif;

    // Détection des modifications sensibles pour traçabilité au journal
    const changementsSensibles: string[] = [];

    if (nouveauSalaire !== actuel.salaire_base) {
      changementsSensibles.push(`salaire_base: "${actuel.salaire_base}" -> "${nouveauSalaire}"`);
    }
    if (nouveauTelephone !== actuel.telephone) {
      changementsSensibles.push(`telephone: "${actuel.telephone}" -> "${nouveauTelephone}"`);
    }
    if (nouveauCodeBanque !== actuel.code_banque) {
      changementsSensibles.push(`code_banque: "${actuel.code_banque}" -> "${nouveauCodeBanque}"`);
    }

    const maintenant = new Date().toISOString();
    const nouvelleVersion = actuel.version + 1;

    const tx = this.db.transaction(() => {
      this.db
        .prepare(
          `UPDATE employe
           SET numero = ?,
               nom = ?,
               postnom = ?,
               prenom = ?,
               fonction = ?,
               telephone = ?,
               code_banque = ?,
               salaire_base = ?,
               actif = ?,
               version = ?,
               mis_a_jour_le = ?
           WHERE id = ?`
        )
        .run(
          nouveauNumero,
          nouveauNom,
          nouveauPostnom,
          nouveauPrenom,
          nouvelleFonction,
          nouveauTelephone,
          nouveauCodeBanque,
          nouveauSalaire,
          nouvelActif,
          nouvelleVersion,
          maintenant,
          id
        );

      if (changementsSensibles.length > 0) {
        this.journalService.ajouter({
          action: 'MODIFIER_DONNEES_SENSIBLES_EMPLOYE',
          entite: 'employe',
          entite_id: id,
          detail: `Modification employé N°${nouveauNumero} (${actuel.nom}) : ${changementsSensibles.join(' ; ')}`,
        });
      } else {
        this.journalService.ajouter({
          action: 'MODIFIER_EMPLOYE',
          entite: 'employe',
          entite_id: id,
          detail: `Mise à jour des coordonnées employé N°${nouveauNumero}`,
        });
      }
    });

    tx();
    return this.obtenir(id);
  }

  /**
   * Désactive un employé.
   */
  desactiver(id: string): Employe {
    return this.modifier(id, { actif: 0 });
  }

  /**
   * Supprime logiquement un employé.
   * Refus strict si l'employé apparaît dans une opération de paie existante.
   */
  supprimer(id: string): void {
    const employe = this.obtenir(id);

    // Contrôle d'apparition dans une opération
    const apparitions = this.db
      .prepare('SELECT count(*) as nb FROM ligne_paie WHERE employe_id = ?')
      .get(id) as { nb: number };

    if (apparitions.nb > 0) {
      throw new ErreurMetier(
        'SUPPRESSION_EMPLOYE_INTERDITE',
        `L employé N°${employe.numero} (${employe.nom}) apparaît dans ${apparitions.nb} ligne(s) d opération de paie. Suppression physique ou logique interdite. Vous pouvez uniquement le désactiver.`
      );
    }

    const maintenant = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE employe
         SET supprime_le = ?,
             version = version + 1,
             mis_a_jour_le = ?
         WHERE id = ?`
      )
      .run(maintenant, maintenant, id);

    this.journalService.ajouter({
      action: 'SUPPRIMER_EMPLOYE',
      entite: 'employe',
      entite_id: id,
      detail: `Suppression de l employé N°${employe.numero} (${employe.nom})`,
    });
  }
}
