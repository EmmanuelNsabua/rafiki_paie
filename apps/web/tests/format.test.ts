import { describe, it, expect } from 'vitest';
import {
  formaterMontant,
  formaterPourcentage,
  libelleMois,
  libelleOperation,
  formaterDate,
  normaliserSaisieDecimale,
} from '../src/lib/format';

describe('lib/format.ts — Fonctions de mise en forme', () => {
  describe('formaterMontant (au moins 15 cas)', () => {
    it('1. entier standard', () => {
      expect(formaterMontant('15000')).toBe('15\u202F000\u00A0$');
    });

    it('2. zéro sans décimales', () => {
      expect(formaterMontant('0')).toBe('0\u00A0$');
    });

    it('3. zéro avec 2 décimales demandées', () => {
      expect(formaterMontant('0', 2)).toBe('0,00\u00A0$');
    });

    it('4. décimal avec 2 chiffres après la virgule', () => {
      expect(formaterMontant('474.55')).toBe('474,55\u00A0$');
    });

    it('5. arrondi moitié vers le haut (.545 -> .55)', () => {
      expect(formaterMontant('474.545', 2)).toBe('474,55\u00A0$');
    });

    it('6. arrondi moitié vers le bas (.544 -> .54)', () => {
      expect(formaterMontant('474.544', 2)).toBe('474,54\u00A0$');
    });

    it('7. montant supérieur au million avec séparateurs multiples', () => {
      expect(formaterMontant('1250000')).toBe('1\u202F250\u202F000\u00A0$');
    });

    it('8. montant avec centimes et millions', () => {
      expect(formaterMontant('1250000.75')).toBe('1\u202F250\u202F000,75\u00A0$');
    });

    it('9. chaîne vide ou null/undefined retombe à 0 $', () => {
      expect(formaterMontant('')).toBe('0\u00A0$');
      expect(formaterMontant(null)).toBe('0\u00A0$');
      expect(formaterMontant(undefined)).toBe('0\u00A0$');
    });

    it('10. petit montant décimal', () => {
      expect(formaterMontant('0.05')).toBe('0,05\u00A0$');
    });

    it('11. montant négatif (ex: écart d arrondi négatif)', () => {
      expect(formaterMontant('-4.85')).toBe('-4,85\u00A0$');
    });

    it('12. nombre à un seul chiffre', () => {
      expect(formaterMontant('5')).toBe('5\u00A0$');
    });

    it('13. formatage avec 0 décimale explicite sur un montant décimal', () => {
      expect(formaterMontant('554.99', 0)).toBe('555\u00A0$');
    });

    it('14. formatage avec 2 décimales sur un entier exact', () => {
      expect(formaterMontant('500', 2)).toBe('500,00\u00A0$');
    });

    it('15. dizaine arrondie du classeur (555 -> 560)', () => {
      expect(formaterMontant('560')).toBe('560\u00A0$');
    });

    it('16. montant à 3 chiffres (centaine)', () => {
      expect(formaterMontant('125')).toBe('125\u00A0$');
    });

    it('17. 1000 tout juste', () => {
      expect(formaterMontant('1000')).toBe('1\u202F000\u00A0$');
    });

    it('18. 999 sans séparateur', () => {
      expect(formaterMontant('999')).toBe('999\u00A0$');
    });
  });

  describe('formaterPourcentage (au moins 8 cas)', () => {
    it('1. hausse avec un chiffre après la virgule', () => {
      expect(formaterPourcentage('2.5')).toBe('+2,5\u202F%');
    });

    it('2. baisse avec signe moins typographique', () => {
      expect(formaterPourcentage('-3.2')).toBe('\u22123,2\u202F%');
    });

    it('3. stable nul', () => {
      expect(formaterPourcentage('0.0')).toBe('0,0\u202F%');
    });

    it('4. entier positif formaté avec virgule et zéro', () => {
      expect(formaterPourcentage('5')).toBe('+5,0\u202F%');
    });

    it('5. entier négatif', () => {
      expect(formaterPourcentage('-10')).toBe('\u221210,0\u202F%');
    });

    it('6. arrondi moitié vers le haut (.25 -> .3)', () => {
      expect(formaterPourcentage('2.25')).toBe('+2,3\u202F%');
    });

    it('7. arrondi moitié vers le bas (.24 -> .2)', () => {
      expect(formaterPourcentage('2.24')).toBe('+2,2\u202F%');
    });

    it('8. null ou vide retourne chaîne vide', () => {
      expect(formaterPourcentage(null)).toBe('');
      expect(formaterPourcentage('')).toBe('');
      expect(formaterPourcentage(undefined)).toBe('');
    });

    it('9. très faible hausse', () => {
      expect(formaterPourcentage('0.04')).toBe('0,0\u202F%');
    });

    it('10. forte hausse', () => {
      expect(formaterPourcentage('100')).toBe('+100,0\u202F%');
    });
  });

  describe('libelleMois & libelleOperation', () => {
    it('retourne les libellés corrects en français', () => {
      expect(libelleMois(1)).toBe('Janvier');
      expect(libelleMois(11)).toBe('Novembre');
      expect(libelleMois(12)).toBe('Décembre');
      expect(libelleOperation(2026, 11)).toBe('Novembre 2026');
      expect(libelleOperation(2026, 10)).toBe('Octobre 2026');
    });
  });

  describe('formaterDate', () => {
    it('formate une date au format français Dimanche 22 nov. 2026', () => {
      // 2026-11-22 était bien un dimanche
      const d = new Date(2026, 10, 22);
      expect(formaterDate(d)).toBe('Dimanche 22 nov. 2026');
    });
  });

  describe('normaliserSaisieDecimale', () => {
    it('remplace la virgule par un point et supprime les espaces', () => {
      expect(normaliserSaisieDecimale(' 125,50 ')).toBe('125.50');
      expect(normaliserSaisieDecimale('40')).toBe('40');
      expect(normaliserSaisieDecimale('')).toBe('0');
      expect(normaliserSaisieDecimale('abc')).toBe('0');
      expect(normaliserSaisieDecimale('12.3.4')).toBe('12.34');
      expect(normaliserSaisieDecimale('005')).toBe('5');
      expect(normaliserSaisieDecimale('0.75')).toBe('0.75');
    });
  });
});
