import { CronService } from '../cronService';
import { TransactionRecurrente } from '../../models/TransactionRecurrente';
import { Transaction } from '../../models/Transaction';

jest.mock('../../models/TransactionRecurrente');
jest.mock('../../models/Transaction');
jest.mock('../rapportMensuelService');

describe('CronService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('genererTransactionsRecurrentes', () => {
        it('should generate transactions for due recurrent transactions', async () => {
            const mockRecurrent = {
                _id: 'rec1',
                utilisateurId: 'user1',
                montant: 100,
                type: 'depense',
                categorie: 'cat1',
                sousCategorie: 'sub1',
                description: 'desc',
                prochaineDate: new Date('2023-01-01'), 
                actif: true,
                frequence: 'mensuel',
                save: jest.fn().mockResolvedValue(true)
            };

            (TransactionRecurrente.find as jest.Mock).mockResolvedValue([mockRecurrent]);
            (Transaction.findOne as jest.Mock).mockResolvedValue(null);
            
            const saveMock = jest.fn().mockResolvedValue(true);
            (Transaction as unknown as jest.Mock).mockImplementation(() => ({
                save: saveMock
            }));

            await CronService.genererTransactionsRecurrentes();

            expect(TransactionRecurrente.find).toHaveBeenCalled();
            expect(Transaction.findOne).toHaveBeenCalled();
            expect(saveMock).toHaveBeenCalled();
            expect(mockRecurrent.save).toHaveBeenCalled();
        });

        it('should skip if transaction already exists', async () => {
            const mockRecurrent = {
                _id: 'rec1',
                utilisateurId: 'user1',
                prochaineDate: new Date('2023-01-01'),
                save: jest.fn()
            };

            (TransactionRecurrente.find as jest.Mock).mockResolvedValue([mockRecurrent]);
            (Transaction.findOne as jest.Mock).mockResolvedValue({ _id: 'trans1' }); 

            await CronService.genererTransactionsRecurrentes();

            expect(Transaction).not.toHaveBeenCalledWith(expect.anything(), expect.anything()); 
            expect(mockRecurrent.save).not.toHaveBeenCalled();
        });
    });
});
