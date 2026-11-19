import Decimal from 'decimal.js';

// Configure high precision decimal arithmetic (no intermediate rounding)
Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export interface CalculInput {
  salaire: number | string | Decimal;
  hs?: number | string | Decimal;
  retrait?: number | string | Decimal;
  jours_ouvrables: number;
  jours_maladie?: number;
  jours_conge?: number;
  jours_absence?: number;
  fraction_maladie?: number | string | Decimal;
  fraction_conge?: number | string | Decimal;
  unite_arrondi?: number;
}

export interface CalculResult {
  salaire_a_payer: Decimal;
  salaire_a_payer_display: string;
  jours_prestes: number;
  retenue_maladie: Decimal;
  retenue_maladie_display: string;
  retenue_conge: Decimal;
  retenue_conge_display: string;
  retenue_absence: Decimal;
  retenue_absence_display: string;
  global: Decimal;
  global_display: string;
  virement: number;
}

export class CalculError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'CalculError';
    this.code = code;
  }
}

export function arrondirVirement(montant: Decimal | number | string, unite = 10): number {
  const d = new Decimal(montant);
  const u = new Decimal(unite);
  // Half-up rounding to the nearest multiple of unite
  return d.dividedBy(u).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times(u).toNumber();
}

export function calculerLignePaie(input: CalculInput): CalculResult {
  const joursOuvrables = input.jours_ouvrables ?? 0;
  if (joursOuvrables < 1) {
    throw new CalculError(
      'JOURS_OUVRABLES_INVALID',
      'Les jours ouvrables doivent être supérieurs ou égaux à 1.'
    );
  }

  const joursMaladie = input.jours_maladie ?? 0;
  const joursConge = input.jours_conge ?? 0;
  const joursAbsence = input.jours_absence ?? 0;

  if (joursMaladie + joursConge + joursAbsence > joursOuvrables) {
    throw new CalculError(
      'ABSENCES_DEPASSEE',
      'Le total des absences dépasse le nombre de jours ouvrables.'
    );
  }

  const salaire = new Decimal(input.salaire ?? 0);
  const hs = new Decimal(input.hs ?? 0);
  const retrait = new Decimal(input.retrait ?? 0);
  const uniteArrondi = input.unite_arrondi ?? 10;

  // Fractions (default 1/3 for maladie and conge)
  const fractionMaladie =
    input.fraction_maladie !== undefined
      ? new Decimal(input.fraction_maladie)
      : new Decimal(1).dividedBy(3);
  const fractionConge =
    input.fraction_conge !== undefined
      ? new Decimal(input.fraction_conge)
      : new Decimal(1).dividedBy(3);

  // Formulas
  // salaire_a_payer = salaire + hs - retrait
  const salaireAPayer = salaire.plus(hs).minus(retrait);

  // taux_journalier = salaire / jours_ouvrables
  const tauxJournalier = salaire.dividedBy(joursOuvrables);

  // retenues sans arrondis intermédiaires
  const retenueMaladie = tauxJournalier.times(fractionMaladie).times(joursMaladie);
  const retenueConge = tauxJournalier.times(fractionConge).times(joursConge);
  const retenueAbsence = tauxJournalier.times(joursAbsence);

  // global = salaire_a_payer - retenue_maladie - retenue_conge - retenue_absence
  const global = salaireAPayer.minus(retenueMaladie).minus(retenueConge).minus(retenueAbsence);

  if (global.isNegative()) {
    throw new CalculError('GLOBAL_NEGATIF', 'Le net global est négatif.');
  }

  const joursPrestes = joursOuvrables - joursMaladie - joursConge - joursAbsence;
  const virement = arrondirVirement(global, uniteArrondi);

  return {
    salaire_a_payer: salaireAPayer,
    salaire_a_payer_display: salaireAPayer.toFixed(2),
    jours_prestes: joursPrestes,
    retenue_maladie: retenueMaladie,
    retenue_maladie_display: retenueMaladie.toFixed(2),
    retenue_conge: retenueConge,
    retenue_conge_display: retenueConge.toFixed(2),
    retenue_absence: retenueAbsence,
    retenue_absence_display: retenueAbsence.toFixed(2),
    global,
    global_display: global.toFixed(2),
    virement,
  };
}
