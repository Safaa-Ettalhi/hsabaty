import { TransactionController } from '../transactionController';
import { Transaction } from '../../models/Transaction';
import { VectorService } from '../../services/vectorService';
import { Request, Response } from 'express';
import mongoose from 'mongoose';

jest.mock('../../middleware/gestionErreurs', () => ({
    asyncHandler: (fn: any) => async (req: any, res: any, next: any) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    },
    ErreurApp: class extends Error {
        statusCode: number;
        constructor(message: string, statusCode: number) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}));

jest.mock('../../models/Transaction');
jest.mock('../../services/vectorService');

describe('TransactionController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: jest.Mock;

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

        (Transaction as any).find = jest.fn();
        (Transaction as any).countDocuments = jest.fn();
    });

    describe('creer', () => {
        it('should create transaction successfully', async () => {
            (mockReq as any).utilisateurId = new mongoose.Types.ObjectId().toString();
            mockReq.body = { montant: 100, description: 'test' };

            const mockSave = jest.fn().mockResolvedValue(true);
            (Transaction as unknown as jest.Mock).mockImplementation(() => ({
                save: mockSave
            }));
            (VectorService.upsertTransaction as jest.Mock).mockResolvedValue(undefined);

            await TransactionController.creer(mockReq as Request, mockRes as Response, next);

            expect(Transaction).toHaveBeenCalled();
            expect(mockSave).toHaveBeenCalled();
            expect(VectorService.upsertTransaction).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
        });

        it('should fail if no user token', async () => {
            await TransactionController.creer(mockReq as Request, mockRes as Response, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('requis') }));
        });
    });

    describe('obtenirToutes', () => {
        it('should list transactions with pagination', async () => {
            (mockReq as any).utilisateurId = new mongoose.Types.ObjectId().toString();
            mockReq.query = { page: '1', limite: '10' };

            const mockChain = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue([])
            };
            (Transaction.find as jest.Mock).mockReturnValue(mockChain);
            (Transaction.countDocuments as jest.Mock).mockResolvedValue(0);

            await TransactionController.obtenirToutes(mockReq as Request, mockRes as Response, next);

            expect(Transaction.find).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                donnees: expect.objectContaining({
                    pagination: expect.any(Object)
                })
            }));
        });
    });
});
