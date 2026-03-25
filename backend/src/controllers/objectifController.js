const Objectif = require("../models/Objectif");
const calculsFinanciers = require("../services/calculsFinanciers");
const gestionErreurs = require("../middleware/gestionErreurs");
const mongoose = require("mongoose");
const serviceCalculs = new calculsFinanciers.ServiceCalculsFinanciers();

const ObjectifController = {};
//nouveau objectif
ObjectifController.creer = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, montantCible, dateLimite, categorie, type, description } = req.body;
    const objectif = new Objectif.Objectif({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        nom,
        montantCible,
        dateLimite: new Date(dateLimite),
        categorie,
        type: type || 'epargne',
        description
    });
    await objectif.save();
    res.status(201).json({
        succes: true,
        message: 'Objectif créé avec succès',
        donnees: { objectif }
    });
});
//liste tous les objectifs
ObjectifController.obtenirTous = gestionErreurs.asyncHandler(async (req, res) => {
    const { actif } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (actif !== undefined) {
        filtre.actif = actif === 'true';
    }
    const objectifs = await Objectif.Objectif.find(filtre).sort({ dateCreation: -1 });
    const objectifsAvecProgression = await Promise.all(objectifs.map(async (objectif) => {
        const progression = await serviceCalculs.calculerProgressionObjectif(objectif._id.toString());
        return {
            ...objectif.toObject(),
            progression
        };
    }));
    res.json({
        succes: true,
        donnees: { objectifs: objectifsAvecProgression }
    });
});
//details d'un objectif
ObjectifController.obtenirParId = gestionErreurs.asyncHandler(async (req, res) => {
    const objectif = await Objectif.Objectif.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!objectif) {
        throw new gestionErreurs.ErreurApp('Objectif non trouvé', 404);
    }
    const progression = await serviceCalculs.calculerProgressionObjectif(objectif._id.toString());
    res.json({
        succes: true,
        donnees: {
            objectif,
            progression
        }
    });
});
//modifier un objectif
ObjectifController.mettreAJour = gestionErreurs.asyncHandler(async (req, res) => {
    const { nom, montantCible, montantActuel, dateLimite, categorie, type, description, actif } = req.body;
    const objectif = await Objectif.Objectif.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!objectif) {
        throw new gestionErreurs.ErreurApp('Objectif non trouvé', 404);
    }
    if (nom)
        objectif.nom = nom;
    if (montantCible !== undefined)
        objectif.montantCible = montantCible;
    if (montantActuel !== undefined)
        objectif.montantActuel = montantActuel;
    if (dateLimite)
        objectif.dateLimite = new Date(dateLimite);
    if (categorie !== undefined)
        objectif.categorie = categorie;
    if (type)
        objectif.type = type;
    if (description !== undefined)
        objectif.description = description;
    if (actif !== undefined)
        objectif.actif = actif;
    objectif.dateModification = new Date();
    await objectif.save();
    res.json({
        succes: true,
        message: 'Objectif mis à jour avec succès',
        donnees: { objectif }
    });
});
//ajouter une contribution à un objectif
ObjectifController.ajouterContribution = gestionErreurs.asyncHandler(async (req, res) => {
    const { montant } = req.body;
    const objectif = await Objectif.Objectif.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!objectif) {
        throw new gestionErreurs.ErreurApp('Objectif non trouvé', 404);
    }
    objectif.montantActuel = Math.min(objectif.montantActuel + montant, objectif.montantCible);
    objectif.dateModification = new Date();
    await objectif.save();
    const progression = await serviceCalculs.calculerProgressionObjectif(objectif._id.toString());
    res.json({
        succes: true,
        message: 'Contribution ajoutée avec succès',
        donnees: {
            objectif,
            progression
        }
    });
});
//supprimer un objectif
ObjectifController.supprimer = gestionErreurs.asyncHandler(async (req, res) => {
    const objectif = await Objectif.Objectif.findOneAndDelete({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!objectif) {
        throw new gestionErreurs.ErreurApp('Objectif non trouvé', 404);
    }
    res.json({
        succes: true,
        message: 'Objectif supprimé avec succès'
    });
});
module.exports = { ObjectifController };
