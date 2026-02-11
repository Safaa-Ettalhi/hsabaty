import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();


export class JWTService {
  private static secret: string = process.env.JWT_SECRET || 'changez-moi-en-production';
  private static expire: string = process.env.JWT_EXPIRE || '7d';

//générer un token JWT pour un utilisateur
  static genererToken(utilisateurId: string, email: string, role: 'utilisateur' | 'admin' = 'utilisateur'): string {
    const payload = {
      id: utilisateurId,
      email,
      role
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.expire
    } as SignOptions);
  }

//générer un token JWT pour un admin
  static genererTokenAdmin(adminId: string, email: string, role: string): string {
    const payload = {
      id: adminId,
      email,
      role: 'admin',
      adminRole: role
    };

    return jwt.sign(payload, this.secret, {
      expiresIn: this.expire
    } as SignOptions);
  }

//vérifier et décoder un token JWT
  static verifierToken(token: string): any {
    try {
      return jwt.verify(token, this.secret);
    } catch (error) {
      throw new Error('Token invalide ou expiré');
    }
  }

//décoder un token sans vérification
  static decoderToken(token: string): any {
    return jwt.decode(token);
  }
}
