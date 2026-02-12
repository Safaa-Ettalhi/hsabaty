import ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const exportsDir = path.join(process.cwd(), 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}


export class ExportService {
//exporter les transactions en CSV
  static async exporterTransactionsCSV(
    utilisateurId: string,
    transactions: any[]
  ): Promise<string> {
    const fileName = `transactions_${utilisateurId}_${Date.now()}.csv`;
    const filePath = path.join(exportsDir, fileName);
    
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'date', title: 'Date' },
        { id: 'description', title: 'Description' },
        { id: 'categorie', title: 'Catégorie' },
        { id: 'sousCategorie', title: 'Sous-Catégorie' },
        { id: 'montant', title: 'Montant' },
        { id: 'type', title: 'Type' },
        { id: 'tags', title: 'Tags' }
      ]
    });

    const donnees = transactions.map(t => ({
      date: t.date.toISOString().split('T')[0],
      description: t.description,
      categorie: t.categorie,
      sousCategorie: t.sousCategorie || '',
      montant: t.montant,
      type: t.type,
      tags: t.tags.join(', ')
    }));

    await csvWriter.writeRecords(donnees);
    return filePath;
  }
//exporter les transactions en Excel
  static async exporterTransactionsExcel(
    _utilisateurId: string,
    transactions: any[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transactions');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Sous-Catégorie', key: 'sousCategorie', width: 20 },
      { header: 'Montant', key: 'montant', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Tags', key: 'tags', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    transactions.forEach(transaction => {
      worksheet.addRow({
        date: transaction.date.toISOString().split('T')[0],
        description: transaction.description,
        categorie: transaction.categorie,
        sousCategorie: transaction.sousCategorie || '',
        montant: transaction.montant,
        type: transaction.type,
        tags: transaction.tags.join(', ')
      });
    });

    worksheet.getColumn('montant').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

//exporter un rapport en PDF
  static async exporterRapportPDF(
    titre: string,
    donnees: any,
    _utilisateurId: string
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      doc.fontSize(20).text(titre, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text('Résumé', { underline: true });
      doc.moveDown();

      if (donnees.resume) {
        doc.fontSize(12);
        doc.text(`Revenus: ${donnees.resume.revenus?.toFixed(2) || 0} MAD`);
        doc.text(`Dépenses: ${donnees.resume.depenses?.toFixed(2) || 0} MAD`);
        doc.text(`Épargne: ${donnees.resume.epargne?.toFixed(2) || 0} MAD`);
        doc.text(`Taux d'épargne: ${donnees.resume.tauxEpargne?.toFixed(2) || 0}%`);
        doc.moveDown();
      }

      if (donnees.repartitionDepenses) {
        doc.fontSize(14).text('Répartition des Dépenses', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        donnees.repartitionDepenses.forEach((item: any) => {
          doc.text(`${item.categorie}: ${item.montant.toFixed(2)} MAD (${item.pourcentage.toFixed(2)}%)`);
        });
        doc.moveDown();
      }

      if (donnees.topDepenses) {
        doc.fontSize(14).text('Top Dépenses', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        donnees.topDepenses.forEach((item: any, index: number) => {
          doc.text(`${index + 1}. ${item.description}: ${item.montant.toFixed(2)} MAD`);
        });
      }

      doc.fontSize(10);
      doc.text(
        `Hssabaty - Rapport financier`,
        doc.page.width / 2,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    });
  }
}
