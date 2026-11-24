import type Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { OperationService } from './operation-service';
import { JournalService } from './journal-service';
import { ErreurMetier } from './erreurs';
import type { LignePaieCalculee, DetailOperationComplet } from '@rafiki/contrat';

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
 * Échappe une valeur pour le format CSV (délimiteur point-virgule).
 */
function echapperCsv(valeur: string | number | null | undefined): string {
  if (valeur === null || valeur === undefined) return '';
  const texte = String(valeur);
  if (texte.includes(';') || texte.includes('"') || texte.includes('\n') || texte.includes('\r')) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

/**
 * Convertit un texte UTF-8 en caractères compatibles WinAnsiEncoding pour PDF Type 1.
 */
function encoderWinAnsiPdf(texte: string): string {
  return texte
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/—/g, '\\227') // em-dash
    .replace(/–/g, '\\226') // en-dash
    .replace(/é/g, '\\351')
    .replace(/è/g, '\\350')
    .replace(/ê/g, '\\352')
    .replace(/ë/g, '\\353')
    .replace(/à/g, '\\340')
    .replace(/â/g, '\\342')
    .replace(/î/g, '\\356')
    .replace(/ï/g, '\\357')
    .replace(/ô/g, '\\364')
    .replace(/û/g, '\\373')
    .replace(/ù/g, '\\371')
    .replace(/ç/g, '\\347')
    .replace(/É/g, '\\311')
    .replace(/È/g, '\\310')
    .replace(/Ê/g, '\\312')
    .replace(/À/g, '\\300')
    .replace(/Ç/g, '\\307')
    .replace(/°/g, '\\260');
}

/**
 * Générateur de documents PDF 1.4 A4 portrait pour le bordereau de virement bancaire.
 * Conforme à la norme PDF 1.4, sans dépendance native ni serveur graphique.
 */
class GenerateurPdfBordereau {
  private largeur = 595.28; // A4 portrait largeur en points
  private hauteur = 841.89; // A4 portrait hauteur en points
  private margeGauche = 36;
  private margeHaut = 40;
  private margeBas = 40;
  private largeurUtile = 523.28; // 595.28 - 72

  // Définition des 7 colonnes exactes (somme = 523.28)
  private colonnes = [
    { cle: 'numero', label: 'N°', largeur: 30, align: 'center' as const },
    { cle: 'nom', label: 'Nom', largeur: 90, align: 'left' as const },
    { cle: 'postnom', label: 'Postnom', largeur: 90, align: 'left' as const },
    { cle: 'prenom', label: 'Prénom', largeur: 85, align: 'left' as const },
    { cle: 'telephone', label: 'Téléphone', largeur: 105, align: 'left' as const },
    { cle: 'code_banque', label: 'Code banque', largeur: 55, align: 'center' as const },
    { cle: 'virement', label: 'Virement', largeur: 68.28, align: 'right' as const },
  ];

