const transactionController = require("../transactionController");
const Transaction = require("../../models/Transaction");
const vectorService = require("../../services/vectorService");
const mongoose = require("mongoose");
jest.mock('../../middleware/gestionErreurs', () => ({
    asyncHandler: (fn) => async (req, res, next) => {
        try {
            await fn(req, res, next);
        }
        catch (error) {
            next(error);
        }
    },
    ErreurApp: class extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}));
jest.mock('../../models/Transaction');
jest.mock('../../services/vectorService');
describe('TransactionController', () => {
    let mockReq;
    let mockRes;
    let next;
    beforeEach(() => {
        mockReq = {
            body: {},
            query: {},
            params: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
        Transaction.Transaction.find = jest.fn();
        Transaction.Transaction.countDocuments = jest.fn();
    });
    describe('creer', () => {
        it('should create transaction successfully', async () => {
            mockReq.utilisateurId = new mongoose.Types.ObjectId().toString();
            mockReq.body = { montant: 100, description: 'test' };
            const mockSave = jest.fn().mockResolvedValue(true);
            Transaction.Transaction.mockImplementation(() => ({
                save: mockSave
            }));
            vectorService.VectorService.upsertTransaction.mockResolvedValue(undefined);
            await transactionController.TransactionController.creer(mockReq, mockRes, next);
            expect(Transaction.Transaction).toHaveBeenCalled();
            expect(mockSave).toHaveBeenCalled();
            expect(vectorService.VectorService.upsertTransaction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });
        it('should fail if no user token', async () => {
            await transactionController.TransactionController.creer(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('requis') }));
        });
    });
    describe('obtenirToutes', () => {
        it('should list transactions with pagination', async () => {
            mockReq.utilisateurId = new mongoose.Types.ObjectId().toString();
            mockReq.query = { page: '1', limite: '10' };
            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };
            Transaction.Transaction.find.mockReturnValue(mockChain);
            Transaction.Transaction.countDocuments.mockResolvedValue(0);
            await transactionController.TransactionController.obtenirToutes(mockReq, mockRes, next);
            expect(Transaction.Transaction.find).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                donnees: expect.objectContaining({
                    pagination: expect.any(Object)
                })
            }));
        });
    });
});
