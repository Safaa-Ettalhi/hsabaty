import { Request, Response, NextFunction } from 'express';
import { Admin } from '../models/Admin';
import { JWTService } from '../services/jwtService';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';


export class AdminAuthController {

  static connecter = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email, motDePasse } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      throw new ErreurApp('Email ou mot de passe incorrect', 401);
    }

    if (!admin.actif) {
      throw new ErreurApp('Compte administrateur désactivé', 403);
    }

    const motDePasseValide = await admin.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      throw new ErreurApp('Email ou mot de passe incorrect', 401);
    }

    admin.derniereConnexion = new Date();
    await admin.save();

    const token = JWTService.genererTokenAdmin(
      admin._id.toString(),
      admin.email,
      admin.role
    );

    res.json({
      succes: true,
      message: 'Connexion réussie',
      donnees: {
        admin: {
          id: admin._id,
          email: admin.email,
          nom: admin.nom,
          prenom: admin.prenom,
          role: admin.role,
          permissions: admin.permissions
        },
        token
      }
    });
  });

  static obtenirAdminActuel = asyncHandler(async (req: AuthentifieRequest, res: Response, _next: NextFunction) => {
    const admin = await Admin.findById(req.adminId).select('-motDePasse');
    
    if (!admin) {
      throw new ErreurApp('Administrateur non trouvé', 404);
    }

    res.json({
      succes: true,
      donnees: {
        admin
      }
    });
  });

  static deconnecter = asyncHandler(async (_req: AuthentifieRequest, res: Response, _next: NextFunction) => {
    res.json({
      succes: true,
      message: 'Déconnexion réussie'
    });
  });
}