  generer(detail: DetailOperationComplet, nomMois: string): Buffer {
    const lignes = detail.lignes;
    const totaux = detail.totaux;
    const annee = detail.operation.annee;

    // Découpage en pages
    // Page 1 : Titre (60pt) + En-tête table (24pt) + Lignes (20pt chacune)
    // Pages suivantes : En-tête table répété (24pt) + Lignes (20pt chacune)
    const hauteurLigne = 20;
    const hauteurEnTeteTable = 24;
    const hauteurTitrePage1 = 65;
    const hauteurLigneTotal = 24;

    const hauteurDispoPage1 =
      this.hauteur - this.margeHaut - this.margeBas - hauteurTitrePage1 - hauteurEnTeteTable;
    const capacitePage1 = Math.floor(hauteurDispoPage1 / hauteurLigne);

    const hauteurDispoPagesSuivantes =
      this.hauteur - this.margeHaut - this.margeBas - hauteurEnTeteTable;
    const capacitePagesSuivantes = Math.floor(hauteurDispoPagesSuivantes / hauteurLigne);

    const pagesLignes: LignePaieCalculee[][] = [];
    let indexLigne = 0;

    // Première page
    // Si la page 1 doit aussi contenir la ligne total, prévoir son espace
    let capaciteEffectiveP1 = capacitePage1;
    if (lignes.length + 1 <= capacitePage1) {
      capaciteEffectiveP1 = capacitePage1;
    } else {
      capaciteEffectiveP1 = capacitePage1 - 1;
    }
    pagesLignes.push(lignes.slice(indexLigne, indexLigne + capaciteEffectiveP1));
    indexLigne += capaciteEffectiveP1;

    // Pages suivantes
    while (indexLigne < lignes.length) {
      let cap = capacitePagesSuivantes;
      const reste = lignes.length - indexLigne;
      if (reste + 1 > cap) {
        cap = cap - 1;
      }
      pagesLignes.push(lignes.slice(indexLigne, indexLigne + cap));
      indexLigne += cap;
    }

    const nbPages = pagesLignes.length;
    const pageStreams: string[] = [];

    for (let p = 0; p < nbPages; p++) {
      let stream = '';
      const estPremierePage = p === 0;
      const estDernierePage = p === nbPages - 1;
      let yCourant = this.hauteur - this.margeHaut;

      // 1. Titre sur la première page
      if (estPremierePage) {
        stream += 'BT\n';
        stream += '/F2 14 Tf\n';
        stream += `${this.margeGauche} ${yCourant - 14} Td\n`;
        stream += `(${encoderWinAnsiPdf('ÉCOLE RAFIKI — BORDEREAU DE VIREMENT')}) Tj\n`;
        stream += 'ET\n';

        stream += 'BT\n';
        stream += '/F1 10 Tf\n';
        stream += `${this.margeGauche} ${yCourant - 30} Td\n`;
        stream += `(${encoderWinAnsiPdf(`Période : ${nomMois} ${annee} | Moyen de paiement : Pepele Mobile (USD)`)}) Tj\n`;
        stream += 'ET\n';

        // Ligne de séparation sous le titre
        stream += `0.5 w 0.2 0.2 0.2 RG\n`;
        stream += `${this.margeGauche} ${yCourant - 42} m ${this.margeGauche + this.largeurUtile} ${yCourant - 42} l S\n`;

        yCourant -= hauteurTitrePage1;
      }

      // 2. En-tête de tableau répété sur chaque page
      const yEnTete = yCourant - hauteurEnTeteTable;
      // Fond gris clair
      stream += `0.92 0.92 0.92 rg\n`;
      stream += `${this.margeGauche} ${yEnTete} ${this.largeurUtile} ${hauteurEnTeteTable} re f\n`;
      // Bordure en-tête
      stream += `0.5 w 0.3 0.3 0.3 RG\n`;
      stream += `${this.margeGauche} ${yEnTete} ${this.largeurUtile} ${hauteurEnTeteTable} re S\n`;

      // Textes colonnes en-tête
      let xCol = this.margeGauche;
      for (const col of this.colonnes) {
        stream += 'BT\n/F2 9 Tf\n0 0 0 rg\n';
        const txt = encoderWinAnsiPdf(col.label);
        if (col.align === 'center') {
          stream += `${xCol + 5} ${yEnTete + 7} Td\n(${txt}) Tj\n`;
        } else if (col.align === 'right') {
          stream += `${xCol + col.largeur - 25} ${yEnTete + 7} Td\n(${txt}) Tj\n`;
        } else {
          stream += `${xCol + 6} ${yEnTete + 7} Td\n(${txt}) Tj\n`;
        }
        stream += 'ET\n';

        // Ligne verticale séparatrice
        stream += `0.3 w 0.7 0.7 0.7 RG\n`;
        stream += `${xCol + col.largeur} ${yEnTete} m ${xCol + col.largeur} ${yEnTete + hauteurEnTeteTable} l S\n`;
        xCol += col.largeur;
      }

      yCourant = yEnTete;

      // 3. Lignes de données de la page
      const lignesDeLaPage = pagesLignes[p];
      for (let i = 0; i < lignesDeLaPage.length; i++) {
        const lig = lignesDeLaPage[i];
        const yLigne = yCourant - hauteurLigne;

        // Alternance fond zebra subtile
        if (i % 2 === 1) {
          stream += `0.97 0.97 0.97 rg\n`;
          stream += `${this.margeGauche} ${yLigne} ${this.largeurUtile} ${hauteurLigne} re f\n`;
        }

        // Bordure inférieure de ligne
        stream += `0.3 w 0.85 0.85 0.85 RG\n`;
        stream += `${this.margeGauche} ${yLigne} m ${this.margeGauche + this.largeurUtile} ${yLigne} l S\n`;

        // Données des cellules
        let xCell = this.margeGauche;
        const valeurs = [
          String(lig.numero),
          lig.nom,
          lig.postnom || '',
          lig.prenom || '',
          lig.telephone?.trim() ? lig.telephone.trim() : '—',
          lig.code_banque?.trim() ? lig.code_banque.trim() : '—',
          (lig.virement ?? '0') + ' USD',
        ];

        for (let c = 0; c < this.colonnes.length; c++) {
          const col = this.colonnes[c];
          const val = encoderWinAnsiPdf(valeurs[c]);
          stream += 'BT\n/F1 8.5 Tf\n0 0 0 rg\n';
          if (col.align === 'center') {
            stream += `${xCell + 6} ${yLigne + 6} Td\n(${val}) Tj\n`;
          } else if (col.align === 'right') {
            stream += `${xCell + 5} ${yLigne + 6} Td\n(${val}) Tj\n`;
          } else {
            stream += `${xCell + 6} ${yLigne + 6} Td\n(${val}) Tj\n`;
          }
          stream += 'ET\n';

          // Séparateur vertical
          stream += `0.3 w 0.88 0.88 0.88 RG\n`;
          stream += `${xCell + col.largeur} ${yLigne} m ${xCell + col.largeur} ${yLigne + hauteurLigne} l S\n`;
          xCell += col.largeur;
        }

        yCourant = yLigne;
      }

      // Bordure extérieure gauche/droite du tableau sur la page
      stream += `0.5 w 0.3 0.3 0.3 RG\n`;
      stream += `${this.margeGauche} ${yCourant} m ${this.margeGauche} ${yEnTete + hauteurEnTeteTable} l S\n`;
      stream += `${this.margeGauche + this.largeurUtile} ${yCourant} m ${this.margeGauche + this.largeurUtile} ${yEnTete + hauteurEnTeteTable} l S\n`;

      // 4. Ligne de total sur la dernière page
      if (estDernierePage) {
        const yTotal = yCourant - hauteurLigneTotal;
        // Fond gris plus marqué
        stream += `0.88 0.88 0.88 rg\n`;
        stream += `${this.margeGauche} ${yTotal} ${this.largeurUtile} ${hauteurLigneTotal} re f\n`;
        stream += `0.7 w 0.2 0.2 0.2 RG\n`;
        stream += `${this.margeGauche} ${yTotal} ${this.largeurUtile} ${hauteurLigneTotal} re S\n`;

        // Libellé Total à provisionner
        const largeur6Cols = this.colonnes.slice(0, 6).reduce((sum, col) => sum + col.largeur, 0);
        stream += 'BT\n/F2 9.5 Tf\n0 0 0 rg\n';
        stream += `${this.margeGauche + 10} ${yTotal + 7} Td\n`;
        stream += `(${encoderWinAnsiPdf('Total à provisionner')}) Tj\n`;
        stream += 'ET\n';

        // Valeur Total virement
        stream += 'BT\n/F2 9.5 Tf\n0 0 0 rg\n';
        stream += `${this.margeGauche + largeur6Cols + 5} ${yTotal + 7} Td\n`;
        stream += `(${encoderWinAnsiPdf(totaux.total_virement + ' USD')}) Tj\n`;
        stream += 'ET\n';

        yCourant = yTotal;
      }

      // 5. Pied de page
      stream += 'BT\n/F1 8 Tf\n0.4 0.4 0.4 rg\n';
      stream += `${this.margeGauche} ${this.margeBas - 15} Td\n`;
      stream += `(${encoderWinAnsiPdf(`École Rafiki — Page ${p + 1} / ${nbPages}`)}) Tj\n`;
      stream += 'ET\n';

      pageStreams.push(stream);
    }

    // Construction du document binaire PDF 1.4
    return this.assemblerPdf(pageStreams);
  }

