import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel, Media } from 'docx';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export async function generateExcelFile(risks: any[], companyName: string): Promise<Buffer> {
  // Prepare data for Excel with comprehensive information including hierarchy
  const excelData = risks.map((risk: any, index: number) => {
    // Parse hierarchy from danger field if present
    const hierarchyMatch = risk.danger?.match(/^\[([^\]]+)\]\s*(.*)$/);
    const hierarchy = hierarchyMatch ? hierarchyMatch[1] : '';
    const cleanDanger = hierarchyMatch ? hierarchyMatch[2] : risk.danger;
    
    return {
      'Site/Zone/Unité': hierarchy || risk.siteName || risk.source || 'Non spécifié',
      'Famille de risque': risk.family || 'Non classifié',
      'Danger': cleanDanger || 'Non spécifié',
      'Situation dangereuse': risk.type || 'Non spécifié',
      'Risque': risk.riskEvent || '',
      'Gravité': risk.gravity || 'Non spécifié',
      'Valeur G': risk.gravityValue || '',
      'Fréquence': risk.frequency || 'Non spécifié',
      'Valeur F': risk.frequencyValue || '',
      'Maîtrise': risk.control || 'Non spécifié',
      'Valeur M': risk.controlValue || '',
      'Score': risk.riskScore?.toFixed(2) || '0',
      'Priorité': risk.priority || 'Non définie',
      'Mesures de prévention': risk.measures || 'À définir'
    };
  });

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths for better readability
  const columnWidths = [
    { wch: 30 }, // Site/Zone/Unité
    { wch: 18 }, // Famille de risque
    { wch: 32 }, // Danger
    { wch: 28 }, // Situation dangereuse
    { wch: 28 }, // Risque (événement)
    { wch: 12 }, // Gravité
    { wch: 6 },  // Valeur G
    { wch: 12 }, // Fréquence
    { wch: 6 },  // Valeur F
    { wch: 12 }, // Maîtrise
    { wch: 6 },  // Valeur M
    { wch: 8 },  // Score
    { wch: 20 }, // Priorité
    { wch: 50 }  // Mesures de prévention
  ];
  worksheet['!cols'] = columnWidths;

  // Add title and company info
  const titleData = [
    [`DOCUMENT UNIQUE D'ÉVALUATION DES RISQUES PROFESSIONNELS`],
    [`Entreprise: ${companyName}`],
    [`Date d'export: ${new Date().toLocaleDateString('fr-FR')}`],
    [''], // Empty row
    ['TABLEAU DES RISQUES IDENTIFIÉS']
  ];
  
  // Create title sheet
  const titleSheet = XLSX.utils.aoa_to_sheet(titleData);
  XLSX.utils.book_append_sheet(workbook, titleSheet, 'Page de garde');
  
  // Add main data sheet
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Analyse des risques');
  
  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return excelBuffer;
}

const RISKS_EXPORT_HEADERS = [
  'Lieu / Unité de travail',
  'Famille de risque',
  'Danger',
  'Situation dangereuse',
  'Risque',
  'Gravité',
  'Fréquence/Probabilité',
  'Maîtrise',
  'Score',
  'Mesures existantes',
  'Mesures à mettre en place',
  'Responsable',
  'Échéance',
  'Statut',
  'Commentaires'
] as const;

