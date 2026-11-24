import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { calculerLignePaie, arrondirVirement } from '@rafiki/calcul';
import Decimal from 'decimal.js';

describe('Parité des calculs avec le classeur historique Excel', () => {
  const cheminClasseur = path.resolve(
    __dirname,
    '../../../docs/annexes/02-GESTION_PAIE_ECOLE_RAFIKI_COMPLET.xlsx'
  );

  it('lit le classeur historique et vérifie les formules de la ligne 5', () => {
    const wb = XLSX.readFile(cheminClasseur, { cellFormula: true, sheetStubs: true });
    expect(wb.SheetNames).toContain('Paie Mensuelle');
    expect(wb.SheetNames).toContain('Récapitulatif & Contrôle');
    expect(wb.SheetNames).toContain('Fiche de Paie Individuelle');

    const ws = wb.Sheets['Paie Mensuelle'];

    // Ligne 5 : KABONGO ILUNGA GLOIRE
    expect(ws['A5']?.v).toBe(1);
    expect(ws['B5']?.v).toBe('KABONGO');
    expect(ws['C5']?.v).toBe('ILUNGA');
    expect(ws['D5']?.v).toBe('GLOIRE');
    expect(ws['E5']?.v).toBe('PROFESSEUR (DISCIPLINE)');

    // Données saisies
    const salaire = Number(ws['F5']?.v); // 500
    const hs = Number(ws['G5']?.v); // 40
    const retrait = Number(ws['H5']?.v); // 20
    const joursOuvrables = Number(ws['J5']?.v); // 22
    const maladie = Number(ws['M5']?.v); // 2
    const conge = Number(ws['O5']?.v); // 1
    const absence = Number(ws['Q5']?.v); // 1

    expect(salaire).toBe(500);
    expect(hs).toBe(40);
    expect(retrait).toBe(20);
    expect(joursOuvrables).toBe(22);
    expect(maladie).toBe(2);
    expect(conge).toBe(1);
    expect(absence).toBe(1);

    // Formules Excel du fichier historique
    expect(ws['I5']?.f).toBe('IF(B5="","",F5+G5-H5)');
    expect(ws['K5']?.f).toBe('IF(B5="","",J5-M5-O5-Q5)');
    expect(ws['N5']?.f).toBe('IF(B5="","",IFERROR((F5/J5/3)*M5,0))');
    expect(ws['P5']?.f).toBe('IF(B5="","",IFERROR((F5/J5/3)*O5,0))');
    expect(ws['R5']?.f).toBe('IF(B5="","",IFERROR((F5/J5)*Q5,0))');
    expect(ws['S5']?.f).toBe('IF(B5="","",I5-N5-P5-R5)');
    expect(ws['T5']?.f).toBe('IF(B5="","",ROUND(S5,-1))');

    // Calculs via le moteur TypeScript
    const resultat = calculerLignePaie({
      salaire,
      hs,
      retrait,
      jours_ouvrables: joursOuvrables,
      jours_maladie: maladie,
      jours_conge: conge,
      jours_absence: absence,
    });

    // 1. Salaire à payer : 500 + 40 - 20 = 520 $
    expect(resultat.salaire_a_payer_display).toBe('520.00');

    // 2. Jours prestés : 22 - 2 - 1 - 1 = 18 jours
    expect(resultat.jours_prestes).toBe(18);

    // 3. Taux journalier : 500 / 22 = 22.727272... $
    // Retenue maladie : (500 / 22 / 3) * 2 = 15.151515... $ -> display 15.15 $
    expect(resultat.retenue_maladie_display).toBe('15.15');

    // 4. Retenue congé : (500 / 22 / 3) * 1 = 7.575757... $ -> display 7.58 $
    expect(resultat.retenue_conge_display).toBe('7.58');

    // 5. Retenue absence : (500 / 22) * 1 = 22.727272... $ -> display 22.73 $
    expect(resultat.retenue_absence_display).toBe('22.73');

    // Total retenues : 15.151515... + 7.575757... + 22.727272... = 45.454545... $ (45.45 $)
    const totalRetenues = resultat.retenue_maladie
      .plus(resultat.retenue_conge)
      .plus(resultat.retenue_absence);
    expect(totalRetenues.toFixed(2)).toBe('45.45');

    // 6. Net global exact : 520 - 45.454545... = 474.545454... $ -> display 474.55 $
    expect(resultat.global_display).toBe('474.55');

    // 7. Virement bancaire arrondi à la dizaine : 474.545454... -> 470 $
    expect(resultat.virement).toBe(470);
  });

  it('vérifie le cas de référence du prompt : 500 + 40 - 20 avec 45.45 $ de retenues -> 474.55 $ global et 470 $ virement', () => {
    const res = calculerLignePaie({
      salaire: '500',
      hs: '40',
      retrait: '20',
      jours_ouvrables: 22,
      jours_maladie: 2,
      jours_conge: 1,
      jours_absence: 1,
    });

    expect(res.salaire_a_payer.toString()).toBe('520');
    expect(res.global_display).toBe('474.55');
    expect(res.virement).toBe(470);
  });

  it('vérifie les règles d arrondi à la dizaine la plus proche (la moitié monte)', () => {
    expect(arrondirVirement('555.00')).toBe(560);
    expect(arrondirVirement('554.99')).toBe(550);
    expect(arrondirVirement('550.00')).toBe(550);
    expect(arrondirVirement('554.00')).toBe(550);
    expect(arrondirVirement('555')).toBe(560);
    expect(arrondirVirement('557')).toBe(560);
    expect(arrondirVirement('0')).toBe(0);
  });

  it('documente la correction de l anomalie B13 de l onglet Récapitulatif', () => {
    const wb = XLSX.readFile(cheminClasseur, { cellFormula: true, sheetStubs: true });
    const wsRecap = wb.Sheets['Récapitulatif & Contrôle'];

    // L'anomalie d'origine dans le classeur est B10 - B9 (absences - congés)
    expect(wsRecap['B13']?.f).toBe('B10-B9');

    // La logique corrigée du logiciel Rafiki Paie :
    // Écart d'arrondi = somme(virements) - somme(globaux)
    const globaux = new Decimal('474.545454545454545454545454546');
    const virements = new Decimal(470);
    const ecartArrondiCorrect = virements.minus(globaux);

    // 470 - 474.545455 = -4.545455 $ (affiché -4.55 $)
    expect(ecartArrondiCorrect.toFixed(2)).toBe('-4.55');
  });
});
