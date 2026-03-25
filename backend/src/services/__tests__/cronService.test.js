jest.mock("../../models/TransactionRecurrente", () => ({
  TransactionRecurrente: {
    find: jest.fn(),
  },
}));

jest.mock("../../models/Transaction", () => {
  const TransactionModel = Object.assign(jest.fn(), {
    findOne: jest.fn(),
  });
  return { Transaction: TransactionModel };
});

jest.mock("../rapportMensuelService", () => ({
  RapportMensuelService: {
    genererRapportsMensuelsPourTous: jest.fn(),
  },
}));

const cronService = require("../cronService");
const TransactionRecurrente = require("../../models/TransactionRecurrente");
const Transaction = require("../../models/Transaction");
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
            TransactionRecurrente.TransactionRecurrente.find.mockResolvedValue([mockRecurrent]);
            Transaction.Transaction.findOne.mockResolvedValue(null);
            const saveMock = jest.fn().mockResolvedValue(true);
            Transaction.Transaction.mockImplementation(() => ({
                save: saveMock
            }));
            await cronService.CronService.genererTransactionsRecurrentes();
            expect(TransactionRecurrente.TransactionRecurrente.find).toHaveBeenCalled();
            expect(Transaction.Transaction.findOne).toHaveBeenCalled();
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
            TransactionRecurrente.TransactionRecurrente.find.mockResolvedValue([mockRecurrent]);
            Transaction.Transaction.findOne.mockResolvedValue({ _id: 'trans1' });
            await cronService.CronService.genererTransactionsRecurrentes();
            expect(Transaction.Transaction).not.toHaveBeenCalledWith(expect.anything(), expect.anything());
            expect(mockRecurrent.save).not.toHaveBeenCalled();
        });
    });
});
