const calculsFinanciers = require("../services/calculsFinanciers");
const Transaction = require("../models/Transaction");
const exportService = require("../services/exportService");
const emailService = require("../services/emailService");
const Utilisateur = require("../models/Utilisateur");
const gestionErreurs = require("../middleware/gestionErreurs");
const mongoose = require("mongoose");
const date_fns = require("date-fns");
const serviceCalculs = new calculsFinanciers.ServiceCalculsFinanciers();

const RapportController = {};
//rapport de dépenses
RapportController.rapportDepenses = gestionErreurs.asyncHandler(async (req, res) => {
    const { dateDebut, dateFin, categorie } = req.query;
    const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
    const filtre = {
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        type: 'depense',
        date: { $gte: debut, $lte: fin }
    };
    if (categorie) {
        filtre.categorie = categorie;
    }
    const transactions = await Transaction.Transaction.find(filtre).sort({ date: -1 });
    const totalDepenses = transactions.reduce((sum, t) => sum + t.montant, 0);
    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;
    const depensesPrecedentes = await serviceCalculs.calculerDepenses(req.utilisateurId, periodePrecedenteDebut, periodePrecedenteFin);
    const repartition = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
    res.json({
        succes: true,
        donnees: {
            periode: { debut, fin },
            totalDepenses,
            nombreTransactions: transactions.length,
            depensesPrecedentes,
            evolution: totalDepenses - depensesPrecedentes,
            repartitionParCategorie: repartition,
            transactions
        }
    });
});
//rapport de revenus
RapportController.rapportRevenus = gestionErreurs.asyncHandler(async (req, res) => {
    const { dateDebut, dateFin } = req.query;
    const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
    const transactions = await Transaction.Transaction.find({
        utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
        type: 'revenu',
        date: { $gte: debut, $lte: fin }
    }).sort({ date: -1 });
    const totalRevenus = transactions.reduce((sum, t) => sum + t.montant, 0);
    const parSource = transactions.reduce((acc, t) => {
        const source = t.categorie || 'Autres';
        acc[source] = (acc[source] || 0) + t.montant;
        return acc;
    }, {});
    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;
    const revenusPrecedents = await serviceCalculs.calculerRevenus(req.utilisateurId, periodePrecedenteDebut, periodePrecedenteFin);
    res.json({
        succes: true,
        donnees: {
            periode: { debut, fin },
            totalRevenus,
            nombreTransactions: transactions.length,
            revenusPrecedents,
            evolution: totalRevenus - revenusPrecedents,
            repartitionParSource: Object.entries(parSource).map(([source, montant]) => ({
                source,
                montant,
                pourcentage: (montant / totalRevenus) * 100
            })),
            transactions
        }
    });
});
//rapport d'épargne
RapportController.rapportEpargne = gestionErreurs.asyncHandler(async (req, res) => {
    const { dateDebut, dateFin } = req.query;
    const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
    const epargne = revenus - depenses;
    const tauxEpargne = revenus > 0 ? (epargne / revenus) * 100 : 0;
    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;
    const epargnePrecedente = await serviceCalculs.calculerRevenus(req.utilisateurId, periodePrecedenteDebut, periodePrecedenteFin) - await serviceCalculs.calculerDepenses(req.utilisateurId, periodePrecedenteDebut, periodePrecedenteFin);
    res.json({
        succes: true,
        donnees: {
            periode: { debut, fin },
            revenus,
            depenses,
            epargne,
            tauxEpargne,
            epargnePrecedente,
            evolution: epargne - epargnePrecedente
        }
    });
});
//rapport mensuel
RapportController.rapportMensuel = gestionErreurs.asyncHandler(async (req, res) => {
    const { mois, annee } = req.query;
    const date = mois && annee
        ? new Date(Number(annee), Number(mois) - 1, 1)
        : new Date();
    const debut = date_fns.startOfMonth(date);
    const fin = date_fns.endOfMonth(date);
    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
    const epargne = revenus - depenses;
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, debut, fin);
    const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId, debut, fin, 10);
    const moisPrecedent = date_fns.subMonths(debut, 1);
    const revenusPrecedents = await serviceCalculs.calculerRevenus(req.utilisateurId, date_fns.startOfMonth(moisPrecedent), date_fns.endOfMonth(moisPrecedent));
    const depensesPrecedentes = await serviceCalculs.calculerDepenses(req.utilisateurId, date_fns.startOfMonth(moisPrecedent), date_fns.endOfMonth(moisPrecedent));
    res.json({
        succes: true,
        donnees: {
            periode: { debut, fin },
            resume: {
                revenus,
                depenses,
                epargne,
                tauxEpargne
            },
            comparaison: {
                revenus: { actuel: revenus, precedent: revenusPrecedents, evolution: revenus - revenusPrecedents },
                depenses: { actuel: depenses, precedent: depensesPrecedentes, evolution: depenses - depensesPrecedentes }
            },
            repartitionDepenses,
            topDepenses
        }
    });
});
//flux de trésorerie (Sankey)
RapportController.fluxTresorerie = gestionErreurs.asyncHandler(async (req, res) => {
    const { dateDebut, dateFin } = req.query;
    const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
    const flux = await serviceCalculs.genererFluxTresorerie(req.utilisateurId, debut, fin);
    res.json({
        succes: true,
        donnees: {
            periode: { debut, fin },
            ...flux
        }
    });
});
//exporter un rapport en PDF
RapportController.exporterPDF = gestionErreurs.asyncHandler(async (req, res) => {
    const { type, dateDebut, dateFin, mois, annee } = req.query;
    let donnees = {};
    if (type === 'mensuel') {
        const date = mois && annee
            ? new Date(Number(annee), Number(mois) - 1, 1)
            : new Date();
        const debut = date_fns.startOfMonth(date);
        const fin = date_fns.endOfMonth(date);
        const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
        const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
        const epargne = revenus - depenses;
        const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, debut, fin);
        const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
        const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId, debut, fin, 10);
        donnees = {
            resume: { revenus, depenses, epargne, tauxEpargne },
            repartitionDepenses,
            topDepenses
        };
    }
    else {
        const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
        const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
        const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
        const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
        const epargne = revenus - depenses;
        const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, debut, fin);
        const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
        donnees = {
            resume: { revenus, depenses, epargne, tauxEpargne },
            repartitionDepenses
        };
    }
    const titre = type === 'mensuel'
        ? `Rapport Mensuel - ${mois}/${annee}`
        : `Rapport Financier - ${dateDebut} au ${dateFin}`;
    const pdfBuffer = await exportService.ExportService.exporterRapportPDF(titre, donnees, req.utilisateurId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${Date.now()}.pdf`);
    res.send(pdfBuffer);
});
//partager un rapport par email
RapportController.partagerParEmail = gestionErreurs.asyncHandler(async (req, res) => {
    const { type, emailDestinataire, dateDebut, dateFin, mois, annee } = req.body;
    const utilisateur = await Utilisateur.Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
        throw new gestionErreurs.ErreurApp('Utilisateur non trouvé', 404);
    }
    let donnees = {};
    if (type === 'mensuel') {
        const date = mois && annee
            ? new Date(Number(annee), Number(mois) - 1, 1)
            : new Date();
        const debut = date_fns.startOfMonth(date);
        const fin = date_fns.endOfMonth(date);
        const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
        const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
        const epargne = revenus - depenses;
        const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, debut, fin);
        const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
        const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId, debut, fin, 10);
        donnees = {
            resume: { revenus, depenses, epargne, tauxEpargne },
            repartitionDepenses,
            topDepenses
        };
    }
    else {
        const debut = dateDebut ? new Date(dateDebut) : date_fns.startOfMonth(new Date());
        const fin = dateFin ? new Date(dateFin) : date_fns.endOfMonth(new Date());
        const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, fin);
        const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, fin);
        const epargne = revenus - depenses;
        const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, debut, fin);
        const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, debut, fin);
        donnees = {
            resume: { revenus, depenses, epargne, tauxEpargne },
            repartitionDepenses
        };
    }
    const titre = type === 'mensuel'
        ? `Rapport Mensuel - ${mois}/${annee}`
        : `Rapport Financier`;
    const pdfBuffer = await exportService.ExportService.exporterRapportPDF(titre, donnees, req.utilisateurId);
    await emailService.EmailService.envoyerRapport(emailDestinataire || utilisateur.email, utilisateur.nom, pdfBuffer, type || 'financier');
    res.json({
        succes: true,
        message: 'Rapport envoyé par email avec succès'
    });
});

module.exports = { RapportController };
