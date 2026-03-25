const Transaction = require("../models/Transaction");
const gestionErreurs = require("../middleware/gestionErreurs");
const services = require("../services");
const mongoose = require("mongoose");
const date_fns = require("date-fns");
class TransactionController {
}
exports.TransactionController = TransactionController;
//creer une transaction
TransactionController.creer = gestionErreurs.asyncHandler(async (req, res) => {
    if (!req.utilisateurId) {
        throw new gestionErreurs.ErreurApp('Token utilisateur requis. Connectez-vous via Auth > Connexion (pas Admin).', 403);
    }
    const { montant, type, categorie, sousCategorie, description, date, tags } = req.body;
    const transaction = new Transaction.Transaction({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        montant,
        type,
        categorie,
        sousCategorie,
        description,
        date: date ? new Date(date) : new Date(),
        tags: tags || []
    });
    await transaction.save();
    services.VectorService.upsertTransaction(transaction).catch(e => console.error('[TransactionController] Pinecone error:', e));
    res.status(201).json({
        succes: true,
        message: 'Transaction créée avec succès',
        donnees: { transaction }
    });
});
//liste toutes les transactions avec filtres
TransactionController.obtenirToutes = gestionErreurs.asyncHandler(async (req, res) => {
    if (!req.utilisateurId) {
        throw new gestionErreurs.ErreurApp('Token utilisateur requis pour cette ressource. Utilisez le token reçu lors de la connexion (Auth > Connexion), pas le token admin.', 403);
    }
    const { page, limite, type, categorie, dateDebut, dateFin, recherche, sort, order } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (type)
        filtre.type = type;
    if (categorie)
        filtre.categorie = categorie;
    if (dateDebut || dateFin) {
        filtre.date = {};
        if (dateDebut)
            filtre.date.$gte = new Date(dateDebut);
        if (dateFin)
            filtre.date.$lte = new Date(dateFin);
    }
    if (recherche) {
        filtre.$or = [
            { description: { $regex: recherche, $options: 'i' } },
            { categorie: { $regex: recherche, $options: 'i' } }
        ];
    }
    const skip = (page - 1) * limite;
    const sortField = (sort || 'date');
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj = { [sortField]: sortOrder };
    const transactions = await Transaction.Transaction.find(filtre)
        .sort(sortObj)
        .skip(skip)
        .limit(limite);
    const total = await Transaction.Transaction.countDocuments(filtre);
    res.json({
        succes: true,
        donnees: {
            transactions,
            pagination: {
                page,
                limite,
                total,
                pages: Math.ceil(total / limite)
            }
        }
    });
});
//details d'une transaction
TransactionController.obtenirParId = gestionErreurs.asyncHandler(async (req, res) => {
    const transaction = await Transaction.Transaction.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!transaction) {
        throw new gestionErreurs.ErreurApp('Transaction non trouvée', 404);
    }
    res.json({
        succes: true,
        donnees: { transaction }
    });
});
//modifier une transaction
TransactionController.mettreAJour = gestionErreurs.asyncHandler(async (req, res) => {
    const { montant, type, categorie, sousCategorie, description, date, tags } = req.body;
    const transaction = await Transaction.Transaction.findOne({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!transaction) {
        throw new gestionErreurs.ErreurApp('Transaction non trouvée', 404);
    }
    if (montant !== undefined)
        transaction.montant = montant;
    if (type)
        transaction.type = type;
    if (categorie)
        transaction.categorie = categorie;
    if (sousCategorie !== undefined)
        transaction.sousCategorie = sousCategorie;
    if (description)
        transaction.description = description;
    if (date)
        transaction.date = new Date(date);
    if (tags)
        transaction.tags = tags;
    transaction.dateModification = new Date();
    await transaction.save();
    services.VectorService.upsertTransaction(transaction).catch(e => console.error('[TransactionController] Pinecone error:', e));
    res.json({
        succes: true,
        message: 'Transaction mise à jour avec succès',
        donnees: { transaction }
    });
});
//supprimer une transaction
TransactionController.supprimer = gestionErreurs.asyncHandler(async (req, res) => {
    const transaction = await Transaction.Transaction.findOneAndDelete({
        _id: req.params.id,
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!transaction) {
        throw new gestionErreurs.ErreurApp('Transaction non trouvée', 404);
    }
    services.VectorService.supprimerTransaction(transaction._id.toString()).catch(e => console.error('[TransactionController] Pinecone delete error:', e));
    res.json({
        succes: true,
        message: 'Transaction supprimée avec succès'
    });
});
//statistiques des transactions
TransactionController.obtenirStatistiques = gestionErreurs.asyncHandler(async (req, res) => {
    const { periode = 'mois' } = req.query;
    let dateDebut;
    let dateFin = new Date();
    switch (periode) {
        case 'jour':
            dateDebut = date_fns.subDays(dateFin, 1);
            break;
        case 'semaine':
            dateDebut = date_fns.subDays(dateFin, 7);
            break;
        case 'mois':
            dateDebut = date_fns.startOfMonth(dateFin);
            dateFin = date_fns.endOfMonth(dateFin);
            break;
        case 'trimestre':
            dateDebut = date_fns.subMonths(dateFin, 3);
            break;
        case 'annee':
            dateDebut = date_fns.startOfYear(dateFin);
            dateFin = date_fns.endOfYear(dateFin);
            break;
        default:
            dateDebut = date_fns.startOfMonth(dateFin);
            dateFin = date_fns.endOfMonth(dateFin);
    }
    const transactions = await Transaction.Transaction.find({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        date: { $gte: dateDebut, $lte: dateFin }
    });
    const revenus = transactions
        .filter(t => t.type === 'revenu')
        .reduce((sum, t) => sum + t.montant, 0);
    const depenses = transactions
        .filter(t => t.type === 'depense')
        .reduce((sum, t) => sum + t.montant, 0);
    const repartition = transactions
        .filter(t => t.type === 'depense')
        .reduce((acc, t) => {
        const cat = t.categorie;
        acc[cat] = (acc[cat] || 0) + t.montant;
        return acc;
    }, {});
    res.json({
        succes: true,
        donnees: {
            periode: { dateDebut, dateFin },
            revenus,
            depenses,
            solde: revenus - depenses,
            repartitionParCategorie: repartition
        }
    });
});
//exporter les transactions en CSV
TransactionController.exporterCSV = gestionErreurs.asyncHandler(async (req, res) => {
    const { type, categorie, dateDebut, dateFin } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (type)
        filtre.type = type;
    if (categorie)
        filtre.categorie = categorie;
    if (dateDebut || dateFin) {
        filtre.date = {};
        if (dateDebut)
            filtre.date.$gte = new Date(dateDebut);
        if (dateFin)
            filtre.date.$lte = new Date(dateFin);
    }
    const transactions = await Transaction.Transaction.find(filtre).sort({ date: -1 });
    const cheminFichier = await services.ExportService.exporterTransactionsCSV(req.utilisateurId, transactions);
    res.download(cheminFichier, `transactions_${Date.now()}.csv`, (err) => {
        if (err) {
            console.error('Erreur lors du téléchargement:', err);
        }
    });
});
//exporter les transactions en Excel
TransactionController.exporterExcel = gestionErreurs.asyncHandler(async (req, res) => {
    const { type, categorie, dateDebut, dateFin } = req.query;
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (type)
        filtre.type = type;
    if (categorie)
        filtre.categorie = categorie;
    if (dateDebut || dateFin) {
        filtre.date = {};
        if (dateDebut)
            filtre.date.$gte = new Date(dateDebut);
        if (dateFin)
            filtre.date.$lte = new Date(dateFin);
    }
    const transactions = await Transaction.Transaction.find(filtre).sort({ date: -1 });
    const buffer = await services.ExportService.exporterTransactionsExcel(req.utilisateurId, transactions);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.xlsx`);
    res.send(buffer);
});
