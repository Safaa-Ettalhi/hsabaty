import { Request, Response, NextFunction } from 'express';
import { Utilisateur } from '../models/Utilisateur';
import { JWTService } from '../services/jwtService';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';

export class AuthController {

//inscription d'un utilisateur
  static inscrire = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email, motDePasse, nom, prenom, devise } = req.body;

    const utilisateurExistant = await Utilisateur.findOne({ email });
    if (utilisateurExistant) {
      throw new ErreurApp('Cet email est déjà utilisé', 409);
    }
    const nouvelUtilisateur = new Utilisateur({
      email,
      motDePasse,
      nom,
      prenom,
      devise: devise || 'MAD'
    });

    await nouvelUtilisateur.save();

    // Créer la session
    (req.session as any).utilisateurId = nouvelUtilisateur._id.toString();

    const token = JWTService.genererToken(
      nouvelUtilisateur._id.toString(),
      nouvelUtilisateur.email
    );

    res.status(201).json({
      succes: true,
      message: 'Inscription réussie',
      donnees: {
        utilisateur: {
          id: nouvelUtilisateur._id,
          email: nouvelUtilisateur.email,
          nom: nouvelUtilisateur.nom,
          prenom: nouvelUtilisateur.prenom,
          devise: nouvelUtilisateur.devise
        },
        token
      }
    });
  });

//connexion d'un utilisateur
  static connecter = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email, motDePasse } = req.body;

    const utilisateur = await Utilisateur.findOne({ email });
    if (!utilisateur) {
      throw new ErreurApp('Email ou mot de passe incorrect', 401);
    }

    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
      throw new ErreurApp('Email ou mot de passe incorrect', 401);
    }

    utilisateur.derniereConnexion = new Date();
    await utilisateur.save();

    (req.session as any).utilisateurId = utilisateur._id.toString();

    const token = JWTService.genererToken(
      utilisateur._id.toString(),
      utilisateur.email
    );

    res.json({
      succes: true,
      message: 'Connexion réussie',
      donnees: {
        utilisateur: {
          id: utilisateur._id,
          email: utilisateur.email,
          nom: utilisateur.nom,
          prenom: utilisateur.prenom,
          devise: utilisateur.devise
        },
        token
      }
    });
  });

//deconnexion
  static deconnecter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    req.session?.destroy((err) => {
      if (err) {
        return next(new ErreurApp('Erreur lors de la déconnexion', 500));
      }

      res.clearCookie('connect.sid');
      res.json({
        succes: true,
        message: 'Déconnexion réussie'
      });
    });
  });

//details de l'utilisateur connecté
  static obtenirUtilisateurActuel = asyncHandler(async (req: AuthentifieRequest, res: Response, _next: NextFunction) => {
    const utilisateur = await Utilisateur.findById(req.utilisateurId).select('-motDePasse');
    
    if (!utilisateur) {
      throw new ErreurApp('Utilisateur non trouvé', 404);
    }

    res.json({
      succes: true,
      donnees: {
        utilisateur
      }
    });
  });
}
