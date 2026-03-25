const Budget = require("../models/Budget");
const calculsFinanciers = require("../services/calculsFinanciers");
const gestionErreurs = require("../middleware/gestionErreurs");
const mongoose = require("mongoose");
const date_fns = require("date-fns");
const serviceCalculs = new calculsFinanciers.ServiceCalculsFinanciers();
class BudgetController {
}
exports.BudgetController = BudgetController;
//creer un budget
BudgetController.creer = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, montant, categorie, periode } = req.body;
    let dateDebut = new Date();
    let dateFin = new Date();
    const maintenant = new Date();
    if (periode === 'mensuel' || !periode) {
        dateDebut = date_fns.startOfMonth(maintenant);
        dateFin = date_fns.endOfMonth(maintenant);
    }
    else if (periode === 'trimestriel') {
        dateDebut = date_fns.startOfQuarter(maintenant);
        dateFin = date_fns.endOfQuarter(maintenant);
    }
    else if (periode === 'annuel') {
        dateDebut = date_fns.startOfYear(maintenant);
        dateFin = date_fns.endOfYear(maintenant);
    }
    const budget = new Budget.Budget({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        nom,
        montant,
        categorie,
        periode: periode || 'mensuel',
        dateDebut,
        dateFin
    });
    await budget.save();
    res.status(201).json({
        succes: true,
        message: 'Budget créé avec succès',
        donnees: { budget }
    });
});
//liste tous les budgets
BudgetController.obtenirTous = gestionErreurs.asyncHandler(async (req, res) => {
    const { actif } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (actif !== undefined) {
        filtre.actif = actif === 'true';
    }
    const budgets = await Budget.Budget.find(filtre).sort({ dateCreation: -1 });
    const budgetsAvecStats = await Promise.all(budgets.map(async (budget) => {
        const stats = await serviceCalculs.calculerStatistiquesBudget(budget._id.toString());
        return {
            ...budget.toObject(),
            statistiques: stats
        };
    }));
    res.json({
        succes: true,
        donnees: { budgets: budgetsAvecStats }
    });
});
//details d'un budget
BudgetController.obtenirParId = gestionErreurs.asyncHandler(async (req, res) => {
    const budget = await Budget.Budget.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!budget) {
        throw new gestionErreurs.ErreurApp('Budget non trouvé', 404);
    }
    const statistiques = await serviceCalculs.calculerStatistiquesBudget(budget._id.toString());
    res.json({
        succes: true,
        donnees: {
            budget,
            statistiques
        }
    });
});
//modifier un budget
BudgetController.mettreAJour = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, montant, categorie, periode, actif } = req.body;
    const budget = await Budget.Budget.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!budget) {
        throw new gestionErreurs.ErreurApp('Budget non trouvé', 404);
    }
    if (nom)
        budget.nom = nom;
    if (montant !== undefined)
        budget.montant = montant;
    if (categorie !== undefined)
        budget.categorie = categorie;
    if (actif !== undefined)
        budget.actif = actif;
    if (periode && budget.periode !== periode) {
        budget.periode = periode;
        const maintenant = new Date();
        if (periode === 'mensuel') {
            budget.dateDebut = date_fns.startOfMonth(maintenant);
            budget.dateFin = date_fns.endOfMonth(maintenant);
        }
        else if (periode === 'trimestriel') {
            budget.dateDebut = date_fns.startOfQuarter(maintenant);
            budget.dateFin = date_fns.endOfQuarter(maintenant);
        }
        else if (periode === 'annuel') {
            budget.dateDebut = date_fns.startOfYear(maintenant);
            budget.dateFin = date_fns.endOfYear(maintenant);
        }
    }
    budget.dateModification = new Date();
    await budget.save();
    res.json({
        succes: true,
        message: 'Budget mis à jour avec succès',
        donnees: { budget }
    });
});
//supprimer un budget
BudgetController.supprimer = gestionErreurs.asyncHandler(async (req, res) => {
    const budget = await Budget.Budget.findOneAndDelete({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!budget) {
        throw new gestionErreurs.ErreurApp('Budget non trouvé', 404);
    }
    res.json({
        succes: true,
        message: 'Budget supprimé avec succès'
    });
});
