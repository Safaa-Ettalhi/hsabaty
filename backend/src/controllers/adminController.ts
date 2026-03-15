import { Response } from 'express';
import { Utilisateur } from '../models/Utilisateur';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { Admin } from '../models/Admin';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';


export class AdminController {

  static obtenirStatistiquesGlobales = asyncHandler(async (_req: AuthentifieRequest, res: Response) => {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);
    const debutAnnee = startOfYear(maintenant);
    const finAnnee = endOfYear(maintenant);

    // Statistiques utilisateurs
    const totalUtilisateurs = await Utilisateur.countDocuments();
    const nouveauxUtilisateursMois = await Utilisateur.countDocuments({
      dateCreation: { $gte: debutMois, $lte: finMois }
    });
    const nouveauxUtilisateursAnnee = await Utilisateur.countDocuments({
      dateCreation: { $gte: debutAnnee, $lte: finAnnee }
    });

    // Statistiques transactions
    const totalTransactions = await Transaction.countDocuments();
    const transactionsMois = await Transaction.countDocuments({
      date: { $gte: debutMois, $lte: finMois }
    });

    const transactionsMoisData = await Transaction.find({
      date: { $gte: debutMois, $lte: finMois }
    });

    const revenusMois = transactionsMoisData
      .filter(t => t.type === 'revenu')
      .reduce((sum, t) => sum + t.montant, 0);

    const depensesMois = transactionsMoisData
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + t.montant, 0);

    // Statistiques budgets et objectifs
    const totalBudgets = await Budget.countDocuments();
    const budgetsActifs = await Budget.countDocuments({ actif: true });
    const totalObjectifs = await Objectif.countDocuments();
    const objectifsActifs = await Objectif.countDocuments({ actif: true });

    // Évolution des utilisateurs (6 derniers mois)
    const evolutionUtilisateurs = [];
    for (let i = 5; i >= 0; i--) {
      const mois = subMonths(maintenant, i);
      const debut = startOfMonth(mois);
      const fin = endOfMonth(mois);
      const count = await Utilisateur.countDocuments({
        dateCreation: { $gte: debut, $lte: fin }
      });
      evolutionUtilisateurs.push({
        mois: debut.toISOString(),
        nombre: count
      });
    }

    // Top catégories de dépenses
    const transactionsDepenses = await Transaction.find({
      type: 'depense',
      date: { $gte: debutMois, $lte: finMois }
    });

    const categoriesDepenses = transactionsDepenses.reduce((acc: any, t) => {
      acc[t.categorie] = (acc[t.categorie] || 0) + t.montant;
      return acc;
    }, {});

    const topCategories = Object.entries(categoriesDepenses)
      .map(([categorie, montant]: [string, any]) => ({ categorie, montant }))
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
        }
      }
    });
  });

//liste tous les utilisateurs avec pagination
  static listerUtilisateurs = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { page = 1, limite = 50, recherche, actif: _actif } = req.query;

    const filtre: any = {};
    
    if (recherche) {
      filtre.$or = [
        { email: { $regex: recherche, $options: 'i' } },
        { nom: { $regex: recherche, $options: 'i' } },
        { prenom: { $regex: recherche, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limite);

    const utilisateurs = await Utilisateur.find(filtre)
      .select('-motDePasse')
      .sort({ dateCreation: -1 })
      .skip(skip)
      .limit(Number(limite));

    const total = await Utilisateur.countDocuments(filtre);

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
  static modifierUtilisateur = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { actif } = req.body;

    const utilisateur = await Utilisateur.findById(req.params.id);
    
    if (!utilisateur) {
      throw new ErreurApp('Utilisateur non trouvé', 404);
    }

    if (actif !== undefined) utilisateur.actif = actif;

    await utilisateur.save();

    res.json({
      succes: true,
      message: 'Utilisateur modifié avec succès',
      donnees: { utilisateur }
    });
  });

//supprimer un utilisateur
  static supprimerUtilisateur = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const utilisateur = await Utilisateur.findById(req.params.id);
    
    if (!utilisateur) {
      throw new ErreurApp('Utilisateur non trouvé', 404);
    }

    await Transaction.deleteMany({ utilisateurId: utilisateur._id });
    await Budget.deleteMany({ utilisateurId: utilisateur._id });
    await Objectif.deleteMany({ utilisateurId: utilisateur._id });

    await utilisateur.deleteOne();

    res.json({
      succes: true,
      message: 'Utilisateur et toutes ses données supprimés avec succès'
    });
  });

//liste tous les admins
  static listerAdmins = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { page = 1, limite = 50, role, actif } = req.query;

    const filtre: any = {};

    if (role) {
      filtre.role = role;
    }

    if (actif !== undefined) {
      filtre.actif = actif === 'true';
    }

    const skip = (Number(page) - 1) * Number(limite);

    const admins = await Admin.find(filtre)
      .select('-motDePasse')
      .sort({ dateCreation: -1 })
      .skip(skip)
      .limit(Number(limite));

    const total = await Admin.countDocuments(filtre);

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
  static creerAdmin = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { email, motDePasse, nom, prenom, role, permissions } = req.body;

    const adminExistant = await Admin.findOne({ email });
    if (adminExistant) {
      throw new ErreurApp('Cet email est déjà utilisé', 409);
    }

    const nouvelAdmin = new Admin({
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
  static modifierAdmin = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { nom, prenom, email, role, permissions, actif } = req.body;

    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      throw new ErreurApp('Administrateur non trouvé', 404);
    }

    if (admin._id.toString() === req.adminId && req.role !== 'super_admin') {
      throw new ErreurApp('Vous ne pouvez pas modifier votre propre compte', 403);
    }

    if (nom) admin.nom = nom;
    if (prenom !== undefined) admin.prenom = prenom;
    if (email) admin.email = email;
    if (role) admin.role = role;
    if (permissions) admin.permissions = permissions;
    if (actif !== undefined) admin.actif = actif;

    await admin.save();

    res.json({
      succes: true,
      message: 'Administrateur modifié avec succès',
      donnees: { admin }
    });
  });

//supprimer un admin
  static supprimerAdmin = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) {
      throw new ErreurApp('Administrateur non trouvé', 404);
    }

    if (admin._id.toString() === req.adminId) {
      throw new ErreurApp('Vous ne pouvez pas supprimer votre propre compte', 403);
    }

    await admin.deleteOne();

    res.json({
      succes: true,
      message: 'Administrateur supprimé avec succès'
    });
  });
}
