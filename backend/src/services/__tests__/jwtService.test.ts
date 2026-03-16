import jwt from 'jsonwebtoken';describe('JWTService', () => {    let JWTService: any;    const mockSecret = 'test-secret';    const mockExpire = '1h';    let originalEnv: NodeJS.ProcessEnv;    beforeEach(() => {        originalEnv = process.env;        jest.resetModules();         /* This is crucial */        process.env = { ...originalEnv };        process.env.JWT_SECRET = mockSecret;
        process.env.JWT_EXPIRE = mockExpire;

        const module = require('../jwtService');
        JWTService = module.JWTService;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('genererToken', () => {
        it('should generate a valid token for a user', () => {
            const userId = 'user123';
            const email = 'test@example.com';
            
            const token = JWTService.genererToken(userId, email);
            const decoded = jwt.verify(token, mockSecret) as any;

            expect(decoded.id).toBe(userId);
            expect(decoded.email).toBe(email);
            expect(decoded.role).toBe('utilisateur');
        });

        it('should generate a valid token with a specific role', () => {
            const userId = 'admin123';
            const email = 'admin@example.com';
            
            const token = JWTService.genererToken(userId, email, 'admin');
            const decoded = jwt.verify(token, mockSecret) as any;

            expect(decoded.role).toBe('admin');
        });
    });

    describe('genererTokenAdmin', () => {
        it('should generate a valid admin token', () => {
            const adminId = 'admin123';
            const email = 'admin@example.com';
            const role = 'superadmin';

            const token = JWTService.genererTokenAdmin(adminId, email, role);
            const decoded = jwt.verify(token, mockSecret) as any;

            expect(decoded.id).toBe(adminId);
            expect(decoded.role).toBe('admin');
            expect(decoded.adminRole).toBe(role);
        });
    });

    describe('verifierToken', () => {
        it('should return decoded payload for a valid token', () => {
            const token = jwt.sign({ foo: 'bar' }, mockSecret);
            const verified = JWTService.verifierToken(token);
            expect(verified.foo).toBe('bar');
        });

        it('should throw an error for an invalid token', () => {
            expect(() => {
                JWTService.verifierToken('invalid-token');
            }).toThrow('Token invalide ou expiré');
        });
    });

    describe('decoderToken', () => {
        it('should decode a token without verifying', () => {
            const token = jwt.sign({ foo: 'bar' }, 'wrong-secret');
            const decoded = JWTService.decoderToken(token);
            expect(decoded.foo).toBe('bar');
        });
    });
});
