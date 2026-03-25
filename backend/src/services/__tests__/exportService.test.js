jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return {
    ...actual,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
  };
});
jest.mock("exceljs");
jest.mock("csv-writer");
jest.mock("pdfkit");

const exportService = require("../exportService");
const exceljs = require("exceljs");
const csv_writer = require("csv-writer");
const pdfkit = require("pdfkit");
const fs = require("fs");
describe('ExportService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockReturnValue(true);
    });
    describe('exporterTransactionsCSV', () => {
        it('should create a CSV file', async () => {
            const mockWriteRecords = jest.fn().mockResolvedValue(undefined);
            csv_writer.createObjectCsvWriter.mockReturnValue({
                writeRecords: mockWriteRecords
            });
            const transactions = [{
                    date: new Date(),
                    description: 'test',
                    montant: 100,
                    type: 'depense',
                    tags: ['tag1']
                }];
            const result = await exportService.ExportService.exporterTransactionsCSV('user1', transactions);
            expect(csv_writer.createObjectCsvWriter).toHaveBeenCalled();
            expect(mockWriteRecords).toHaveBeenCalled();
            expect(result).toContain('transactions_user1_');
            expect(result).toContain('.csv');
        });
    });
    describe('exporterTransactionsExcel', () => {
        it('should create an Excel buffer', async () => {
            const mockAddRow = jest.fn();
            const mockWorksheet = {
                columns: [],
                getRow: jest.fn().mockReturnValue({ font: {}, fill: {} }),
                getColumn: jest.fn().mockReturnValue({ numFmt: '', alignment: {} }),
                addRow: mockAddRow
            };
            const mockWriteBuffer = jest.fn().mockResolvedValue(Buffer.from('excel'));
            const mockWorkbook = {
                addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
                xlsx: {
                    writeBuffer: mockWriteBuffer
                }
            };
            exceljs.Workbook.mockImplementation(() => mockWorkbook);
            const transactions = [{
                    date: new Date(),
                    description: 'test',
                    montant: 100,
                    type: 'revenu'
                }];
            const buffer = await exportService.ExportService.exporterTransactionsExcel('user1', transactions);
            expect(exceljs.Workbook).toHaveBeenCalled();
            expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Transactions');
            expect(mockAddRow).toHaveBeenCalledTimes(1);
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });
    describe('exporterRapportPDF', () => {
        it('should create a PDF buffer', async () => {
            const mockDoc = {
                on: jest.fn((event, callback) => {
                    if (event === 'end')
                        callback();
                }),
                fontSize: jest.fn().mockReturnThis(),
                fillColor: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnThis(),
                moveTo: jest.fn().mockReturnThis(),
                lineTo: jest.fn().mockReturnThis(),
                strokeColor: jest.fn().mockReturnThis(),
                stroke: jest.fn().mockReturnThis(),
                rect: jest.fn().mockReturnThis(),
                fill: jest.fn().mockReturnThis(),
                moveDown: jest.fn().mockReturnThis(),
                end: jest.fn(),
                page: { width: 500 },
                y: 0
            };
            pdfkit.mockImplementation(() => mockDoc);
            const donnees = {
                resume: { revenus: 100, depenses: 50 },
                repartitionDepenses: [{ categorie: 'Food', montant: 50 }],
                topDepenses: [{ description: 'Burger', montant: 10 }]
            };
            const promise = exportService.ExportService.exporterRapportPDF('Titre', donnees, 'user1');
            const mockOn = jest.fn();
            mockDoc.on = mockOn;
            let endCallback;
            mockOn.mockImplementation((event, cb) => {
                if (event === 'end')
                    endCallback = cb;
                return mockDoc;
            });
            mockDoc.end.mockImplementation(() => {
                if (endCallback)
                    endCallback();
            });
            await promise;
            expect(pdfkit).toHaveBeenCalled();
            expect(mockDoc.text).toHaveBeenCalledWith(expect.stringContaining('Titre'), expect.any(Number), expect.any(Number));
            expect(mockDoc.end).toHaveBeenCalled();
        });
    });
});
