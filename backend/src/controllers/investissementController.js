const Investissement = require("../models/Investissement");
const gestionErreurs = require("../middleware/gestionErreurs");
const mongoose = require("mongoose");
class InvestissementController {
}
exports.InvestissementController = InvestissementController;
InvestissementController.creer = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, type, montantInvesti, valeurActuelle, rendementPourcentage, dateAchat, description } = req.body;
    const investissement = new Investissement.Investissement({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        nom,
        type: type || 'autre',
        montantInvesti,
        valeurActuelle: valeurActuelle ?? montantInvesti,
        rendementPourcentage,
        dateAchat: dateAchat ? new Date(dateAchat) : new Date(),
        dateValeur: valeurActuelle != null ? new Date() : undefined,
        description
    });
    await investissement.save();
    res.status(201).json({
        succes: true,
        message: 'Investissement créé avec succès',
        donnees: { investissement }
    });
});
InvestissementController.obtenirTous = gestionErreurs.asyncHandler(async (req, res) => {
    const { type, actif } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (type)
        filtre.type = type;
    if (actif !== undefined)
        filtre.actif = actif === 'true';
    const investissements = await Investissement.Investissement.find(filtre).sort({ dateAchat: -1 });
    const totalInvesti = investissements.reduce((s, i) => s + i.montantInvesti, 0);
    const totalValeur = investissements.reduce((s, i) => s + (i.valeurActuelle ?? i.montantInvesti), 0);
    const rendementTotal = totalInvesti > 0 ? ((totalValeur - totalInvesti) / totalInvesti) * 100 : 0;
    res.json({
        succes: true,
        donnees: {
            investissements,
            resume: { totalInvesti, totalValeur, rendementTotal: Math.round(rendementTotal * 100) / 100 }
        }
    });
});
InvestissementController.obtenirParId = gestionErreurs.asyncHandler(async (req, res) => {
    const investissement = await Investissement.Investissement.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement)
        throw new gestionErreurs.ErreurApp('Investissement non trouvé', 404);
    res.json({ succes: true, donnees: { investissement } });
});
InvestissementController.mettreAJour = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, type, montantInvesti, valeurActuelle, rendementPourcentage, dateAchat, description, actif } = req.body;
    const investissement = await Investissement.Investissement.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement)
        throw new gestionErreurs.ErreurApp('Investissement non trouvé', 404);
    if (nom !== undefined)
        investissement.nom = nom;
    if (type !== undefined)
        investissement.type = type;
    if (montantInvesti !== undefined)
        investissement.montantInvesti = montantInvesti;
    if (valeurActuelle !== undefined) {
        investissement.valeurActuelle = valeurActuelle;
        investissement.dateValeur = new Date();
    }
    if (rendementPourcentage !== undefined)
        investissement.rendementPourcentage = rendementPourcentage;
    if (dateAchat !== undefined)
        investissement.dateAchat = new Date(dateAchat);
    if (description !== undefined)
        investissement.description = description;
    if (actif !== undefined)
        investissement.actif = actif;
    investissement.dateModification = new Date();
    await investissement.save();
    res.json({
        succes: true,
        message: 'Investissement mis à jour',
        donnees: { investissement }
    });
});
InvestissementController.supprimer = gestionErreurs.asyncHandler(async (req, res) => {
    const investissement = await Investissement.Investissement.findOneAndDelete({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement)
        throw new gestionErreurs.ErreurApp('Investissement non trouvé', 404);
    res.json({ succes: true, message: 'Investissement supprimé' });
});
