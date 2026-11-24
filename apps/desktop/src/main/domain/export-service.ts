import type Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import Decimal from 'decimal.js';
import {
  type OptionsExportEmployes,
  type OptionsExportOperation,
  type OptionsExportRecapitulatif,
  type OptionsExportBulletin,
  type ResultatExportFichier,
  type Employe,
  type DetailOperationComplet,
} from '@rafiki/contrat';
import { EmployeService } from './employe-service';
import { OperationService } from './operation-service';
import { JournalService } from './journal-service';
import { ErreurMetier } from './erreurs';

const NOMS_MOIS_FR = [
  '',
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
];

/**
 * Neutralise les attaques par injection de formule dans les fichiers CSV / Excel (CSV Injection / Formula Injection).
 * Si une valeur texte débute par =, +, -, @, un guillemet simple d'échappement est préfixé.
 */
function assainirTexteFormule(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return '';
  const str = String(valeur).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function echapperCsv(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return '';
  const texte = assainirTexteFormule(valeur);
  if (texte.includes(';') || texte.includes('"') || texte.includes('\n') || texte.includes('\r')) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

export class ExportService {
  constructor(
    private db: Database.Database,
    private employeService: EmployeService,
    private operationService: OperationService,
    private journalService: JournalService
  ) {}

  /**
   * Export de la liste des employés en Excel (.xlsx) ou CSV UTF-8 avec BOM.
   */
  exporterEmployes(options: OptionsExportEmployes): ResultatExportFichier {
    const employes = this.employeService.lister({
      inclureInactifs: options.inclureInactifs,
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    const nomFichier = `Employes-Rafiki-${dateStr}.${options.format}`;
    const headers = [
      'N°',
      'Nom',
      'Postnom',
      'Prénom',
      'Fonction',
      'Téléphone',
      'Code banque',
      'Salaire de base ($)',
      'Statut',
    ];

    let contenu: Buffer | string;

    if (options.format === 'xlsx') {
      const rows: (string | number)[][] = [headers];
      employes.forEach((e) => {
        rows.push([
          e.numero ?? '',
          assainirTexteFormule(e.nom),
          assainirTexteFormule(e.postnom || ''),
          assainirTexteFormule(e.prenom || ''),
          assainirTexteFormule(e.fonction || ''),
          e.telephone || '',
          e.code_banque || '',
          Number(e.salaire_base) || 0,
          e.actif === 1 ? 'Actif' : 'Inactif',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employés');
      contenu = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } else {
      let csv = '\uFEFF'; // UTF-8 BOM
      csv += headers.join(';') + '\r\n';
      employes.forEach((e) => {
        csv +=
          [
            echapperCsv(e.numero),
            echapperCsv(e.nom),
            echapperCsv(e.postnom || ''),
            echapperCsv(e.prenom || ''),
            echapperCsv(e.fonction || ''),
            echapperCsv(e.telephone || ''),
            echapperCsv(e.code_banque || ''),
            echapperCsv(e.salaire_base),
            echapperCsv(e.actif === 1 ? 'Actif' : 'Inactif'),
          ].join(';') + '\r\n';
      });
      contenu = csv;
    }

    const cheminFichier = options.cheminDestination || path.join(process.cwd(), nomFichier);
    const dir = path.dirname(cheminFichier);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cheminFichier, contenu);

    const stats = fs.statSync(cheminFichier);

    this.journalService.ajouter({
      action: 'EXPORTER_EMPLOYES',
      entite: 'employe',
      detail: JSON.stringify({
        format: options.format,
        nombre_lignes: employes.length,
        nom_fichier: nomFichier,
      }),
    });

    return {
      succes: true,
      cheminFichier,
      nomFichier,
      tailleOctets: stats.size,
      nombreLignes: employes.length,
    };
  }

  /**
   * Export de l'état d'opération mensuelle (conforme à la structure fidèle de l'onglet Paie Mensuelle).
   */
  exporterOperation(options: OptionsExportOperation): ResultatExportFichier {
    const detail = this.operationService.obtenir(options.operationId);
    const nomMois = NOMS_MOIS_FR[detail.operation.mois] || String(detail.operation.mois);
    const nomFichier = `Paie-Mensuelle-${nomMois}-${detail.operation.annee}.${options.format}`;

    const headers = [
      'N°',
      'NOM',
      'POSTNOM',
      'PRENOM',
      'FONCTION',
      'SALAIRE',
      'HS',
      'RETRAIT',
      'SALAIRE A PAYER',
      'NBRE OUVRABLE',
      'NBRE PRESTE',
      'NET A PAYER',
      'MALADIE',
      'NET MALADIE',
      'CONGE DE CIRCONSTANCE / MATERNITE / DEUIL',
      'NET CONGE',
      'ABSENCE NON JUSTIFIEE + RETARD + MISE A PIED',
      'NET ABSENCE',
      'GLOBAL',
      'VIREMENT BANQUE (ARRONDI)',
      'N° TEL',
    ];

    let totalSalaire = new Decimal(0);
    let totalHs = new Decimal(0);
    let totalRetrait = new Decimal(0);
    let totalSalaireAPayer = new Decimal(0);
    let totalNetMaladie = new Decimal(0);
    let totalNetConge = new Decimal(0);
    let totalNetAbsence = new Decimal(0);
    let totalGlobal = new Decimal(0);
    let totalVirement = new Decimal(0);

    const dataRows: (string | number)[][] = [];

    detail.lignes.forEach((l) => {
      const sal = new Decimal(l.salaire_base || 0);
      const hs = new Decimal(l.hs || 0);
      const ret = new Decimal(l.retrait || 0);
      const salAPayer = new Decimal(l.salaire_a_payer || 0);
      const mal = new Decimal(l.retenue_maladie || 0);
      const cng = new Decimal(l.retenue_conge || 0);
      const abs = new Decimal(l.retenue_absence || 0);
      const glob = new Decimal(l.net_global || 0);
      const vir = new Decimal(l.virement || 0);

      totalSalaire = totalSalaire.plus(sal);
      totalHs = totalHs.plus(hs);
      totalRetrait = totalRetrait.plus(ret);
      totalSalaireAPayer = totalSalaireAPayer.plus(salAPayer);
      totalNetMaladie = totalNetMaladie.plus(mal);
      totalNetConge = totalNetConge.plus(cng);
      totalNetAbsence = totalNetAbsence.plus(abs);
      totalGlobal = totalGlobal.plus(glob);
      totalVirement = totalVirement.plus(vir);

      // Valeur indicative proratisée
      const joursPrestes = Number(l.jours_prestes) || 0;
      const joursOuvrables = Number(l.jours_ouvrables) || 22;
      const netProratise =
        joursOuvrables > 0 ? sal.dividedBy(joursOuvrables).times(joursPrestes) : new Decimal(0);

      dataRows.push([
        l.numero ?? '',
        assainirTexteFormule(l.nom),
        assainirTexteFormule(l.postnom || ''),
        assainirTexteFormule(l.prenom || ''),
        assainirTexteFormule(l.fonction || ''),
        sal.toNumber(),
        hs.toNumber(),
        ret.toNumber(),
        salAPayer.toNumber(),
        joursOuvrables,
        joursPrestes,
        Number(netProratise.toFixed(2)),
        Number(l.jours_maladie) || 0,
        Number(mal.toFixed(2)),
        Number(l.jours_conge) || 0,
        Number(cng.toFixed(2)),
        Number(l.jours_absence) || 0,
        Number(abs.toFixed(2)),
        Number(glob.toFixed(2)),
        vir.toNumber(),
        l.telephone || '',
      ]);
    });

    const totalRow: (string | number)[] = [
      'TOTAL GÉNÉRAL PAIE MENSUELLE',
      '',
      '',
      '',
      '',
      Number(totalSalaire.toFixed(2)),
      Number(totalHs.toFixed(2)),
      Number(totalRetrait.toFixed(2)),
      Number(totalSalaireAPayer.toFixed(2)),
      '',
      '',
      '',
      '',
      Number(totalNetMaladie.toFixed(2)),
      '',
      Number(totalNetConge.toFixed(2)),
      '',
      Number(totalNetAbsence.toFixed(2)),
      Number(totalGlobal.toFixed(2)),
      totalVirement.toNumber(),
      '',
    ];

    let contenu: Buffer | string;

    if (options.format === 'xlsx') {
      const rows = [headers, ...dataRows, totalRow];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Paie Mensuelle');
      contenu = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } else {
      let csv = '\uFEFF';
      csv += headers.join(';') + '\r\n';
      dataRows.forEach((r) => {
        csv += r.map((c) => echapperCsv(c)).join(';') + '\r\n';
      });
      csv += totalRow.map((c) => echapperCsv(c)).join(';') + '\r\n';
      contenu = csv;
    }

    const cheminFichier = options.cheminDestination || path.join(process.cwd(), nomFichier);
    const dir = path.dirname(cheminFichier);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cheminFichier, contenu);

    const stats = fs.statSync(cheminFichier);

    this.journalService.ajouter({
      action: 'EXPORTER_OPERATION',
      entite: 'operation_paie',
      entite_id: options.operationId,
      detail: JSON.stringify({
        format: options.format,
        nombre_lignes: detail.lignes.length,
        nom_fichier: nomFichier,
        total_virement: totalVirement.toString(),
      }),
    });

    return {
      succes: true,
      cheminFichier,
      nomFichier,
      tailleOctets: stats.size,
      nombreLignes: detail.lignes.length,
    };
  }

  /**
   * Export de la synthèse Récapitulatif & Contrôle avec correction de l'anomalie d'arrondi B13.
   */
  exporterRecapitulatif(options: OptionsExportRecapitulatif): ResultatExportFichier {
    const detail = this.operationService.obtenir(options.operationId);
    const nomMois = NOMS_MOIS_FR[detail.operation.mois] || String(detail.operation.mois);
    const nomFichier = `Recapitulatif-Paie-${nomMois}-${detail.operation.annee}.${options.format}`;

    let totalSalaire = new Decimal(0);
    let totalHs = new Decimal(0);
    let totalRetrait = new Decimal(0);
    let totalNetMaladie = new Decimal(0);
    let totalNetConge = new Decimal(0);
    let totalNetAbsence = new Decimal(0);
    let totalGlobal = new Decimal(0);
    let totalVirement = new Decimal(0);

    detail.lignes.forEach((l) => {
      totalSalaire = totalSalaire.plus(new Decimal(l.salaire_base || 0));
      totalHs = totalHs.plus(new Decimal(l.hs || 0));
      totalRetrait = totalRetrait.plus(new Decimal(l.retrait || 0));
      totalNetMaladie = totalNetMaladie.plus(new Decimal(l.retenue_maladie || 0));
      totalNetConge = totalNetConge.plus(new Decimal(l.retenue_conge || 0));
      totalNetAbsence = totalNetAbsence.plus(new Decimal(l.retenue_absence || 0));
      totalGlobal = totalGlobal.plus(new Decimal(l.net_global || 0));
      totalVirement = totalVirement.plus(new Decimal(l.virement || 0));
    });

    const ecartArrondi = totalVirement.minus(totalGlobal);

    const headers = ['Indicateur', 'Valeur', 'Observation'];
    const rows: (string | number)[][] = [
      headers,
      ['Effectif actif (employés saisis)', detail.lignes.length, 'Nombre de lignes renseignées'],
      [
        'Total Salaires de Base',
        Number(totalSalaire.toFixed(2)),
        'Somme des salaires contractuels ($)',
      ],
      [
        'Total Heures Supplémentaires (HS)',
        Number(totalHs.toFixed(2)),
        'Primes et heures supplémentaires ($)',
      ],
      [
        'Total Retraits / Avances',
        Number(totalRetrait.toFixed(2)),
        'Avances sur salaire ou retenues ($)',
      ],
      ['Total Retenues Maladie (Net)', Number(totalNetMaladie.toFixed(2)), 'Déduction maladie ($)'],
      [
        'Total Retenues Congés (Net)',
        Number(totalNetConge.toFixed(2)),
        'Déduction congés spéciaux ($)',
      ],
      [
        'Total Retenues Absences (Net)',
        Number(totalNetAbsence.toFixed(2)),
        'Déduction absences non justifiées ($)',
      ],
      ['Total GLOBAL (Avant arrondi)', Number(totalGlobal.toFixed(2)), 'Montant exact calculé ($)'],
      [
        'TOTAL VIREMENT BANQUE (Arrondi)',
        totalVirement.toNumber(),
        'Montant réel à transférer à la banque ($)',
      ],
      [
        'Écart d arrondissement global',
        Number(ecartArrondi.toFixed(2)),
        'Différence liée à l arrondi à 10 $ près (corrigé : Virements - Globaux)',
      ],
    ];

    let contenu: Buffer | string;

    if (options.format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Récapitulatif & Contrôle');
      contenu = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    } else {
      let csv = '\uFEFF';
      rows.forEach((r) => {
        csv += r.map((c) => echapperCsv(c)).join(';') + '\r\n';
      });
      contenu = csv;
    }

    const cheminFichier = options.cheminDestination || path.join(process.cwd(), nomFichier);
    const dir = path.dirname(cheminFichier);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cheminFichier, contenu);

    const stats = fs.statSync(cheminFichier);

    this.journalService.ajouter({
      action: 'EXPORTER_RECAPITULATIF',
      entite: 'operation_paie',
      entite_id: options.operationId,
      detail: JSON.stringify({
        format: options.format,
        nom_fichier: nomFichier,
        total_virement: totalVirement.toString(),
      }),
    });

    return {
      succes: true,
      cheminFichier,
      nomFichier,
      tailleOctets: stats.size,
      nombreLignes: rows.length - 1,
    };
  }

  /**
   * Génère le HTML A4 d'un bulletin de paie individuel conforme à l'onglet Fiche de Paie Individuelle.
   */
  private genererHtmlBulletin(
    ligne: DetailOperationComplet['lignes'][0],
    detailOp: DetailOperationComplet
  ): string {
    const nomMois = NOMS_MOIS_FR[detailOp.operation.mois] || String(detailOp.operation.mois);
    const periodeTexte = `${nomMois} ${detailOp.operation.annee}`;
    const nomComplet = [ligne.nom, ligne.postnom, ligne.prenom].filter(Boolean).join(' ');
    const tel = ligne.telephone || '—';

    const sal = Number(ligne.salaire_base || 0).toFixed(2);
    const hs = Number(ligne.hs || 0).toFixed(2);
    const ret = Number(ligne.retrait || 0).toFixed(2);
    const salAPayer = Number(ligne.salaire_a_payer || 0).toFixed(2);
    const retMaladie = Number(ligne.retenue_maladie || 0).toFixed(2);
    const retConge = Number(ligne.retenue_conge || 0).toFixed(2);
    const retAbsence = Number(ligne.retenue_absence || 0).toFixed(2);
    const totalRetenues = (Number(retMaladie) + Number(retConge) + Number(retAbsence)).toFixed(2);
    const globalNet = Number(ligne.net_global || 0).toFixed(2);
    const virementNet = Number(ligne.virement || 0).toFixed(0);

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bulletin de paie — ${nomComplet} (${periodeTexte})</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.4; margin: 0; padding: 0; }
    .bulletin-container { page-break-after: always; max-width: 180mm; margin: 0 auto; padding-bottom: 20mm; }
    .bulletin-container:last-child { page-break-after: avoid; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; }
    .header h1 { font-size: 16pt; margin: 0 0 4px 0; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; }
    .header h2 { font-size: 10pt; margin: 0; font-weight: normal; color: #444; }
    .section-title { font-size: 11pt; font-weight: bold; background: #f0f0f0; padding: 4px 8px; margin: 14px 0 8px 0; border-left: 4px solid #333; }
    .table-info { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .table-info td { padding: 4px 6px; font-size: 10pt; }
    .table-info td.label { font-weight: 600; width: 22%; color: #333; }
    .table-info td.val { width: 28%; }
    .table-detail { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .table-detail th, .table-detail td { border: 1px solid #ccc; padding: 6px 8px; font-size: 10pt; }
    .table-detail th { background: #f7f7f7; font-weight: bold; text-align: center; }
    .table-detail td.num { text-align: right; font-family: 'Consolas', monospace; }
    .table-detail tr.subtotal { font-weight: bold; background: #fafafa; }
    .table-detail tr.total-final { font-weight: bold; font-size: 12pt; background: #f0f4f8; }
    .signatures { display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; }
    .sig-box { width: 45%; border-top: 1px dashed #666; padding-top: 6px; text-align: center; font-size: 9pt; }
  </style>
</head>
<body>
  <div class="bulletin-container">
    <div class="header">
      <h1>École Rafiki — Bulletin de paie individuel</h1>
      <h2>République Démocratique du Congo — Document officiel de paie mensuelle</h2>
    </div>

    <div class="section-title">1. IDENTIFICATION DE L'AGENT & PÉRIODE</div>
    <table class="table-info">
      <tr>
        <td class="label">Matricule / N° :</td>
        <td class="val">${ligne.numero ?? '—'}</td>
        <td class="label">Mois / Période :</td>
        <td class="val"><strong>${periodeTexte}</strong></td>
      </tr>
      <tr>
        <td class="label">Nom complet :</td>
        <td class="val"><strong>${nomComplet}</strong></td>
        <td class="label">Jours ouvrables :</td>
        <td class="val">${ligne.jours_ouvrables} jours</td>
      </tr>
      <tr>
        <td class="label">Fonction :</td>
        <td class="val">${ligne.fonction || '—'}</td>
        <td class="label">Jours prestés :</td>
        <td class="val">${ligne.jours_prestes} jours</td>
      </tr>
      <tr>
        <td class="label">Téléphone :</td>
        <td class="val">${tel}</td>
        <td class="label">Mode de paiement :</td>
        <td class="val">Virement Bancaire</td>
      </tr>
    </table>

    <div class="section-title">2. DÉTAIL DES GAINS ET RETENUES</div>
    <table class="table-detail">
      <thead>
        <tr>
          <th>RUBRIQUE / LIBELLÉ</th>
          <th style="width: 25%;">BASE / JOURS</th>
          <th style="width: 20%;">GAINS (+)</th>
          <th style="width: 20%;">RETENUES (-)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Salaire de base contractuel</td>
          <td style="text-align: center;">${ligne.jours_ouvrables} j. ouvrables</td>
          <td class="num">${sal} $</td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Heures Supplémentaires (HS) & Primes</td>
          <td style="text-align: center;">—</td>
          <td class="num">${hs} $</td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Retraits / Avances sur salaire perçues</td>
          <td style="text-align: center;">—</td>
          <td class="num">—</td>
          <td class="num">${ret} $</td>
        </tr>
        <tr class="subtotal">
          <td colspan="2">SOUS-TOTAL : SALAIRE À PAYER</td>
          <td class="num" style="border-top: 2px solid #333;"><strong>${salAPayer} $</strong></td>
          <td class="num">—</td>
        </tr>
        <tr>
          <td>Retenue pour Maladie (1/3 taux journalier)</td>
          <td style="text-align: center;">${ligne.jours_maladie} jour(s)</td>
          <td class="num">—</td>
          <td class="num">${retMaladie} $</td>
        </tr>
        <tr>
          <td>Retenue Congés de circonstance / Maternité / Deuil (1/3)</td>
          <td style="text-align: center;">${ligne.jours_conge} jour(s)</td>
          <td class="num">—</td>
          <td class="num">${retConge} $</td>
        </tr>
        <tr>
          <td>Retenue Absences non justifiées / Retards / Mise à pied</td>
          <td style="text-align: center;">${ligne.jours_absence} jour(s)</td>
          <td class="num">—</td>
          <td class="num">${retAbsence} $</td>
        </tr>
        <tr class="subtotal">
          <td colspan="3">TOTAL DES RETENUES D'ABSENCES & CONGÉS</td>
          <td class="num"><strong>${totalRetenues} $</strong></td>
        </tr>
        <tr>
          <td colspan="2">SALAIRE NET GLOBAL CALCULÉ (AVANT ARRONDI)</td>
          <td class="num" colspan="2"><strong>${globalNet} $</strong></td>
        </tr>
        <tr class="total-final">
          <td colspan="2">NET À PAYER — VIREMENT BANQUE (ARRONDI À LA DIZAINE)</td>
          <td class="num" colspan="2" style="font-size: 13pt; color: #000;"><strong>${virementNet} $</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="signatures">
      <div class="sig-box">
        Signature de l'Employé<br>(Pour acquit)
      </div>
      <div class="sig-box">
        Cachet et Signature de la Direction<br>École Rafiki
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Export des bulletins de paie individuels ou collectifs en HTML imprimable ou PDF.
   */
  exporterBulletins(options: OptionsExportBulletin): ResultatExportFichier {
    const detail = this.operationService.obtenir(options.operationId);
    const nomMois = NOMS_MOIS_FR[detail.operation.mois] || String(detail.operation.mois);

    let lignes = detail.lignes;
    let nomFichier: string;

    if (options.employeId) {
      const ligneEmploye = detail.lignes.find((l) => l.employe_id === options.employeId);
      if (!ligneEmploye) {
        throw new ErreurMetier(
          'EMPLOYE_NON_TROUVE',
          'L employé spécifié ne fait pas partie de cette opération de paie.'
        );
      }
      lignes = [ligneEmploye];
      const nomNettoye = `${ligneEmploye.nom}_${ligneEmploye.prenom || ''}`.replace(
        /[^a-zA-Z0-9_-]/g,
        ''
      );
      nomFichier = `Bulletin-Paie-${nomNettoye}-${nomMois}-${detail.operation.annee}.${options.format}`;
    } else {
      nomFichier = `Bulletins-Paie-Collectifs-${nomMois}-${detail.operation.annee}.${options.format}`;
    }

    const htmlBulletins = lignes.map((l) => this.genererHtmlBulletin(l, detail)).join('\n');

    const cheminFichier = options.cheminDestination || path.join(process.cwd(), nomFichier);
    const dir = path.dirname(cheminFichier);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(cheminFichier, Buffer.from(htmlBulletins, 'utf-8'));
    const stats = fs.statSync(cheminFichier);

    this.journalService.ajouter({
      action: 'EXPORTER_BULLETINS',
      entite: 'operation_paie',
      entite_id: options.operationId,
      detail: JSON.stringify({
        format: options.format,
        collectif: !options.employeId,
        nombre_bulletins: lignes.length,
        nom_fichier: nomFichier,
      }),
    });

    return {
      succes: true,
      cheminFichier,
      nomFichier,
      tailleOctets: stats.size,
      nombreLignes: lignes.length,
    };
  }
}
