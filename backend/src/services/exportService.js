const exceljs = require("exceljs");
const csv_writer = require("csv-writer");
const pdfkit = require("pdfkit");
const fs = require("fs");
const path = require("path");
const exportsDir = path.join(process.cwd(), 'exports');
if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
}
class ExportService {
    //exporter les transactions en CSV
    static async exporterTransactionsCSV(utilisateurId, transactions) {
        const fileName = `transactions_${utilisateurId}_${Date.now()}.csv`;
        const filePath = path.join(exportsDir, fileName);
        const csvWriter = csv_writer.createObjectCsvWriter({
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
            date: new Date(t.date).toLocaleDateString('fr-FR'),
            description: t.description,
            categorie: t.categorie || 'sans',
            sousCategorie: t.sousCategorie || 'sans',
            montant: t.montant,
            type: t.type === 'depense' ? 'Dépense' : 'Revenu',
            tags: Array.isArray(t.tags) && t.tags.length
                ? t.tags.join(', ')
                : 'sans'
        }));
        await csvWriter.writeRecords(donnees);
        return filePath;
    }
    //exporter les transactions en Excel
    static async exporterTransactionsExcel(_utilisateurId, transactions) {
        const workbook = new exceljs.Workbook();
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
                date: new Date(transaction.date),
                description: transaction.description,
                categorie: transaction.categorie || 'sans',
                sousCategorie: transaction.sousCategorie || 'sans',
                montant: transaction.montant,
                type: transaction.type === 'depense' ? 'Dépense' : 'Revenu',
                tags: Array.isArray(transaction.tags) && transaction.tags.length
                    ? transaction.tags.join(', ')
                    : 'sans'
            });
        });
        worksheet.getColumn('date').numFmt = 'dd/mm/yyyy';
        worksheet.getColumn('montant').numFmt = '#,##0.00';
        worksheet.getColumn('montant').alignment = { horizontal: 'right' };
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
    //exporter un rapport en PDF
    static async exporterRapportPDF(titre, donnees, _utilisateurId) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit({ margin: 50 });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
            doc.on('error', reject);
            const primary = '#533AFD';
            const muted = '#6B7280';
            const dark = '#111827';
            const margin = 50;
            const headerY = margin;
            doc
                .fontSize(18)
                .fillColor(dark)
                .text(titre, margin, headerY);
            doc
                .fontSize(10)
                .fillColor(muted)
                .text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, margin, headerY + 22);
            doc.fillColor(dark);
            const sepY = headerY + 50;
            doc
                .moveTo(margin, sepY)
                .lineTo(doc.page.width - margin, sepY)
                .strokeColor('#E5E7EB')
                .stroke();
            doc.strokeColor(dark);
            doc.y = sepY + 20;
            // Tableau Résumé
            doc.fontSize(13).fillColor(primary).text('Résumé', margin, doc.y);
            doc.fillColor(dark);
            doc.moveDown(0.5);
            const tableTop = doc.y;
            const col1Width = 160;
            const col2Width = 140;
            const rowHeight = 18;
            const col1X = margin;
            const col2X = margin + col1Width;
            // En-têtes du tableau
            doc
                .rect(col1X, tableTop, col1Width, rowHeight)
                .fill('#F3F4F6')
                .rect(col2X, tableTop, col2Width, rowHeight)
                .fill('#F3F4F6');
            doc
                .fillColor(dark)
                .fontSize(10)
                .text('Indicateur', col1X + 6, tableTop + 4)
                .text('Valeur', col2X + 6, tableTop + 4);
            let currentY = tableTop + rowHeight;
            const resume = donnees.resume || {};
            const lignes = [
                ['Revenus', `${(resume.revenus ?? 0).toFixed(2)} MAD`],
                ['Dépenses', `${(resume.depenses ?? 0).toFixed(2)} MAD`],
                ['Épargne', `${(resume.epargne ?? 0).toFixed(2)} MAD`],
                ["Taux d'épargne", `${(resume.tauxEpargne ?? 0).toFixed(2)} %`],
            ];
            lignes.forEach(([label, value]) => {
                doc
                    .rect(col1X, currentY, col1Width + col2Width, rowHeight)
                    .strokeColor('#E5E7EB')
                    .stroke();
                doc
                    .fillColor(dark)
                    .fontSize(10)
                    .text(label, col1X + 6, currentY + 4)
                    .text(value, col2X + 6, currentY + 4);
                currentY += rowHeight;
            });
            doc.y = currentY + 16;
            if (donnees.repartitionDepenses && donnees.repartitionDepenses.length) {
                doc.fontSize(13).fillColor(primary).text('Répartition des dépenses', margin, doc.y);
                doc.fillColor(dark);
                doc.moveDown(0.5);
                const reps = donnees.repartitionDepenses;
                const rows = reps.slice(0, 10);
                const tableTop2 = doc.y;
                const totalWidth2 = doc.page.width - margin * 2;
                const colCatWidth = totalWidth2 * 0.5;
                const colAmountWidth = totalWidth2 * 0.25;
                const colPctWidth = totalWidth2 * 0.25;
                const rowH2 = 18;
                doc
                    .rect(margin, tableTop2, colCatWidth, rowH2)
                    .fill('#F3F4F6')
                    .rect(margin + colCatWidth, tableTop2, colAmountWidth, rowH2)
                    .fill('#F3F4F6')
                    .rect(margin + colCatWidth + colAmountWidth, tableTop2, colPctWidth, rowH2)
                    .fill('#F3F4F6');
                doc
                    .fillColor(dark)
                    .fontSize(10)
                    .text('Catégorie', margin + 6, tableTop2 + 4)
                    .text('Montant', margin + colCatWidth + 6, tableTop2 + 4)
                    .text('Pourcentage', margin + colCatWidth + colAmountWidth + 6, tableTop2 + 4);
                let y2 = tableTop2 + rowH2;
                rows.forEach((item) => {
                    doc
                        .rect(margin, y2, totalWidth2, rowH2)
                        .strokeColor('#E5E7EB')
                        .stroke();
                    doc
                        .fillColor(dark)
                        .fontSize(10)
                        .text(item.categorie, margin + 6, y2 + 4, { width: colCatWidth - 12 })
                        .text(`${item.montant.toFixed(0)} MAD`, margin + colCatWidth + 6, y2 + 4, { width: colAmountWidth - 12 })
                        .text(`${(item.pourcentage ?? 0).toFixed(1)} %`, margin + colCatWidth + colAmountWidth + 6, y2 + 4, { width: colPctWidth - 12 });
                    y2 += rowH2;
                });
                doc.y = y2 + 16;
            }
            // Top dépenses 
            if (donnees.topDepenses && donnees.topDepenses.length) {
                doc.fontSize(13).fillColor(primary).text('Top dépenses', margin, doc.y);
                doc.fillColor(dark);
                doc.moveDown(0.5);
                const topDep = donnees.topDepenses.slice(0, 10);
                const tableTop3 = doc.y;
                const totalWidth3 = doc.page.width - margin * 2;
                const colRankWidth = 30;
                const colAmountWidth = 120;
                const colDescWidth = totalWidth3 - colRankWidth - colAmountWidth;
                const rowH3 = 18;
                doc
                    .rect(margin, tableTop3, colRankWidth, rowH3)
                    .fill('#F3F4F6')
                    .rect(margin + colRankWidth, tableTop3, colDescWidth, rowH3)
                    .fill('#F3F4F6')
                    .rect(margin + colRankWidth + colDescWidth, tableTop3, colAmountWidth, rowH3)
                    .fill('#F3F4F6');
                doc
                    .fillColor(dark)
                    .fontSize(10)
                    .text('#', margin + 6, tableTop3 + 4)
                    .text('Description', margin + colRankWidth + 6, tableTop3 + 4)
                    .text('Montant', margin + colRankWidth + colDescWidth + 6, tableTop3 + 4);
                let y3 = tableTop3 + rowH3;
                topDep.forEach((item, index) => {
                    doc
                        .rect(margin, y3, totalWidth3, rowH3)
                        .strokeColor('#E5E7EB')
                        .stroke();
                    doc
                        .fillColor(dark)
                        .fontSize(10)
                        .text(String(index + 1), margin + 6, y3 + 4, { width: colRankWidth - 12 })
                        .text(item.description, margin + colRankWidth + 6, y3 + 4, { width: colDescWidth - 12 })
                        .text(`${item.montant.toFixed(2)} MAD`, margin + colRankWidth + colDescWidth + 6, y3 + 4, { width: colAmountWidth - 12 });
                    y3 += rowH3;
                });
                doc.y = y3 + 16;
            }
            doc.end();
        });
    }
}
exports.ExportService = ExportService;
