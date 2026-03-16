import { AuthController } from '../authController';
import { Utilisateur } from '../../models/Utilisateur';
import { JWTService } from '../../services/jwtService';
import { Request, Response } from 'express';

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

jest.mock('../../models/Utilisateur');
jest.mock('../../services/jwtService');

describe('AuthController', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: jest.Mock;

    beforeEach(() => {
        mockReq = {
            body: {},
            session: { cookie: {} } as any
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
        (Utilisateur as any).findOne = jest.fn();
    });

    describe('inscrire', () => {
        it('should register a new user', async () => {
            mockReq.body = { email: 'new@test.com', motDePasse: 'pass', nom: 'Nom', prenom: 'Pre' };
            
            (Utilisateur.findOne as jest.Mock).mockResolvedValue(null);
            
            const mockSave = jest.fn().mockResolvedValue(true);
            (Utilisateur as unknown as jest.Mock).mockImplementation(() => ({
                _id: 'user1',
                email: 'new@test.com',
                nom: 'Nom',
                prenom: 'Pre',
                save: mockSave
            }));
            
            (JWTService.genererToken as jest.Mock).mockReturnValue('token');

            await AuthController.inscrire(mockReq as Request, mockRes as Response, next);

            expect(Utilisateur.findOne).toHaveBeenCalledWith({ email: 'new@test.com' });
            expect(mockSave).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                donnees: expect.objectContaining({ token: 'token' })
            }));
        });

        it('should fail if email exists', async () => {
            mockReq.body = { email: 'exist@test.com' };
            (Utilisateur.findOne as jest.Mock).mockResolvedValue({ _id: 'exists' });

            await AuthController.inscrire(mockReq as Request, mockRes as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('connecter', () => {
        it('should login valid user', async () => {
            mockReq.body = { email: 'valid@test.com', motDePasse: 'pass' };
            
            const mockUser = {
                _id: 'user1',
                email: 'valid@test.com',
                nom: 'User',
                prenom: 'Test',
                comparerMotDePasse: jest.fn().mockResolvedValue(true),
                save: jest.fn(),
                actif: true
            };
            (Utilisateur.findOne as jest.Mock).mockResolvedValue(mockUser);
            (JWTService.genererToken as jest.Mock).mockReturnValue('token');

            await AuthController.connecter(mockReq as Request, mockRes as Response, next);

            expect(mockUser.comparerMotDePasse).toHaveBeenCalledWith('pass');
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                message: 'Connexion réussie'
            }));
        });

        it('should fail if user not found', async () => {
             mockReq.body = { email: 'novalid@test.com', motDePasse: 'pass' };
            (Utilisateur.findOne as jest.Mock).mockResolvedValue(null);
            await AuthController.connecter(mockReq as Request, mockRes as Response, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('incorrect') }));
        });

        it('should fail if password invalid', async () => {
             mockReq.body = { email: 'valid@test.com', motDePasse: 'pass' };
             const mockUser = {
                comparerMotDePasse: jest.fn().mockResolvedValue(false),
                actif: true
            };
            (Utilisateur.findOne as jest.Mock).mockResolvedValue(mockUser);
            await AuthController.connecter(mockReq as Request, mockRes as Response, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('incorrect') }));
        });
    });
});
