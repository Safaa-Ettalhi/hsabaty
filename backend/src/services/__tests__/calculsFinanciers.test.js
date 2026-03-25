jest.mock("../../models/Transaction", () => ({
  Transaction: {
    find: jest.fn(),
    findOne: jest.fn(),
  },
}));

const calculsFinanciers = require("../calculsFinanciers");
const Transaction = require("../../models/Transaction");
const mongoose = require("mongoose");
describe('ServiceCalculsFinanciers', () => {
    let service;
    const mockUserId = new mongoose.Types.ObjectId().toString();
    beforeEach(() => {
        service = new calculsFinanciers.ServiceCalculsFinanciers();
        jest.clearAllMocks();
    });
    describe('calculerSolde', () => {
        it('should calculate the correct balance', async () => {
            const mockTransactions = [
                { type: 'revenu', montant: 1000 },
                { type: 'depense', montant: 200 },
                { type: 'revenu', montant: 50 },
            ];
            Transaction.Transaction.find.mockResolvedValue(mockTransactions);
            const solde = await service.calculerSolde(mockUserId);
            expect(Transaction.Transaction.find).toHaveBeenCalledWith({
                utilisateurId: expect.any(Object),
            });
            expect(solde).toBe(850);
        });
        it('should return 0 if no transactions found', async () => {
            Transaction.Transaction.find.mockResolvedValue([]);
            const solde = await service.calculerSolde(mockUserId);
            expect(solde).toBe(0);
        });
    });
    describe('calculerRevenus', () => {
        it('should sum only revenues within date range', async () => {
            const mockTransactions = [
                { montant: 500 },
                { montant: 300 },
            ];
            Transaction.Transaction.find.mockResolvedValue(mockTransactions);
            const start = new Date('2023-01-01');
            const end = new Date('2023-01-31');
            const total = await service.calculerRevenus(mockUserId, start, end);
            expect(Transaction.Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
                type: 'revenu',
                date: { $gte: start, $lte: end }
            }));
            expect(total).toBe(800);
        });
    });
});
