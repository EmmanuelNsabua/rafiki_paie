import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculerLignePaie, arrondirVirement, CalculError } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const vecteursPath = resolve(__dirname, '../vecteurs/vecteurs.json');
const vecteurs = JSON.parse(readFileSync(vecteursPath, 'utf-8'));

describe('Moteur de calcul TypeScript - Vecteurs de test', () => {
  it('valide le cas complet de référence du classeur', () => {
    const { input, expected } = vecteurs.complet;
    const res = calculerLignePaie(input);

    expect(res.salaire_a_payer_display).toBe(expected.salaire_a_payer);
    expect(res.jours_prestes).toBe(expected.jours_prestes);
    expect(res.retenue_maladie_display).toBe(expected.retenue_maladie_display);
    expect(res.retenue_conge_display).toBe(expected.retenue_conge_display);
    expect(res.retenue_absence_display).toBe(expected.retenue_absence_display);
    expect(res.global_display).toBe(expected.global_display);
    expect(res.virement).toBe(expected.virement);
  });

  it('valide tous les cas d arrondi', () => {
    for (const item of vecteurs.arrondi) {
      const v = arrondirVirement(item.salaire, 10);
      expect(v).toBe(item.expected_virement);
    }
  });

  it('valide les cas d erreur obligatoires', () => {
    for (const item of vecteurs.erreurs) {
      expect(() => calculerLignePaie(item.input)).toThrow(CalculError);
      try {
        calculerLignePaie(item.input);
      } catch (err: any) {
        expect(err.code).toBe(item.expected_error);
      }
    }
  });

  it('accepte diviseur_retenue et unite_arrondi personnalisés', () => {
    const res = calculerLignePaie({
      salaire: '600',
      jours_ouvrables: 20,
      jours_maladie: 2,
      diviseur_retenue: 2, // Retenue = (600/20) / 2 * 2 = 30
      unite_arrondi: 5,
    });
    expect(res.retenue_maladie_display).toBe('30.00');
    expect(res.virement % 5).toBe(0);

    expect(() =>
      calculerLignePaie({
        salaire: '600',
        jours_ouvrables: 20,
        diviseur_retenue: 0,
      })
    ).toThrow(CalculError);
  });
});
