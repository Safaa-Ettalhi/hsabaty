import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { Utilisateur } from '../models/Utilisateur';
import { JWTService } from '../services/jwtService';
import { EmailService } from '../services/emailService';
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
    const obj = utilisateur.toObject();
    if (!obj.preferences) {
      obj.preferences = { notificationsEmail: true, notificationsPush: true, langue: 'fr' };
    }
    res.json({
      succes: true,
      donnees: { utilisateur: obj }
    });
  });

  // modifier le profil
  static modifierProfil = asyncHandler(async (req: AuthentifieRequest, res: Response, _next: NextFunction) => {
    const { nom, prenom, devise, preferences } = req.body;
    const utilisateur = await Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
      throw new ErreurApp('Utilisateur non trouvé', 404);
    }
    if (nom !== undefined) utilisateur.nom = nom;
    if (prenom !== undefined) utilisateur.prenom = prenom;
    if (devise) utilisateur.devise = devise;
    if (preferences) {
      utilisateur.preferences = utilisateur.preferences || { notificationsEmail: true, notificationsPush: true, langue: 'fr' };
      if (preferences.notificationsEmail !== undefined) utilisateur.preferences.notificationsEmail = preferences.notificationsEmail;
      if (preferences.notificationsPush !== undefined) utilisateur.preferences.notificationsPush = preferences.notificationsPush;
      if (preferences.langue) utilisateur.preferences.langue = preferences.langue;
    }
    await utilisateur.save();
    const obj = utilisateur.toObject();
    delete (obj as any).motDePasse;
    res.json({
      succes: true,
      message: 'Profil mis à jour',
      donnees: { utilisateur: obj }
    });
  });

  /** Mot de passe oublié  */
  static demanderReinitialisation = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = req.body;
    const utilisateur = await Utilisateur.findOne({ email: email?.trim()?.toLowerCase() });
    const message = 'Si un compte existe pour cette adresse, vous recevrez un e-mail avec les instructions.';
    if (!utilisateur) {
      return res.json({ succes: true, message });
    }
    const token = crypto.randomBytes(32).toString('hex');
    (utilisateur as any).resetPasswordToken = token;
    (utilisateur as any).resetPasswordExpires = new Date(Date.now() + 3600000); // 1 h
    await utilisateur.save();
    const baseUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');
    const lien = `${baseUrl}/reset-password?token=${token}`;
    try {
      await EmailService.envoyerLienReinitialisation(utilisateur.email, utilisateur.nom, lien);
    } catch (err) {
      console.error('Erreur envoi email réinitialisation:', err);
      (utilisateur as any).resetPasswordToken = undefined;
      (utilisateur as any).resetPasswordExpires = undefined;
      await utilisateur.save();
      throw new ErreurApp('Impossible d’envoyer l’email. Vérifiez la configuration SMTP.', 500);
    }
    return res.json({ succes: true, message });
  });

  /** Réinitialiser le mot de passe avec le token reçu par email */
  static reinitialiserMotDePasse = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { token, nouveauMotDePasse } = req.body;
    const utilisateur = await Utilisateur.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!utilisateur) {
      throw new ErreurApp('Lien invalide ou expiré. Demandez un nouveau lien.', 400);
    }
    utilisateur.motDePasse = nouveauMotDePasse;
    (utilisateur as any).resetPasswordToken = undefined;
    (utilisateur as any).resetPasswordExpires = undefined;
    await utilisateur.save();
    res.json({ succes: true, message: 'Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.' });
  });
}
