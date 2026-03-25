const Admin = require("../models/Admin");
const jwtService = require("../services/jwtService");
const gestionErreurs = require("../middleware/gestionErreurs");
class AdminAuthController {
}
exports.AdminAuthController = AdminAuthController;
AdminAuthController.connecter = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { email, motDePasse } = req.body;
    const admin = await Admin.Admin.findOne({ email });
    if (!admin) {
        throw new gestionErreurs.ErreurApp('Email ou mot de passe incorrect', 401);
    }
    if (!admin.actif) {
        throw new gestionErreurs.ErreurApp('Compte administrateur désactivé', 403);
    }
    const motDePasseValide = await admin.comparerMotDePasse(motDePasse);
    if (!motDePasseValide) {
        throw new gestionErreurs.ErreurApp('Email ou mot de passe incorrect', 401);
    }
    admin.derniereConnexion = new Date();
    await admin.save();
    const token = jwtService.JWTService.genererTokenAdmin(admin._id.toString(), admin.email, admin.role);
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
AdminAuthController.obtenirAdminActuel = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const admin = await Admin.Admin.findById(req.adminId).select('-motDePasse');
    if (!admin) {
        throw new gestionErreurs.ErreurApp('Administrateur non trouvé', 404);
    }
    res.json({
        succes: true,
        donnees: {
            admin
        }
    });
});
AdminAuthController.modifierProfil = gestionErreurs.asyncHandler(async (req, res, _next) => {
    const { nom, prenom, email, motDePasse } = req.body;
    const admin = await Admin.Admin.findById(req.adminId);
    if (!admin) {
        throw new gestionErreurs.ErreurApp('Administrateur non trouvé', 404);
    }
    if (nom)
        admin.nom = nom;
    if (prenom !== undefined)
        admin.prenom = prenom;
    if (email)
        admin.email = email;
    if (motDePasse)
        admin.motDePasse = motDePasse;
    await admin.save();
    res.json({
        succes: true,
        message: 'Profil modifié avec succès',
        donnees: {
            admin: {
                id: admin._id,
                prenom: admin.prenom,
                nom: admin.nom,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions
            }
        }
    });
});
AdminAuthController.deconnecter = gestionErreurs.asyncHandler(async (_req, res, _next) => {
    res.json({
        succes: true,
        message: 'Déconnexion réussie'
    });
});
