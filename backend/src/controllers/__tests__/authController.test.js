const authController = require("../authController");
const Utilisateur = require("../../models/Utilisateur");
const jwtService = require("../../services/jwtService");
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
jest.mock('../../models/Utilisateur');
jest.mock('../../services/jwtService');
describe('AuthController', () => {
    let mockReq;
    let mockRes;
    let next;
    beforeEach(() => {
        mockReq = {
            body: {},
            session: { cookie: {} }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
        Utilisateur.Utilisateur.findOne = jest.fn();
    });
    describe('inscrire', () => {
        it('should register a new user', async () => {
            mockReq.body = { email: 'new@test.com', motDePasse: 'pass', nom: 'Nom', prenom: 'Pre' };
            Utilisateur.Utilisateur.findOne.mockResolvedValue(null);
            const mockSave = jest.fn().mockResolvedValue(true);
            Utilisateur.Utilisateur.mockImplementation(() => ({
                _id: 'user1',
                email: 'new@test.com',
                nom: 'Nom',
                prenom: 'Pre',
                save: mockSave
            }));
            jwtService.JWTService.genererToken.mockReturnValue('token');
            await authController.AuthController.inscrire(mockReq, mockRes, next);
            expect(Utilisateur.Utilisateur.findOne).toHaveBeenCalledWith({ email: 'new@test.com' });
            expect(mockSave).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                donnees: expect.objectContaining({ token: 'token' })
            }));
        });
        it('should fail if email exists', async () => {
            mockReq.body = { email: 'exist@test.com' };
            Utilisateur.Utilisateur.findOne.mockResolvedValue({ _id: 'exists' });
            await authController.AuthController.inscrire(mockReq, mockRes, next);
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
            Utilisateur.Utilisateur.findOne.mockResolvedValue(mockUser);
            jwtService.JWTService.genererToken.mockReturnValue('token');
            await authController.AuthController.connecter(mockReq, mockRes, next);
            expect(mockUser.comparerMotDePasse).toHaveBeenCalledWith('pass');
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                succes: true,
                message: 'Connexion réussie'
            }));
        });
        it('should fail if user not found', async () => {
            mockReq.body = { email: 'novalid@test.com', motDePasse: 'pass' };
            Utilisateur.Utilisateur.findOne.mockResolvedValue(null);
            await authController.AuthController.connecter(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('incorrect') }));
        });
        it('should fail if password invalid', async () => {
            mockReq.body = { email: 'valid@test.com', motDePasse: 'pass' };
            const mockUser = {
                comparerMotDePasse: jest.fn().mockResolvedValue(false),
                actif: true
            };
            Utilisateur.Utilisateur.findOne.mockResolvedValue(mockUser);
            await authController.AuthController.connecter(mockReq, mockRes, next);
            expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('incorrect') }));
        });
    });
});
