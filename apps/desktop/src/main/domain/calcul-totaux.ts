import Decimal from 'decimal.js';
import { calculerLignePaie, CalculError } from '@rafiki/calcul';
import type { LignePaie, LignePaieCalculee, TotauxOperation, Parametre } from '@rafiki/contrat';

export interface OptionsCalculLigne {
  diviseurRetenue?: number;
  uniteArrondi?: number;
}

/**
 * Calcule dynamiquement ou formate les montants d'une ligne de paie.
 */
export function calculerMontantsLigne(
  ligne: LignePaie,
  options: OptionsCalculLigne = {}
): LignePaieCalculee {
  const diviseurRetenue = options.diviseurRetenue ?? 3;
  const uniteArrondi = options.uniteArrondi ?? 10;

  // Si la ligne a déjà des résultats figés (opération terminée)
  if (ligne.salaire_a_payer !== null && ligne.net_global !== null && ligne.virement !== null) {
    const netDecimal = new Decimal(ligne.net_global);
    return {
      ...ligne,
      salaire_a_payer: ligne.salaire_a_payer,
      jours_prestes: ligne.jours_prestes ?? '0',
      retenue_maladie: ligne.retenue_maladie ?? '0',
      retenue_conge: ligne.retenue_conge ?? '0',
      retenue_absence: ligne.retenue_absence ?? '0',
      net_global: ligne.net_global,
      virement: ligne.virement,
      avertissement_net_negatif: netDecimal.isNegative(),
      erreur: null,
    };
  }

  // Calcul dynamique via packages/calcul
  try {
    const res = calculerLignePaie({
      salaire: ligne.salaire_base,
      hs: ligne.hs,
      retrait: ligne.retrait,
      jours_ouvrables: ligne.jours_ouvrables,
      jours_maladie: parseFloat(ligne.jours_maladie || '0'),
      jours_conge: parseFloat(ligne.jours_conge || '0'),
      jours_absence: parseFloat(ligne.jours_absence || '0'),
      diviseur_retenue: diviseurRetenue,
      unite_arrondi: uniteArrondi,
    });

    const netGlobalStr = res.global.toFixed(6);
    const virementStr = res.virement.toString();

    return {
      ...ligne,
      salaire_a_payer: res.salaire_a_payer.toFixed(2),
      jours_prestes: res.jours_prestes.toString(),
      retenue_maladie: res.retenue_maladie.toFixed(2),
      retenue_conge: res.retenue_conge.toFixed(2),
      retenue_absence: res.retenue_absence.toFixed(2),
      net_global: netGlobalStr,
      virement: virementStr,
      avertissement_net_negatif: res.global.isNegative(),
      erreur: null,
    };
  } catch (err: any) {
    const message = err instanceof CalculError ? err.message : String(err?.message || err);
    return {
      ...ligne,
      salaire_a_payer: '0',
      jours_prestes: '0',
      retenue_maladie: '0',
      retenue_conge: '0',
      retenue_absence: '0',
      net_global: '0',
      virement: '0',
      avertissement_net_negatif: false,
      erreur: message,
    };
  }
}

/**
 * Normalise un numéro de téléphone pour la détection de doublons :
 * supprime les espaces, points et tirets, et traite comme équivalents
 * les préfixes "+243", "243" et "0" initial.
 */
export function normaliserTelephone(tel: string): string {
  const sansSep = tel.replace(/[\s.-]/g, '');
  if (sansSep.startsWith('+243')) return sansSep.slice(4);
  if (sansSep.startsWith('243')) return sansSep.slice(3);
  if (sansSep.startsWith('0')) return sansSep.slice(1);
  return sansSep;
}

/**
 * Calcule les totaux d'une opération de paie à partir de ses lignes calculées.
 * Tout se fait en arithmétique décimale exacte dans le code TypeScript.
 */
export function calculerTotauxOperation(lignes: LignePaieCalculee[]): TotauxOperation {
  let sommeVirement = new Decimal(0);
  let sommeNetGlobal = new Decimal(0);
  let nbErreurs = 0;
  let nbSansTel = 0;
  let nbSansBk = 0;

  const freqsTel = new Map<string, number>();

  for (const l of lignes) {
    if (l.erreur) {
      nbErreurs++;
    } else {
      sommeVirement = sommeVirement.plus(new Decimal(l.virement || '0'));
      sommeNetGlobal = sommeNetGlobal.plus(new Decimal(l.net_global || '0'));
    }

    if (!l.telephone || l.telephone.trim() === '') {
      nbSansTel++;
    } else {
      const canon = normaliserTelephone(l.telephone);
      freqsTel.set(canon, (freqsTel.get(canon) ?? 0) + 1);
    }

    if (!l.code_banque || l.code_banque.trim() === '') {
      nbSansBk++;
    }
  }

  let nbTelDoubles = 0;
  for (const l of lignes) {
    if (l.telephone && l.telephone.trim() !== '') {
      const canon = normaliserTelephone(l.telephone);
      if ((freqsTel.get(canon) ?? 0) > 1) {
        nbTelDoubles++;
      }
    }
  }

  // Écart d'arrondi = total(virements) - total(nets avant arrondi)
  const ecartArrondi = sommeVirement.minus(sommeNetGlobal);

  return {
    total_virement: sommeVirement.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toString(),
    total_net_global: sommeNetGlobal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString(),
    ecart_arrondi: ecartArrondi.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toString(),
    nombre_employes: lignes.length,
    nombre_lignes_erreur: nbErreurs,
    nombre_sans_telephone: nbSansTel,
    nombre_sans_code_banque: nbSansBk,
    nombre_telephones_en_double: nbTelDoubles,
  };
}
