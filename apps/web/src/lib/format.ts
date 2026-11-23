import Decimal from 'decimal.js';

const NOMS_MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

const JOURS_SEMAINE = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

const MOIS_ABREGES = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

/**
 * Formate un montant décimal en chaîne monétaire conforme à la typographie Rafiki :
 * - Arrondi moitié vers le haut
 * - Séparateur de milliers : espace insécable fine (\u202F)
 * - Séparateur décimal : virgule (,)
 * - Suffixe : « $ » précédé d'une espace insécable (\u00A0$)
 *
 * Exemples :
 * formaterMontant("15000") -> "15 000 $"
 * formaterMontant("474.546", 2) -> "474,55 $"
 * formaterMontant("474.55") -> "474,55 $"
 * formaterMontant("0") -> "0 $"
 */
export function formaterMontant(
  chaine: string | null | undefined,
  decimales?: number
): string {
  if (chaine === null || chaine === undefined || chaine.trim() === '') {
    chaine = '0';
  }

  let dec: Decimal;
  try {
    dec = new Decimal(chaine);
  } catch {
    dec = new Decimal(0);
  }

  let nbDec: number;
  if (decimales !== undefined) {
    nbDec = decimales;
  } else {
    // Si la valeur a des centimes non nuls, formater avec 2 décimales, sinon 0
    nbDec = dec.decimalPlaces() > 0 ? 2 : 0;
  }

  const arrondi = dec.toDecimalPlaces(nbDec, Decimal.ROUND_HALF_UP);
  const fixed = arrondi.toFixed(nbDec);

  const [partieEntiere, partieFractionnaire] = fixed.split('.');
  // Espace insécable fine pour les milliers
  const entierFormate = partieEntiere.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');

  if (partieFractionnaire !== undefined && nbDec > 0) {
    return `${entierFormate},${partieFractionnaire}\u00A0$`;
  }
  return `${entierFormate}\u00A0$`;
}

/**
 * Formate un pourcentage de variation avec son signe et espace insécable fine :
 * - Positif : « +2,5 % »
 * - Négatif : « −3,2 % » (signe moins typographique \u2212)
 * - Nul : « 0,0 % »
 */
export function formaterPourcentage(chaine: string | null | undefined): string {
  if (chaine === null || chaine === undefined || chaine.trim() === '') {
    return '';
  }

  let dec: Decimal;
  try {
    dec = new Decimal(chaine);
  } catch {
    return '';
  }

  const dec1 = dec.toDecimalPlaces(1, Decimal.ROUND_HALF_UP);
  const valStr = dec1.abs().toFixed(1).replace('.', ',');

  if (dec1.greaterThan(0)) {
    return `+${valStr}\u202F%`;
  }
  if (dec1.lessThan(0)) {
    return `\u2212${valStr}\u202F%`;
  }
  return `0,0\u202F%`;
}

/**
 * Retourne le nom français complet d'un mois (1 = Janvier, 12 = Décembre).
 */
export function libelleMois(mois: number): string {
  if (mois < 1 || mois > 12) return '';
  return NOMS_MOIS[mois - 1];
}

/**
 * Formate le libellé d'une opération mensuelle (ex: "Novembre 2026").
 */
export function libelleOperation(annee: number, mois: number): string {
  const nomMois = libelleMois(mois);
  return `${nomMois} ${annee}`;
}

/**
 * Formate une date en chaîne typographique française :
 * « Dimanche 22 nov. 2026 »
 */
export function formaterDate(dateEntree: Date | string | number): string {
  const d = dateEntree instanceof Date ? dateEntree : new Date(dateEntree);
  if (isNaN(d.getTime())) {
    return '';
  }

  const jourSemaine = JOURS_SEMAINE[d.getDay()];
  const jourDuMois = d.getDate();
  const moisAbrege = MOIS_ABREGES[d.getMonth()];
  const annee = d.getFullYear();

  return `${jourSemaine} ${jourDuMois} ${moisAbrege} ${annee}`;
}

/**
 * Normalise la saisie dans un champ numérique :
 * - Accepte chiffres et un seul séparateur (virgule ou point, converti en point)
 * - Supprime les espaces
 * - Supprime tout autre caractère
 * - Champ vide ou non numérique retourné comme "0"
 */
export function normaliserSaisieDecimale(texte: string): string {
  if (!texte) return '0';
  let propre = texte.replace(/\s+/g, '').replace(',', '.');

  // Filtrer les caractères non autorisés (chiffres et point uniquement)
  propre = propre.replace(/[^0-9.]/g, '');
  if (!propre || propre === '.') return '0';

  // Conserver uniquement le premier point décimal
  const premierPoint = propre.indexOf('.');
  if (premierPoint !== -1) {
    const entiere = propre.slice(0, premierPoint);
    const fraction = propre.slice(premierPoint + 1).replace(/\./g, '');
    propre = `${entiere}.${fraction}`;
  }

  // Éliminer les zéros superflus en tête (ex: "005" -> "5", mais "0.5" -> "0.5", "0" -> "0")
  if (propre.startsWith('0') && propre.length > 1 && !propre.startsWith('0.')) {
    propre = propre.replace(/^0+/, '');
    if (!propre) propre = '0';
    if (propre.startsWith('.')) propre = `0${propre}`;
  }

  return propre;
}

/**
 * Calcule le total des jours d'absences (maladie, congé, absence).
 */
export function totalJoursAbsences(
  maladie = '0',
  conge = '0',
  absence = '0'
): string {
  try {
    const dMal = new Decimal(maladie || '0');
    const dCong = new Decimal(conge || '0');
    const dAbs = new Decimal(absence || '0');
    const total = dMal.plus(dCong).plus(dAbs);
    if (total.isZero()) return '0';
    return total.toString();
  } catch {
    return '0';
  }
}

