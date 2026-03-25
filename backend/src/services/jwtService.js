const jsonwebtoken = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
class JWTService {
    //générer un token JWT pour un utilisateur
    static genererToken(utilisateurId, email, role = 'utilisateur') {
        const payload = {
            id: utilisateurId,
            email,
            role
        };
        return jsonwebtoken.sign(payload, this.secret, {
            expiresIn: this.expire
        });
    }
    //générer un token JWT pour un admin
    static genererTokenAdmin(adminId, email, role) {
        const payload = {
            id: adminId,
            email,
            role: 'admin',
            adminRole: role
        };
        return jsonwebtoken.sign(payload, this.secret, {
            expiresIn: this.expire
        });
    }
    //vérifier et décoder un token JWT
    static verifierToken(token) {
        try {
            return jsonwebtoken.verify(token, this.secret);
        }
        catch (error) {
            throw new Error('Token invalide ou expiré');
        }
    }
    //décoder un token sans vérification
    static decoderToken(token) {
        return jsonwebtoken.decode(token);
    }
}
exports.JWTService = JWTService;
JWTService.secret = process.env.JWT_SECRET || 'changez-moi-en-production';
JWTService.expire = process.env.JWT_EXPIRE || '7d';
