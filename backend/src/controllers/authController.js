const crypto = require("crypto");
const Utilisateur = require("../models/Utilisateur");
const jwtService = require("../services/jwtService");
const emailService = require("../services/emailService");
const gestionErreurs = require("../middleware/gestionErreurs");
class AuthController {
}
exports.AuthController = AuthController;
//inscription d'un utilisateur
AuthController.inscrire = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { email, motDePasse, nom, prenom } = req.body;
    const utilisateurExistant = await Utilisateur.Utilisateur.findOne({ email });
    if (utilisateurExistant) {
        throw new gestionErreurs.ErreurApp('Cet email est déjà utilisé', 409);
    }
    const nouvelUtilisateur = new Utilisateur.Utilisateur({
        email,
        motDePasse,
        nom,
        prenom
    });
    await nouvelUtilisateur.save();
    // Créer la session
    req.session.utilisateurId = nouvelUtilisateur._id.toString();
    const token = jwtService.JWTService.genererToken(nouvelUtilisateur._id.toString(), nouvelUtilisateur.email);
    res.status(201).json({
        succes: true,
        message: 'Inscription réussie',
        donnees: {
            utilisateur: {
                id: nouvelUtilisateur._id,
                email: nouvelUtilisateur.email,
                nom: nouvelUtilisateur.nom,
                prenom: nouvelUtilisateur.prenom
            },
            token
        }
    });
});
//connexion d'un utilisateur
AuthController.connecter = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { email, motDePasse, seSouvenirDeMoi } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findOne({ email });
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Email ou mot de passe incorrect', 401);
    }
    if (utilisateur.actif === false) {
        throw new gestionErreurs.ErreurApp('Compte désactivé. Veuillez contacter l\'administration.', 403);
    }
    const motDePasseValide = await utilisateur.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
        throw new gestionErreurs.ErreurApp('Email ou mot de passe incorrect', 401);
    }
    utilisateur.derniereConnexion = new Date();
    await utilisateur.save();
    req.session.utilisateurId = utilisateur._id.toString();
    if (seSouvenirDeMoi) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    else {
        req.session.cookie.maxAge = undefined;
    }
    const token = jwtService.JWTService.genererToken(utilisateur._id.toString(), utilisateur.email);
    res.json({
        succes: true,
        message: 'Connexion réussie',
        donnees: {
            utilisateur: {
                id: utilisateur._id,
                email: utilisateur.email,
                nom: utilisateur.nom,
                prenom: utilisateur.prenom
            },
            token
        }
    });
});
//deconnexion
AuthController.deconnecter = gestionErreurs.asyncHandler(async (req, res, next) => {
    req.session?.destroy((err) => {
        if (err) {
            return next(new gestionErreurs.ErreurApp('Erreur lors de la déconnexion', 500));
        }
        res.clearCookie('connect.sid');
        res.json({
            succes: true,
            message: 'Déconnexion réussie'
        });
    });
});
//details de l'utilisateur connecté
AuthController.obtenirUtilisateurActuel = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const utilisateur = await Utilisateur.Utilisateur.findById(req.utilisateurId).select('-motDePasse');
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    const obj = utilisateur.toObject();
    res.json({
        succes: true,
        donnees: { utilisateur: obj }
    });
});
// modifier le profil
AuthController.modifierProfil = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { nom, prenom } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    if (nom !== undefined)
        utilisateur.nom = nom;
    if (prenom !== undefined)
        utilisateur.prenom = prenom;
    await utilisateur.save();
    const obj = utilisateur.toObject();
    delete obj.motDePasse;
    res.json({
        succes: true,
        message: 'Profil mis à jour',
        donnees: { utilisateur: obj }
    });
});
// modifier le mot de passe
AuthController.modifierMotDePasse = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { ancienMotDePasse, nouveauMotDePasse } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    const motDePasseValide = await utilisateur.comparerMotDePasse(ancienMotDePasse);
    if (!motDePasseValide) {
        throw new gestionErreurs.ErreurApp('L\'ancien mot de passe est incorrect', 400);
    }
    utilisateur.motDePasse = nouveauMotDePasse;
    await utilisateur.save();
    res.json({
        succes: true,
        message: 'Mot de passe mis à jour avec succès'
    });
});
/** Mot de passe oublié  */
AuthController.demanderReinitialisation = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { email } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findOne({ email: email?.trim()?.toLowerCase() });
    const message = 'Si un compte existe pour cette adresse, vous recevrez un e-mail avec les instructions.';
    if (!utilisateur) {
        return res.json({ succes: true, message });
    }
    const token = crypto.randomBytes(32).toString('hex');
    utilisateur.resetPasswordToken = token;
    utilisateur.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 h
    await utilisateur.save();
    const baseUrl = (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');
    const lien = `${baseUrl}/reset-password?token=${token}`;
    try {
        await emailService.EmailService.envoyerLienReinitialisation(utilisateur.email, utilisateur.nom, lien);
    }
    catch (err) {
        console.error('Erreur envoi email réinitialisation:', err);
        utilisateur.resetPasswordToken = undefined;
        utilisateur.resetPasswordExpires = undefined;
        await utilisateur.save();
        throw new gestionErreurs.ErreurApp('Impossible d’envoyer l’email. Vérifiez la configuration SMTP.', 500);
    }
    return res.json({ succes: true, message });
});
/** Réinitialiser le mot de passe avec le token reçu par email */
AuthController.reinitialiserMotDePasse = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { token, nouveauMotDePasse } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
    }).select('+resetPasswordToken +resetPasswordExpires');
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Lien invalide ou expiré. Demandez un nouveau lien.', 400);
    }
    utilisateur.motDePasse = nouveauMotDePasse;
    utilisateur.resetPasswordToken = undefined;
    utilisateur.resetPasswordExpires = undefined;
    await utilisateur.save();
    res.json({ succes: true, message: 'Mot de passe réinitialisé. Connectez-vous avec votre nouveau mot de passe.' });
});
