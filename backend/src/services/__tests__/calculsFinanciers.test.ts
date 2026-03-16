import { ServiceCalculsFinanciers } from '../calculsFinanciers';
import { Transaction } from '../../models/Transaction';
import mongoose from 'mongoose';

jest.mock('../../models/Transaction');

describe('ServiceCalculsFinanciers', () => {
    let service: ServiceCalculsFinanciers;
    const mockUserId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        service = new ServiceCalculsFinanciers();
        jest.clearAllMocks();
    });

    describe('calculerSolde', () => {
        it('should calculate the correct balance', async () => {
            const mockTransactions = [
                { type: 'revenu', montant: 1000 },
                { type: 'depense', montant: 200 },
                { type: 'revenu', montant: 50 },
            ];

            (Transaction.find as jest.Mock).mockResolvedValue(mockTransactions);

            const solde = await service.calculerSolde(mockUserId);

            expect(Transaction.find).toHaveBeenCalledWith({
                utilisateurId: expect.any(Object), 
            });
            expect(solde).toBe(850);
        });

        it('should return 0 if no transactions found', async () => {
            (Transaction.find as jest.Mock).mockResolvedValue([]);
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
            (Transaction.find as jest.Mock).mockResolvedValue(mockTransactions);

            const start = new Date('2023-01-01');
            const end = new Date('2023-01-31');

            const total = await service.calculerRevenus(mockUserId, start, end);

            expect(Transaction.find).toHaveBeenCalledWith(expect.objectContaining({
                type: 'revenu',
                date: { $gte: start, $lte: end }
            }));
            expect(total).toBe(800);
        });
    });
});