  private assemblerPdf(streams: string[]): Buffer {
    const nbPages = streams.length;
    const objets: string[] = [];

    // Objet 1 : Catalog
    objets[1] = '<< /Type /Catalog /Pages 2 0 R >>';

    // Objet 2 : Pages collection
    const kids = [];
    for (let p = 0; p < nbPages; p++) {
      const pageObjNum = 5 + p * 2;
      kids.push(`${pageObjNum} 0 R`);
    }
    objets[2] = `<< /Type /Pages /Kids [ ${kids.join(' ')} ] /Count ${nbPages} >>`;

    // Objet 3 : Font F1 (Helvetica)
    objets[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

    // Objet 4 : Font F2 (Helvetica-Bold)
    objets[4] =
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    // Pour chaque page : Page object et Content stream object
    for (let p = 0; p < nbPages; p++) {
      const pageObjNum = 5 + p * 2;
      const contentObjNum = 6 + p * 2;
      const streamData = streams[p];
      const streamLen = Buffer.byteLength(streamData, 'latin1');

      objets[pageObjNum] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${this.largeur} ${this.hauteur} ] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`;
      objets[contentObjNum] = `<< /Length ${streamLen} >>\nstream\n${streamData}\nendstream`;
    }

    // Assemblage final avec table xref et trailer
    let sortie = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [0];

    for (let i = 1; i < objets.length; i++) {
      offsets[i] = Buffer.byteLength(sortie, 'latin1');
      sortie += `${i} 0 obj\n${objets[i]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(sortie, 'latin1');
    sortie += `xref\n0 ${objets.length}\n`;
    sortie += '0000000000 65535 f \n';
    for (let i = 1; i < objets.length; i++) {
      const offStr = String(offsets[i]).padStart(10, '0');
      sortie += `${offStr} 00000 n \n`;
    }

    sortie += `trailer\n<< /Size ${objets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(sortie, 'latin1');
  }
}

/**
 * Service de gestion et d'exportation du bordereau de virement bancaire Pepele Mobile.
 */
export class BordereauService {
  private generateurPdf = new GenerateurPdfBordereau();

  constructor(
    private db: Database.Database,
    private operationService: OperationService,
    private journalService: JournalService
  ) {}

  /**
   * Génère le nom de fichier standard du bordereau : Bordereau-virement-<Mois>-<Année>.<extension>
   */
  private obtenirNomFichier(
    mois: number,
    annee: number,
    extension: 'pdf' | 'csv' | 'xlsx'
  ): string {
    const nomMois = NOMS_MOIS_FR[mois] || String(mois).padStart(2, '0');
    return `Bordereau-virement-${nomMois}-${annee}.${extension}`;
  }

  /**
   * Génère le classeur Excel (.xlsx) du bordereau avec les 7 colonnes exactes et le total à provisionner.
   */
  genererXlsx(operationId: string): {
    buffer: Buffer;
    nomFichier: string;
    nombreLignes: number;
    totalVirement: string;
  } {
    const detail = this.operationService.obtenir(operationId);
    const nomFichier = this.obtenirNomFichier(
      detail.operation.mois,
      detail.operation.annee,
      'xlsx'
    );

    const headers = ['N°', 'Nom', 'Postnom', 'Prénom', 'Téléphone', 'Code banque', 'Virement'];
    const rows: (string | number)[][] = [headers];

    for (const lig of detail.lignes) {
      const tel = lig.telephone?.trim() ? lig.telephone.trim() : '—';
      const bk = lig.code_banque?.trim() ? lig.code_banque.trim() : '—';
      const virement = Number(lig.virement) || 0;

      rows.push([
        lig.numero ?? '',
        lig.nom ?? '',
        lig.postnom || '',
        lig.prenom || '',
        tel,
        bk,
        virement,
      ]);
    }

    rows.push([
      'Total à provisionner',
      '',
      '',
      '',
      '',
      '',
      Number(detail.totaux.total_virement) || 0,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bordereau de virement');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return {
      buffer,
      nomFichier,
      nombreLignes: detail.lignes.length,
      totalVirement: detail.totaux.total_virement,
    };
  }

  /**
   * Génère le contenu CSV du bordereau (UTF-8 avec BOM et séparateur point-virgule).
   */
  genererCsv(operationId: string): {
    contenu: string;
    nomFichier: string;
    nombreLignes: number;
    totalVirement: string;
  } {
    const detail = this.operationService.obtenir(operationId);
    const nomMois =
      NOMS_MOIS_FR[detail.operation.mois] || String(detail.operation.mois).padStart(2, '0');
    const nomFichier = this.obtenirNomFichier(detail.operation.mois, detail.operation.annee, 'csv');

    // 1. En-tête avec BOM UTF-8 (\uFEFF) pour compatibilité Excel
    let csv = '\uFEFF';
    csv += 'N°;Nom;Postnom;Prénom;Téléphone;Code banque;Virement\r\n';

    // 2. Lignes d'employés ordonnées par N°
    for (const lig of detail.lignes) {
      const tel = lig.telephone?.trim() ? lig.telephone.trim() : '—';
      const bk = lig.code_banque?.trim() ? lig.code_banque.trim() : '—';
      const virement = lig.virement ?? '0';

      csv +=
        [
          echapperCsv(lig.numero),
          echapperCsv(lig.nom),
          echapperCsv(lig.postnom || ''),
          echapperCsv(lig.prenom || ''),
          echapperCsv(tel),
          echapperCsv(bk),
          echapperCsv(virement),
        ].join(';') + '\r\n';
    }

    // 3. Ligne finale : Total à provisionner
    csv += `Total à provisionner;;;;;;${echapperCsv(detail.totaux.total_virement)}\r\n`;

    return {
      contenu: csv,
      nomFichier,
      nombreLignes: detail.lignes.length,
      totalVirement: detail.totaux.total_virement,
    };
  }

  /**
   * Génère le buffer PDF 1.4 A4 portrait du bordereau avec répétition des en-têtes.
   */
  genererPdf(operationId: string): {
    buffer: Buffer;
    nomFichier: string;
    nombreLignes: number;
    totalVirement: string;
  } {
    const detail = this.operationService.obtenir(operationId);
    const nomMois =
      NOMS_MOIS_FR[detail.operation.mois] || String(detail.operation.mois).padStart(2, '0');
    const nomFichier = this.obtenirNomFichier(detail.operation.mois, detail.operation.annee, 'pdf');

    const buffer = this.generateurPdf.generer(detail, nomMois);

    return {
      buffer,
      nomFichier,
      nombreLignes: detail.lignes.length,
      totalVirement: detail.totaux.total_virement,
    };
  }

  /**
   * Exécute l'exportation réelle sur disque et journalise l'action sans coordonnées bancaires ni téléphoniques.
   */
  exporter(
    operationId: string,
    format: 'pdf' | 'csv' | 'xlsx',
    cheminDestination?: string
  ): {
    cheminFichier: string;
    nomFichier: string;
    format: 'pdf' | 'csv' | 'xlsx';
    nombreLignes: number;
    totalVirement: string;
    annule?: boolean;
  } {
    let donnees: Buffer | string;
    let nomFichier: string;
    let nombreLignes: number;
    let totalVirement: string;

    if (format === 'csv') {
      const res = this.genererCsv(operationId);
      donnees = res.contenu;
      nomFichier = res.nomFichier;
      nombreLignes = res.nombreLignes;
      totalVirement = res.totalVirement;
    } else if (format === 'xlsx') {
      const res = this.genererXlsx(operationId);
      donnees = res.buffer;
      nomFichier = res.nomFichier;
      nombreLignes = res.nombreLignes;
      totalVirement = res.totalVirement;
    } else {
      const res = this.genererPdf(operationId);
      donnees = res.buffer;
      nomFichier = res.nomFichier;
      nombreLignes = res.nombreLignes;
      totalVirement = res.totalVirement;
    }

    let cible = cheminDestination;
    if (!cible) {
      try {
        // Tentative d'ouverture de boîte de dialogue Electron si disponible
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const electron = require('electron');
        const dialog = electron.dialog;
        const BrowserWindow = electron.BrowserWindow;
        const fenetre = BrowserWindow?.getFocusedWindow?.();

        const filtres =
          format === 'pdf'
            ? [{ name: 'Document PDF', extensions: ['pdf'] }]
            : format === 'xlsx'
              ? [{ name: 'Classeur Excel', extensions: ['xlsx'] }]
              : [{ name: 'Fichier CSV', extensions: ['csv'] }];

        cible = dialog?.showSaveDialogSync?.(fenetre, {
          title: 'Enregistrer le bordereau de virement',
          defaultPath: nomFichier,
          filters: filtres,
        });

        if (!cible) {
          return {
            cheminFichier: '',
            nomFichier,
            format,
            nombreLignes,
            totalVirement,
            annule: true,
          };
        }
      } catch {
        cible = path.join(process.cwd(), nomFichier);
      }
    }

    // Écriture réelle sur le disque
    const dir = path.dirname(cible);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cible, donnees);

    // Journalisation de l'export
    // RÈGLE IMPÉRATIVE : format, nombre_lignes, total_virement, SANS téléphone ni code banque
    this.journalService.ajouter({
      action: 'EXPORTER_BORDEREAU',
      entite: 'operation_paie',
      entite_id: operationId,
      detail: JSON.stringify({
        format,
        nombre_lignes: nombreLignes,
        total_virement: totalVirement,
      }),
    });

    return {
      cheminFichier: cible,
      nomFichier,
      format,
      nombreLignes,
      totalVirement,
    };
  }
}
