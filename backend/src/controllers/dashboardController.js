const calculsFinanciers = require("../services/calculsFinanciers");
const gestionErreurs = require("../middleware/gestionErreurs");
const date_fns = require("date-fns");
const serviceCalculs = new calculsFinanciers.ServiceCalculsFinanciers();

const DashboardController = {};
DashboardController.obtenirMetriques = gestionErreurs.asyncHandler(async (req, res) => {
    const { periode, dateDebut: dateDebutStr, dateFin: dateFinStr } = req.query;
    let dateDebut;
    let dateFin = new Date();
    if (dateDebutStr && dateFinStr) {
        dateDebut = new Date(dateDebutStr);
        dateFin = new Date(dateFinStr);
        if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
            dateDebut = date_fns.startOfMonth(dateFin);
            dateFin = date_fns.endOfMonth(dateFin);
        }
        else if (dateDebut > dateFin) {
            [dateDebut, dateFin] = [dateFin, dateDebut];
        }
    }
    else {
        switch (periode) {
            case 'mois':
                dateDebut = date_fns.startOfMonth(dateFin);
                dateFin = date_fns.endOfMonth(dateFin);
                break;
            case 'mois_precedent': {
                const ref = date_fns.subMonths(dateFin, 1);
                dateDebut = date_fns.startOfMonth(ref);
                dateFin = date_fns.endOfMonth(ref);
                break;
            }
            case 'trimestre':
                dateDebut = date_fns.subMonths(dateFin, 3);
                break;
            case 'semestre':
                dateDebut = date_fns.subMonths(dateFin, 6);
                break;
            case 'annee':
                dateDebut = date_fns.startOfYear(dateFin);
                dateFin = date_fns.endOfYear(dateFin);
                break;
            default:
                dateDebut = date_fns.startOfMonth(dateFin);
                dateFin = date_fns.endOfMonth(dateFin);
        }
    }
    const solde = await serviceCalculs.calculerSolde(req.utilisateurId);
    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, dateDebut, dateFin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, dateDebut, dateFin);
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId, dateDebut, dateFin);
    const repartition = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId, dateDebut, dateFin);
    const repartitionRevenus = await serviceCalculs.obtenirRepartitionRevenus(req.utilisateurId, dateDebut, dateFin);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId, dateDebut, dateFin, 5);
    const evolution = await serviceCalculs.obtenirEvolutionSolde(req.utilisateurId, dateDebut, dateFin, 'jour');
    res.json({
        succes: true,
        donnees: {
            periode: { dateDebut, dateFin },
            metriques: {
                solde,
                revenus,
                depenses,
                revenusNets: revenus - depenses,
                tauxEpargne
            },
            repartitionDepenses: repartition,
            repartitionRevenus,
            topDepenses,
            evolutionSolde: evolution
        }
    });
});
DashboardController.tendancesMensuelles = gestionErreurs.asyncHandler(async (req, res) => {
    const nbMois = Math.min(12, Math.max(3, parseInt(req.query.nbMois || '6', 10) || 6));
    const fin = new Date();
    const tendances = [];
    for (let i = nbMois - 1; i >= 0; i--) {
        const dateRef = date_fns.subMonths(fin, i);
        const debut = date_fns.startOfMonth(dateRef);
        const finMois = date_fns.endOfMonth(dateRef);
        const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId, debut, finMois);
        const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId, debut, finMois);
        tendances.push({
            mois: date_fns.format(dateRef, 'yyyy-MM'),
            label: date_fns.format(dateRef, 'MMM yyyy'),
            revenus,
            depenses
        });
    }
    res.json({
        succes: true,
        donnees: { tendances }
    });
});
module.exports = { DashboardController };
