const Utilisateur = require("../models/Utilisateur");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Objectif = require("../models/Objectif");
const Admin = require("../models/Admin");
const Conversation = require("../models/Conversation");
const gestionErreurs = require("../middleware/gestionErreurs");
const date_fns = require("date-fns");

const AdminController = {};
AdminController.obtenirStatistiquesGlobales = gestionErreurs.asyncHandler(async (_req, res) => {
    const maintenant = new Date();
    const debutMois = date_fns.startOfMonth(maintenant);
    const finMois = date_fns.endOfMonth(maintenant);
    const debutAnnee = date_fns.startOfYear(maintenant);
    const finAnnee = date_fns.endOfYear(maintenant);
    // Statistiques utilisateurs
    const totalUtilisateurs = await Utilisateur.Utilisateur.countDocuments();
    const nouveauxUtilisateursMois = await Utilisateur.Utilisateur.countDocuments({
        dateCreation: { $gte: debutMois, $lte: finMois }
    });
    const nouveauxUtilisateursAnnee = await Utilisateur.Utilisateur.countDocuments({
        dateCreation: { $gte: debutAnnee, $lte: finAnnee }
    });
    // Statistiques transactions
    const totalTransactions = await Transaction.Transaction.countDocuments();
    const transactionsMois = await Transaction.Transaction.countDocuments({
        date: { $gte: debutMois, $lte: finMois }
    });
    const transactionsMoisData = await Transaction.Transaction.find({
        date: { $gte: debutMois, $lte: finMois }
    });
    const revenusMois = transactionsMoisData
        .filter(t => t.type === 'revenu')
        .reduce((sum, t) => sum + t.montant, 0);
    const depensesMois = transactionsMoisData
        .filter(t => t.type === 'depense')
        .reduce((sum, t) => sum + t.montant, 0);
    // Statistiques budgets et objectifs
    const totalBudgets = await Budget.Budget.countDocuments();
    const budgetsActifs = await Budget.Budget.countDocuments({ actif: true });
    const totalObjectifs = await Objectif.Objectif.countDocuments();
    const objectifsActifs = await Objectif.Objectif.countDocuments({ actif: true });
    // Statistiques IA
    const statsIA = await Conversation.Conversation.aggregate([
        { $group: { _id: null, totalMessages: { $sum: { $size: "$messages" } }, totalConversations: { $sum: 1 } } }
    ]);
    const totalMessagesIA = statsIA.length > 0 ? statsIA[0].totalMessages : 0;
    const totalConversationsIA = statsIA.length > 0 ? statsIA[0].totalConversations : 0;
    const statsIAMois = await Conversation.Conversation.aggregate([
        { $match: { createdAt: { $gte: debutMois, $lte: finMois } } },
        { $group: { _id: null, totalMessages: { $sum: { $size: "$messages" } } } }
    ]);
    const messagesMoisIA = statsIAMois.length > 0 ? statsIAMois[0].totalMessages : 0;
    // Évolution des utilisateurs (6 derniers mois)
    const evolutionUtilisateurs = [];
    for (let i = 5; i >= 0; i--) {
        const mois = date_fns.subMonths(maintenant, i);
        const debut = date_fns.startOfMonth(mois);
        const fin = date_fns.endOfMonth(mois);
        const count = await Utilisateur.Utilisateur.countDocuments({
            dateCreation: { $gte: debut, $lte: fin }
        });
        evolutionUtilisateurs.push({
            mois: debut.toISOString(),
            nombre: count
        });
    }
    // Top catégories de dépenses
    const transactionsDepenses = await Transaction.Transaction.find({
        type: 'depense',
        date: { $gte: debutMois, $lte: finMois }
    });
    const categoriesDepenses = transactionsDepenses.reduce((acc, t) => {
        acc[t.categorie] = (acc[t.categorie] || 0) + t.montant;
        return acc;
    }, {});
    const topCategories = Object.entries(categoriesDepenses)
        .map(([categorie, montant]) => ({ categorie, montant }))
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 5);
    res.json({
        succes: true,
        donnees: {
            utilisateurs: {
                total: totalUtilisateurs,
                nouveauxMois: nouveauxUtilisateursMois,
                nouveauxAnnee: nouveauxUtilisateursAnnee,
                evolution: evolutionUtilisateurs
            },
            transactions: {
                total: totalTransactions,
                ceMois: transactionsMois,
                revenusMois,
                depensesMois,
                topCategories
            },
            budgets: {
                total: totalBudgets,
                actifs: budgetsActifs
            },
            objectifs: {
                total: totalObjectifs,
                actifs: objectifsActifs
            },
            ia: {
                totalMessages: totalMessagesIA,
                totalConversations: totalConversationsIA,
                messagesMois: messagesMoisIA
            }
        }
    });
});
//liste tous les utilisateurs avec pagination
AdminController.listerUtilisateurs = gestionErreurs.asyncHandler(async (req, res) => {
    const { page = 1, limite = 50, recherche, actif: _actif } = req.query;
    const filtre = {};
    if (recherche) {
        filtre.$or = [
            { email: { $regex: recherche, $options: 'i' } },
            { nom: { $regex: recherche, $options: 'i' } },
            { prenom: { $regex: recherche, $options: 'i' } }
        ];
    }
    const skip = (Number(page) - 1) * Number(limite);
    const utilisateurs = await Utilisateur.Utilisateur.find(filtre)
        .select('-motDePasse')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(Number(limite));
    const total = await Utilisateur.Utilisateur.countDocuments(filtre);
    res.json({
        succes: true,
        donnees: {
            utilisateurs,
            pagination: {
                page: Number(page),
                limite: Number(limite),
                total,
                pages: Math.ceil(total / Number(limite))
            }
        }
    });
});
//modifier status  un utilisateur 
AdminController.modifierUtilisateur = gestionErreurs.asyncHandler(async (req, res) => {
    const { actif } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findById(req.params.id);
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    if (actif !== undefined)
        utilisateur.actif = actif;
    await utilisateur.save();
    res.json({
        succes: true,
        message: 'Utilisateur modifié avec succès',
        donnees: { utilisateur }
    });
});
//supprimer un utilisateur
AdminController.supprimerUtilisateur = gestionErreurs.asyncHandler(async (req, res) => {
    const utilisateur = await Utilisateur.Utilisateur.findById(req.params.id);
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    await Transaction.Transaction.deleteMany({ utilisateurId: utilisateur._id });
    await Budget.Budget.deleteMany({ utilisateurId: utilisateur._id });
    await Objectif.Objectif.deleteMany({ utilisateurId: utilisateur._id });
    await utilisateur.deleteOne();
    res.json({
        succes: true,
        message: 'Utilisateur et toutes ses données supprimés avec succès'
    });
});
//liste tous les admins
AdminController.listerAdmins = gestionErreurs.asyncHandler(async (req, res) => {
    const { page = 1, limite = 50, role, actif } = req.query;
    const filtre = {};
    if (role) {
        filtre.role = role;
    }
    if (actif !== undefined) {
        filtre.actif = actif === 'true';
    }
    const skip = (Number(page) - 1) * Number(limite);
    const admins = await Admin.Admin.find(filtre)
        .select('-motDePasse')
        .sort({ dateCreation: -1 })
        .skip(skip)
        .limit(Number(limite));
    const total = await Admin.Admin.countDocuments(filtre);
    res.json({
        succes: true,
        donnees: {
            admins,
            pagination: {
                page: Number(page),
                limite: Number(limite),
                total,
                pages: Math.ceil(total / Number(limite))
            }
        }
    });
});
//creer un admin
AdminController.creerAdmin = gestionErreurs.asyncHandler(async (req, res) => {
    const { email, motDePasse, nom, prenom, role, permissions } = req.body;
    const adminExistant = await Admin.Admin.findOne({ email });
    if (adminExistant) {
        throw new gestionErreurs.ErreurApp('Cet email est déjà utilisé', 409);
    }
    const nouvelAdmin = new Admin.Admin({
        email,
        motDePasse,
        nom,
        prenom,
        role: role || 'admin',
        permissions: permissions || []
    });
    await nouvelAdmin.save();
    res.status(201).json({
        succes: true,
        message: 'Administrateur créé avec succès',
        donnees: {
            admin: {
                id: nouvelAdmin._id,
                email: nouvelAdmin.email,
                nom: nouvelAdmin.nom,
                prenom: nouvelAdmin.prenom,
                role: nouvelAdmin.role,
                permissions: nouvelAdmin.permissions
            }
        }
    });
});
//modifier un admin
AdminController.modifierAdmin = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, prenom, email, role, permissions, actif } = req.body;
    const admin = await Admin.Admin.findById(req.params.id);
    if (!admin) {
        throw new gestionErreurs.ErreurApp('Administrateur non trouvé', 404);
    }
    if (admin._id.toString() === req.adminId && req.role !== 'super_admin') {
        throw new gestionErreurs.ErreurApp('Vous ne pouvez pas modifier votre propre compte', 403);
    }
    if (nom)
        admin.nom = nom;
    if (prenom !== undefined)
        admin.prenom = prenom;
    if (email)
        admin.email = email;
    if (role)
        admin.role = role;
    if (permissions)
        admin.permissions = permissions;
    if (actif !== undefined)
        admin.actif = actif;
    await admin.save();
    res.json({
        succes: true,
        message: 'Administrateur modifié avec succès',
        donnees: { admin }
    });
});
//supprimer un admin
AdminController.supprimerAdmin = gestionErreurs.asyncHandler(async (req, res) => {
    const admin = await Admin.Admin.findById(req.params.id);
    if (!admin) {
        throw new gestionErreurs.ErreurApp('Administrateur non trouvé', 404);
    }
    if (admin._id.toString() === req.adminId) {
        throw new gestionErreurs.ErreurApp('Vous ne pouvez pas supprimer votre propre compte', 403);
    }
    await admin.deleteOne();
    res.json({
        succes: true,
        message: 'Administrateur supprimé avec succès'
    });
});
module.exports = { AdminController };