export async function generateRisksExportExcel(
  risks: Array<Record<string, string | number>>,
  documentId: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Risques', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  // Headers row (bold, grey fill)
  const headerRow = sheet.addRow([...RISKS_EXPORT_HEADERS]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });

  // Data rows
  for (const r of risks) {
    const row = RISKS_EXPORT_HEADERS.map((h) => {
      const v = r[h];
      if (h === 'Échéance' && typeof v === 'string' && v) {
        const d = new Date(v);
        return isNaN(d.getTime()) ? v : d;
      }
      return v ?? '';
    });
    sheet.addRow(row);
  }

  // Auto-filter on header row
  const lastCol = String.fromCharCode(64 + RISKS_EXPORT_HEADERS.length);
  sheet.autoFilter = { from: 'A1', to: `${lastCol}1` };

  // Column widths (reasonable)
  const widths = [25, 18, 32, 30, 28, 12, 18, 15, 8, 35, 40, 15, 12, 12, 25];
  sheet.columns = RISKS_EXPORT_HEADERS.map((_, i) => ({
    width: Math.min(50, Math.max(widths[i] || 12, 10))
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Génère un classeur Excel avec 2 feuilles : Tableau des risques + Plan d'action */
export async function generateRisksAndPlanActionExportExcel(
  risksRows: Array<Record<string, string | number>>,
  planActionRows: Array<Record<string, string | number>>,
  documentId: number
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const lastCol = String.fromCharCode(64 + RISKS_EXPORT_HEADERS.length);
  const widths = [25, 18, 32, 30, 28, 12, 18, 15, 8, 35, 40, 15, 12, 12, 25];

  const addSheet = (name: string, rows: Array<Record<string, string | number>>) => {
    const sheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });
    const headerRow = sheet.addRow([...RISKS_EXPORT_HEADERS]);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });
    for (const r of rows) {
      const row = RISKS_EXPORT_HEADERS.map((h) => {
        const v = r[h];
        if (h === 'Échéance' && typeof v === 'string' && v) {
          const d = new Date(v);
          return isNaN(d.getTime()) ? v : d;
        }
        return v ?? '';
      });
      sheet.addRow(row);
    }
    sheet.autoFilter = { from: 'A1', to: `${lastCol}1` };
    sheet.columns = RISKS_EXPORT_HEADERS.map((_, i) => ({
      width: Math.min(50, Math.max(widths[i] || 12, 10))
    }));
  };

  addSheet('Tableau des risques', risksRows);
  addSheet('Plan d\'action', planActionRows);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateFullDuerpWorkbookExcel(
  risksRows: Array<Record<string, string | number>>,
  planActionRows: Array<Record<string, string | number>>,
  meta: {
    companyName: string;
    companyActivity?: string;
    companyDescription?: string;
    documentTitle?: string;
    generatedAt?: Date;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const generatedAt = meta.generatedAt || new Date();
  const dateFr = generatedAt.toLocaleDateString("fr-FR");

  const addSectionTitle = (sheet: ExcelJS.Worksheet, row: number, title: string) => {
    sheet.mergeCells(row, 1, row, 10);
    const cell = sheet.getCell(row, 1);
    cell.value = title;
    cell.font = { bold: true, size: 14 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
    cell.alignment = { horizontal: "left", vertical: "middle" };
  };

  // 1) Page de garde
  const cover = workbook.addWorksheet("Page de garde");
  cover.columns = [{ width: 4 }, { width: 32 }, { width: 90 }];
  cover.mergeCells("B4:C4");
  cover.getCell("B4").value = "Document unique d'évaluation des risques professionnels";
  cover.getCell("B4").font = { bold: true, size: 16 };
  cover.getCell("B4").alignment = { horizontal: "center" };
  cover.getCell("B7").value = "Société :";
  cover.getCell("C7").value = meta.companyName || "Non renseignée";
  cover.getCell("B8").value = "Descriptif de l'activité :";
  cover.getCell("C8").value = meta.companyActivity || "Non renseigné";
  cover.getCell("B9").value = "Titre DUERP :";
  cover.getCell("C9").value = meta.documentTitle || `${meta.companyName || "Entreprise"} - DUERP`;
  cover.getCell("B10").value = "Date de génération :";
  cover.getCell("C10").value = dateFr;
  cover.getCell("B12").value = "Présentation :";
  cover.getCell("C12").value = meta.companyDescription || "Aucune description fournie.";
  cover.getCell("C12").alignment = { wrapText: true, vertical: "top" };
  for (const row of [7, 8, 9, 10, 12]) cover.getCell(`B${row}`).font = { bold: true };

  // 2) Suivi
  const suivi = workbook.addWorksheet("Suivi");
  suivi.columns = [{ width: 22 }, { width: 22 }, { width: 30 }, { width: 45 }, { width: 22 }];
  addSectionTitle(suivi, 1, "Mise à jour du DUERP");
  const suiviHeaders = ["Effectué le", "Par", "Modification DUERP (Oui/Non)", "Commentaire", "Signature"];
  const suiviHeaderRow = suivi.addRow(suiviHeaders);
  suiviHeaderRow.font = { bold: true };
  suiviHeaderRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E2E2" } };
    cell.alignment = { horizontal: "center" };
  });
  for (let i = 0; i < 8; i++) suivi.addRow(["", "", "", "", ""]);

  // 3) Présentation (proche du modèle CSAPA)
  const presentation = workbook.addWorksheet("Présentation");
  presentation.columns = [{ width: 6 }, { width: 42 }, { width: 90 }];
  addSectionTitle(presentation, 1, "Présentation de la société");
  presentation.getCell("B3").value = "Société :";
  presentation.getCell("C3").value = meta.companyName || "Non renseignée";
  presentation.getCell("B4").value = "Activité :";
  presentation.getCell("C4").value = meta.companyActivity || "Non renseignée";
  presentation.getCell("B6").value = "Présentation :";
  presentation.getCell("C6").value =
    meta.companyDescription ||
    `${meta.companyName || "L'entreprise"} exerce dans le secteur ${meta.companyActivity || "non précisé"}.`;
  presentation.getCell("C6").alignment = { wrapText: true, vertical: "top" };
  presentation.getRow(6).height = 130;
  ["B3", "B4", "B6"].forEach((c) => {
    presentation.getCell(c).font = { bold: true };
  });

  // 4) Cadre légal (résumé opérationnel)
  const legal = workbook.addWorksheet("Code Du travail");
  legal.columns = [{ width: 4 }, { width: 140 }];
  addSectionTitle(legal, 1, "Mentions légales DUERP");
  const legalText = [
    "Le Document Unique d'Évaluation des Risques Professionnels (DUERP) est une obligation légale pour toute entreprise.",
    "Article L4121-1 : l'employeur prend les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs.",
    "Article L4121-2 : ces mesures comprennent des actions de prévention, d'information, de formation et une organisation adaptée.",
    "Article R4121-1 : l'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques.",
    "Article R4121-2 : la mise à jour est réalisée au moins annuellement, et lors de tout changement important des conditions de travail.",
    "Ce document constitue une base de pilotage de la prévention et du plan d'action."
  ].join("\n\n");
  legal.getCell("B3").value = legalText;
  legal.getCell("B3").alignment = { wrapText: true, vertical: "top" };
  legal.getRow(3).height = 240;

  // 5) Méthode (hiérarchisation)
  const method = workbook.addWorksheet("Hiérarchisation");
  method.columns = [{ width: 22 }, { width: 10 }, { width: 28 }, { width: 10 }, { width: 22 }, { width: 10 }, { width: 45 }];
  addSectionTitle(method, 1, "Critères d'évaluation des risques");
  method.addRow(["Gravité", "Indice", "Fréquence d'exposition", "Indice", "Maîtrise", "Indice", "Repères"]);
  [
    ["Faible", 1, "Annuelle", 1, "Très élevée", 0.05, "Incident mineur / prévention très maîtrisée"],
    ["Moyenne", 4, "Mensuelle", 4, "Élevée", 0.2, "Accident avec arrêt court"],
    ["Grave", 20, "Hebdomadaire", 10, "Moyenne", 0.5, "Accident avec séquelles possibles"],
    ["Très grave", 100, "Journalière", 50, "Absente", 1, "Accident grave / invalidité / décès"],
  ].forEach((r) => method.addRow(r));
  method.addRow([]);
  addSectionTitle(method, 8, "Calcul de priorité (Score = Gravité × Fréquence × Maîtrise)");
  method.addRow(["Cotation du risque", "Classement", "Interprétation"]);
  [
    ["< 10", "Priorité 4", "Situation limitée ou maîtrisée."],
    ["10 ≤ note < 100", "Priorité 3", "Mesures complémentaires recommandées."],
    ["100 ≤ note < 500", "Priorité 2", "Situation insuffisamment maîtrisée."],
    ["500 ≤ note ≤ 5000", "Priorité 1", "Mesures correctives à engager sans délai."],
  ].forEach((r) => method.addRow(r));
  method.eachRow((row, rowNumber) => {
    if (rowNumber === 2 || rowNumber === 9) {
      row.font = { bold: true };
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E2E2" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      });
    }
  });

  const DUERP_HEADERS = [...RISKS_EXPORT_HEADERS];

  const makeTableSheet = (name: string, rows: Array<Record<string, string | number>>) => {
    const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    const headerRow = sheet.addRow(DUERP_HEADERS);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    for (const r of rows) {
      const out = DUERP_HEADERS.map((h) => {
        const v = r[h];
        if (h === "Échéance" && typeof v === "string" && v) {
          const d = new Date(v);
          return Number.isNaN(d.getTime()) ? v : d;
        }
        return v ?? "";
      });
      const row = sheet.addRow(out);
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFEDEDED" } },
          left: { style: "thin", color: { argb: "FFEDEDED" } },
          bottom: { style: "thin", color: { argb: "FFEDEDED" } },
          right: { style: "thin", color: { argb: "FFEDEDED" } },
        };
      });
    }
    const lastCol = String.fromCharCode(64 + DUERP_HEADERS.length);
    sheet.autoFilter = { from: "A1", to: `${lastCol}1` };
    const widths = [25, 18, 32, 30, 28, 12, 18, 15, 8, 35, 40, 15, 12, 12, 25];
    sheet.columns = DUERP_HEADERS.map((_, i) => ({ width: Math.min(60, Math.max(widths[i] || 12, 10)) }));
  };

  // 6) DUERP + 7) Plan action
  makeTableSheet("DUERP", risksRows);
  makeTableSheet("Plan action", planActionRows);

  // 8) Données tableau (brut) pour rapprocher la logique classeur du modèle de référence
  const raw = workbook.addWorksheet("Données tableau");
  const rawHeaders = [...DUERP_HEADERS, "Type de feuille"];
  raw.addRow(rawHeaders).font = { bold: true };
  raw.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
  });
  for (const row of risksRows) {
    raw.addRow([...DUERP_HEADERS.map((h) => row[h] ?? ""), "DUERP"]);
  }
  for (const row of planActionRows) {
    raw.addRow([...DUERP_HEADERS.map((h) => row[h] ?? ""), "Plan action"]);
  }
  raw.columns = rawHeaders.map((_, i) => ({
    width: i < DUERP_HEADERS.length ? Math.min(40, Math.max(12, i === 0 ? 24 : 16)) : 14,
  }));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generatePDFFile(risks: any[], companyName: string, companyActivity: string, companyData?: any, locations?: any[], workStations?: any[], preventionMeasures?: any[], chartImages?: any): Promise<Buffer> {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Apply autoTable to the document
  autoTable(doc, {});
  
  // Couleurs définies
  const primaryColor = [41, 128, 185]; // Bleu professionnel
  const accentColor = [52, 152, 219]; // Bleu clair
  const grayColor = [149, 165, 166]; // Gris
  const darkGray = [52, 73, 94]; // Gris foncé
  const lightGray = [236, 240, 241]; // Gris très clair
  const greenColor = [39, 174, 96]; // Vert
  const redColor = [231, 76, 60]; // Rouge
  const orangeColor = [243, 156, 18]; // Orange
  
  // ==== PAGE DE GARDE SIMPLE ====
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 40;
  
  // Titre principal
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT UNIQUE', pageWidth / 2, yPos, { align: 'center' });
  
  // Sous-titre
  doc.setFontSize(16);
  yPos += 20;
  doc.text('D\'ÉVALUATION DES RISQUES PROFESSIONNELS', pageWidth / 2, yPos, { align: 'center' });
  
  // Informations de l'entreprise
  doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPos += 30;
  doc.text(`Entreprise : ${companyName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;
  doc.text(`Secteur : ${companyActivity}`, pageWidth / 2, yPos, { align: 'center' });
  
  // Date
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  yPos += 20;
  const today = new Date().toLocaleDateString('fr-FR');
  doc.text(`Réalisé le : ${today}`, pageWidth / 2, yPos, { align: 'center' });
  
  // ==== TABLEAU DES RISQUES PRINCIPAL ====
  doc.addPage();
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLEAU DES RISQUES IDENTIFIÉS', pageWidth / 2, 30, { align: 'center' });
  
  // Tableau des risques - Source en première colonne avec largeurs optimisées
  const tableData = risks.map(risk => [
    risk.source || 'Non spécifié',
    risk.family || 'Non spécifié',
    risk.danger || 'Non spécifié',
    risk.type || 'Non spécifié',
    risk.riskEvent || '',
    risk.gravity || 'Non spécifié',
    risk.frequency || 'Non spécifié',
    risk.control || 'Non spécifié',
    risk.riskScore ? risk.riskScore.toFixed(2) : '0',
    risk.priority || 'Non défini',
    risk.measures || 'À définir'
  ]);
  
  autoTable(doc, {
    head: [['Source', 'Famille', 'Danger', 'Situation dangereuse', 'Risque', 'Gravité', 'Fréquence', 'Maîtrise', 'Score', 'Priorité', 'Mesures']],
    body: tableData,
    startY: 50,
    styles: { 
      fontSize: 5,
      cellPadding: 1,
      textColor: [52, 73, 94],
      lineColor: [200, 200, 200],
      lineWidth: 0.3,
      overflow: 'linebreak'
    },
    headStyles: { 
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 5
    },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 'auto', halign: 'left' },
      5: { cellWidth: 'auto', halign: 'center' },
      6: { cellWidth: 'auto', halign: 'center' },
      7: { cellWidth: 'auto', halign: 'center' },
      8: { cellWidth: 'auto', halign: 'center' },
      9: { cellWidth: 'auto', halign: 'center' },
      10: { cellWidth: 'auto', halign: 'left' }
    },
    margin: { top: 30, left: 8, right: 8, bottom: 30 },
    pageBreak: 'auto',
    showHead: 'everyPage'
  });
  
  // ==== GRAPHIQUES ====
  if (chartImages && Object.keys(chartImages).length > 0) {
    const chartNames = Object.keys(chartImages);
    
    chartNames.forEach((chartName, index) => {
      const imageData = chartImages[chartName];
      if (imageData && typeof imageData === 'string') {
        try {
          // Nouvelle page pour chaque graphique
          doc.addPage();
          
          // Titre de la page
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.text('GRAPHIQUES D\'ANALYSE', pageWidth / 2, 25, { align: 'center' });
          
          // Graphique centré et optimisé pour la page
          const chartWidth = 200;  // Largeur maximale pour format paysage
          const chartHeight = 130; // Hauteur proportionnelle
          const xPosition = (pageWidth - chartWidth) / 2;
          const yPosition = 50;
          
          doc.addImage(imageData, 'PNG', xPosition, yPosition, chartWidth, chartHeight);
          
        } catch (error) {
          console.error('Error adding chart image:', error);
        }
      }
    });
  }
  
  return Buffer.from(doc.output('arraybuffer'));
}

export async function generateWordFile(risks: any[], companyName: string, companyActivity: string, companyData?: any, locations?: any[], workStations?: any[], preventionMeasures?: any[]): Promise<Buffer> {
  
  // === PAGE DE COUVERTURE ===
  const coverPageElements = [
    // Espacement initial
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    
    // Titre principal
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "DOCUMENT UNIQUE",
          font: "Arial",
          size: 48,
          bold: true
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "D'ÉVALUATION DES RISQUES PROFESSIONNELS",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    
    // Sous-titre réglementaire
    new Paragraph({ text: "" }),
    new Paragraph({ text: "" }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "(En application du décret n° 2001-1016 du 5 novembre 2001)",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [
        new TextRun({
          text: "(Articles R4121-1 à R4121-4 et L4121-3 et L4121-3-1 du Code du Travail)",
          font: "Arial",
          size: 24
        })
      ]
    })
  ];

  // === TABLE DES MATIÈRES ===
  const tableOfContentsElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Table des matières",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "A.\tTableau de mise à jour\t3",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "B.\tPrésentation de la société\t4",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "C.\tLe code du travail\t5",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "D.\tMéthodes d'évaluation du risque\t7",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t1/ Identifier l'unité de travail\t7",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t2/ Identifier les dangers et les situations dangereuses\t7",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t3/ Estimer la gravité de chaque situation dangereuse\t7",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t4/ Estimer la fréquence d'exposition à la situation dangereuse\t7",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t5/ Estimer la maîtrise de la situation dangereuse\t8",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "\t6/ Calcul du risque et des priorités d'actions\t8",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "\t7/ Tableau de hiérarchisation\t9",
          font: "Arial",
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "E.\tDUERP\t11",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "F.\tPlan d'action\t48",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "G.\tAnalyse\t85",
          font: "Arial",
          size: 24
        })
      ]
    })
  ];

  // === TABLEAU DE MISE À JOUR ===
  const updateTableElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Tableau de mise à jour",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Mise à jour du DUERP", bold: true, size: 24 })]
              })],
              columnSpan: 5
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Visite de réévaluation", bold: true, size: 24 })]
              })],
              columnSpan: 2
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Modification du DUERP (Oui/Non)", bold: true, size: 24 })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Commentaire", bold: true, size: 24 })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Signature", bold: true, size: 24 })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Effectué le :", size: 24 })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Par :", size: 24 })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ text: "" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: "" })]
            }),
            new TableCell({
              children: [new Paragraph({ text: "" })]
            })
          ]
        }),
        // Plusieurs lignes vides pour les futures mises à jour
        ...Array.from({ length: 6 }, () => new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "" })] }),
            new TableCell({ children: [new Paragraph({ text: "" })] }),
            new TableCell({ children: [new Paragraph({ text: "" })] }),
            new TableCell({ children: [new Paragraph({ text: "" })] }),
            new TableCell({ children: [new Paragraph({ text: "" })] })
          ]
        }))
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  ];

  // === PRÉSENTATION DE LA SOCIÉTÉ ===
  const companyDescription = companyData?.description || `${companyName} est une entreprise spécialisée dans le secteur ${companyActivity}.`;
  
  const companyPresentationElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Présentation de la société",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Présentation de la société :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: companyDescription,
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Mission et accompagnement :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `${companyName} assure une prise en charge globale dans son secteur d'activité : ${companyActivity}.`,
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "L'objectif est de garantir la sécurité et la santé de tous les collaborateurs dans l'exercice de leurs fonctions.",
          font: "Arial",
          size: 24
        })
      ]
    })
  ];

  // === LE CODE DU TRAVAIL ===
  const legalElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Le code du travail",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Introduction :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "Le Document Unique d'Évaluation des Risques Professionnels (DUERP) est une obligation légale pour toutes les entreprises, quel que soit leur effectif, selon le Code du Travail. Il vise à recenser, évaluer et prévenir les risques auxquels sont exposés les salariés. La mise à jour régulière du DUERP est essentielle pour garantir la sécurité et la santé des travailleurs.",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Références légales :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Article L4121-1 :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "\"L'employeur prend les mesures nécessaires pour assurer la sécurité et protéger la santé physique et mentale des travailleurs de l'établissement.\"",
          font: "Arial",
          size: 24
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "Article R4121-1 :",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: "\"L'employeur transcrit et met à jour dans un document unique les résultats de l'évaluation des risques pour la santé et la sécurité des travailleurs [...]. Cette évaluation comporte un inventaire des risques identifiés dans chaque unité de travail de l'entreprise ou de l'établissement.\"",
          font: "Arial",
          size: 24
        })
      ]
    })
  ];

  // === MÉTHODES D'ÉVALUATION ===
  const methodologyElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "Méthodes d'évaluation du risque",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Estimer la gravité de chaque situation dangereuse",
          font: "Arial",
          size: 28,
          bold: true
        })
      ]
    }),
    
    // Tableau des gravités
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Gravité", bold: true, size: 24 })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "Indice", 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Indice", bold: true })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                text: "Définition", 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Définition", bold: true })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Faible", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "1", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Incident sans arrêt de travail - Situation occasionnant un inconfort", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Moyenne", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "4", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Accident avec arrêt de travail mais sans séquelles", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Grave", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "20", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Accident avec arrêt de travail et possibilité de séquelles", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Très Grave", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "100", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Accident pouvant entraîner un décès ou une invalidité permanente", size: 24, font: "Arial" })]
              })]
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),

    new Paragraph({ text: "", spacing: { after: 300 } }),
    
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Estimer la fréquence d'exposition à la situation dangereuse",
          font: "Arial",
          size: 28,
          bold: true
        })
      ]
    }),
    
    // Tableau des fréquences
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Exposition", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Fréquence d'exposition", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Indice", bold: true, size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Annuelle", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Environ 1 fois/an", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "1", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Mensuelle", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Environ 1 fois/mois", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "4", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Hebdomadaire", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Environ 1 fois/semaine", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "10", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Journalière", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Tous les jours", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "50", size: 24, font: "Arial" })]
              })]
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),

    new Paragraph({ text: "", spacing: { after: 300 } }),
    
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Estimer la maîtrise de la situation dangereuse",
          font: "Arial",
          size: 28,
          bold: true
        })
      ]
    }),
    
    // Tableau de maîtrise
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Maîtrise du risque", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Indice", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Définition", bold: true, size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Très élevée", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "0,05", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Mesures très efficaces, aucune autre mesure possible", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Élevée", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "0,2", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Mesures adaptées, des compléments pourraient être apportés", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Moyenne", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "0,5", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Mesures existantes mais insuffisantes", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Absente", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "1", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Pas de mesures ou mesures inefficaces", size: 24, font: "Arial" })]
              })]
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    }),

    new Paragraph({ text: "", spacing: { after: 300 } }),
    
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Calcul du risque et des priorités d'actions",
          font: "Arial",
          size: 28,
          bold: true
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "Dans cette méthode le Risque = Gravité × Fréquence × Maîtrise",
          font: "Arial",
          size: 24,
          bold: true
        })
      ]
    }),
    
    // Tableau de hiérarchisation
    new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Cotation du Risque", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Classement de la priorité", bold: true, size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Interprétation", bold: true, size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "< 10", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Priorité 4 - Faible", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Situation limitée ou maîtrisée. Des mesures supplémentaires peuvent être apportées.", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "10 ≤ Note < 100", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Priorité 3 - Modéré", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Situation limitée. Des mesures de prévention supplémentaires peuvent être apportées.", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "100 ≤ Note < 500", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Priorité 2 - Moyenne", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Situation dangereuse insuffisamment maîtrisée. Des mesures complémentaires devraient être apportées.", size: 24, font: "Arial" })]
              })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "500 ≤ Note ≤ 5000", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Priorité 1 - Forte", size: 24, font: "Arial" })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: "Situation dangereuse. Des mesures correctives et de prévention doivent être apportées sans délai.", size: 24, font: "Arial" })]
              })]
            })
          ]
        })
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    })
  ];

  // === DUERP - TABLEAU DES RISQUES ===
  const duerpElements = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "DUERP",
          font: "Arial",
          size: 32,
          bold: true
        })
      ]
    })
  ];

  // Grouper les risques par source (unité de travail)
  const risksBySource = risks.reduce((acc: any, risk: any) => {
    const source = risk.source || 'Non spécifié';
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(risk);
    return acc;
  }, {});

  // Créer un tableau pour chaque unité de travail
  Object.entries(risksBySource).forEach(([sourceName, sourceRisks]: [string, any]) => {
    duerpElements.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: `Unité de Travail : ${sourceName}`,
            font: "Arial",
            size: 28,
            bold: true
          })
        ]
      })
    );

    const tableRows = [
      // En-tête
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Type de risque", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 18, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Danger", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Gravité", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Fréquence", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Maîtrise", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Priorité", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 12, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Mesures de prévention", bold: true, size: 24, font: "Arial" })]
            })],
            width: { size: 29, type: WidthType.PERCENTAGE }
          })
        ]
      }),
      // Lignes de données
      ...sourceRisks.map((risk: any) => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: risk.type || 'Non spécifié', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: risk.danger || 'Non spécifié', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: risk.gravity || 'Non spécifié', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: risk.frequency || 'Non spécifié', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: risk.control || 'Non spécifié', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: risk.priority || 'Non défini', size: 24, font: "Arial" })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: risk.measures || 'À définir', size: 24, font: "Arial" })]
            })]
          })
        ]
      }))
    ];

    duerpElements.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );
  });

  // === CRÉER LE DOCUMENT FINAL ===
  const doc = new Document({
    sections: [
      // Page de couverture
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: coverPageElements
      },
      // Table des matières
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: tableOfContentsElements
      },
      // Tableau de mise à jour
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: updateTableElements
      },
      // Présentation de la société
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: companyPresentationElements
      },
      // Le code du travail
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: legalElements
      },
      // Méthodes d'évaluation
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: methodologyElements
      },
      // DUERP
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: duerpElements
      }
    ]
  });

  // Générer le buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}