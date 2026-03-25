const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Objectif = require("../models/Objectif");
const mongoose = require("mongoose");
const date_fns = require("date-fns");

function oid(id) {
    return new mongoose.Types.ObjectId(id);
}

function sommeMontants(transactions) {
    return transactions.reduce((sum, t) => sum + (t.montant || 0), 0);
}

function pourcentage(part, total) {
    if (!total)
        return 0;
    return (part / total) * 100;
}

function formatterCategorie(nom) {
    let categorie = nom ? String(nom).trim() : 'Autres';
    if (!categorie)
        categorie = 'Autres';
    return categorie.charAt(0).toUpperCase() + categorie.slice(1).toLowerCase();
}

class ServiceCalculsFinanciers {
    async calculerSolde(utilisateurId) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId)
        });
        return transactions.reduce((total, transaction) => {
            return total + (transaction.type === 'revenu' ? transaction.montant : -transaction.montant);
        }, 0);
    }
    async calculerRevenus(utilisateurId, dateDebut, dateFin) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            type: 'revenu',
            date: { $gte: dateDebut, $lte: dateFin }
        });
        return sommeMontants(transactions);
    }
    async calculerDepenses(utilisateurId, dateDebut, dateFin) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            type: 'depense',
            date: { $gte: dateDebut, $lte: dateFin }
        });
        return sommeMontants(transactions);
    }
    async comparerPeriodesFinancieres(utilisateurId) {
        const maintenant = new Date();
        const debutCourant = date_fns.startOfMonth(maintenant);
        const finCourant = date_fns.endOfMonth(maintenant);
        const debutPrec = date_fns.startOfMonth(date_fns.subMonths(maintenant, 1));
        const finPrec = date_fns.endOfMonth(date_fns.subMonths(maintenant, 1));
        const debutAnDer = date_fns.startOfMonth(date_fns.subYears(maintenant, 1));
        const finAnDer = date_fns.endOfMonth(date_fns.subYears(maintenant, 1));
        const periode = async (debut, fin) => {
            const revenus = await this.calculerRevenus(utilisateurId, debut, fin);
            const depenses = await this.calculerDepenses(utilisateurId, debut, fin);
            const epargne = revenus - depenses;
            return { revenus, depenses, epargne };
        };
        const [courant, moisPrecedent, anneeDerniereMemeMois] = await Promise.all([
            periode(debutCourant, finCourant),
            periode(debutPrec, finPrec),
            periode(debutAnDer, finAnDer)
        ]);
        const pct = (now, prev) => prev === 0 ? (now === 0 ? 0 : 100) : ((now - prev) / prev) * 100;
        return {
            courant: {
                label: date_fns.format(debutCourant, 'MMMM yyyy'),
                ...courant
            },
            moisPrecedent: {
                label: date_fns.format(debutPrec, 'MMMM yyyy'),
                ...moisPrecedent
            },
            anneeDerniereMemeMois: {
                label: date_fns.format(debutAnDer, 'MMMM yyyy'),
                ...anneeDerniereMemeMois
            },
            deltasVsMoisPrecedent: {
                revenusPct: pct(courant.revenus, moisPrecedent.revenus),
                depensesPct: pct(courant.depenses, moisPrecedent.depenses),
                epargneDiff: courant.epargne - moisPrecedent.epargne
            },
            deltasVsAnneeDerniere: {
                revenusPct: pct(courant.revenus, anneeDerniereMemeMois.revenus),
                depensesPct: pct(courant.depenses, anneeDerniereMemeMois.depenses),
                epargneDiff: courant.epargne - anneeDerniereMemeMois.epargne
            }
        };
    }
    async calculerTauxEpargne(utilisateurId, dateDebut, dateFin) {
        const revenus = await this.calculerRevenus(utilisateurId, dateDebut, dateFin);
        const depenses = await this.calculerDepenses(utilisateurId, dateDebut, dateFin);
        if (revenus === 0)
            return 0;
        return ((revenus - depenses) / revenus) * 100;
    }
    async obtenirRepartitionDepenses(utilisateurId, dateDebut, dateFin) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            type: 'depense',
            date: { $gte: dateDebut, $lte: dateFin }
        });
        const totalDepenses = sommeMontants(transactions);
        const parCategorie = transactions.reduce((acc, transaction) => {
            const categorie = transaction.categorie;
            if (!acc[categorie]) {
                acc[categorie] = 0;
            }
            acc[categorie] += transaction.montant;
            return acc;
        }, {});
        return Object.entries(parCategorie)
            .map(([categorie, montant]) => ({
            categorie,
            montant,
            pourcentage: pourcentage(montant, totalDepenses)
        }))
            .sort((a, b) => b.montant - a.montant);
    }
    async obtenirRepartitionRevenus(utilisateurId, dateDebut, dateFin) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            type: 'revenu',
            date: { $gte: dateDebut, $lte: dateFin }
        });
        const totalRevenus = sommeMontants(transactions);
        const parCategorie = transactions.reduce((acc, transaction) => {
            const categorie = formatterCategorie(transaction.categorie);
            if (!acc[categorie]) {
                acc[categorie] = 0;
            }
            acc[categorie] += transaction.montant;
            return acc;
        }, {});
        return Object.entries(parCategorie)
            .map(([categorie, montant]) => ({
            categorie,
            montant,
            pourcentage: pourcentage(montant, totalRevenus)
        }))
            .sort((a, b) => b.montant - a.montant);
    }
    async obtenirTopDepenses(utilisateurId, dateDebut, dateFin, limite = 5) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            type: 'depense',
            date: { $gte: dateDebut, $lte: dateFin }
        })
            .sort({ montant: -1 })
            .limit(limite);
        return transactions.map(t => ({
            description: t.description,
            montant: t.montant,
            categorie: t.categorie,
            date: t.date
        }));
    }
    async obtenirEvolutionSolde(utilisateurId, dateDebut, dateFin, granularite = 'jour') {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: oid(utilisateurId),
            date: { $gte: dateDebut, $lte: dateFin }
        }).sort({ date: 1 });
        const evolution = {};
        let soldeCumule = 0;
        transactions.forEach(transaction => {
            let cleDate;
            const date = new Date(transaction.date);
            if (granularite === 'jour') {
                cleDate = date_fns.format(date, 'yyyy-MM-dd');
            }
            else if (granularite === 'semaine') {
                cleDate = date_fns.format(date, 'yyyy-ww');
            }
            else {
                cleDate = date_fns.format(date, 'yyyy-MM');
            }
            if (!evolution[cleDate]) {
                evolution[cleDate] = 0;
            }
            soldeCumule += transaction.type === 'revenu' ? transaction.montant : -transaction.montant;
            evolution[cleDate] = soldeCumule;
        });
        return Object.entries(evolution)
            .map(([date, solde]) => ({ date, solde }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    async calculerStatistiquesBudget(budgetId) {
        const budget = await Budget.Budget.findById(budgetId);
        if (!budget) {
            throw new Error('Budget non trouvé');
        }
        const transactions = await Transaction.Transaction.find({
            utilisateurId: budget.utilisateurId,
            type: 'depense',
            date: { $gte: budget.dateDebut, $lte: budget.dateFin },
            ...(budget.categorie && { categorie: { $regex: new RegExp('^' + budget.categorie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } })
        });
        const montantUtilise = transactions.reduce((sum, t) => sum + t.montant, 0);
        const montantRestant = Math.max(0, budget.montant - montantUtilise);
        const pourcentageUtilise = budget.montant > 0 ? (montantUtilise / budget.montant) * 100 : 0;
        let statut = 'ok';
        if (pourcentageUtilise >= 100) {
            statut = 'depasse';
        }
        else if (pourcentageUtilise >= 80) {
            statut = 'attention';
        }
        const maintenant = new Date();
        const debut = new Date(budget.dateDebut);
        const fin = new Date(budget.dateFin);
        debut.setHours(0, 0, 0, 0);
        fin.setHours(23, 59, 59, 999);
        const now = new Date(maintenant);
        now.setHours(12, 0, 0, 0);
        const joursTotal = Math.max(1, date_fns.differenceInCalendarDays(fin, debut) + 1);
        let prevision = null;
        if (now > fin) {
            prevision = null;
        }
        else {
            let joursEcoules = 1;
            if (now >= debut) {
                joursEcoules = date_fns.differenceInCalendarDays(now, debut) + 1;
                joursEcoules = Math.min(joursTotal, Math.max(1, joursEcoules));
            }
            const joursRestants = now > fin ? 0 : Math.max(0, date_fns.differenceInCalendarDays(fin, now));
            const rythmeActuelJournalier = montantUtilise / joursEcoules;
            const projectedMontantFinPeriode = Math.round(rythmeActuelJournalier * joursTotal * 100) / 100;
            const projectedPourcentageFin = budget.montant > 0 ? (projectedMontantFinPeriode / budget.montant) * 100 : 0;
            const risqueDepassement = projectedMontantFinPeriode > budget.montant && budget.montant > 0;
            let montantJournalierMaxPourTenir = null;
            if (joursRestants > 0 && montantRestant > 0) {
                montantJournalierMaxPourTenir = Math.round((montantRestant / joursRestants) * 100) / 100;
            }
            else if (joursRestants > 0 && montantRestant <= 0) {
                montantJournalierMaxPourTenir = 0;
            }
            let messageCle;
            if (now < debut) {
                messageCle = 'La période budgétaire n’a pas encore commencé.';
            }
            else if (risqueDepassement) {
                const depassement = projectedMontantFinPeriode - budget.montant;
                messageCle = `Au rythme actuel, fin de période estimée à ${projectedMontantFinPeriode.toFixed(0)} MAD (dépassement ~${depassement.toFixed(0)} MAD).`;
            }
            else if (montantJournalierMaxPourTenir != null && montantJournalierMaxPourTenir > 0) {
                messageCle = `Pour tenir le plafond : max ${montantJournalierMaxPourTenir.toFixed(0)} MAD/jour encore ${joursRestants} jour(s).`;
            }
            else if (pourcentageUtilise >= 100) {
                messageCle = 'Plafond déjà atteint.';
            }
            else if (montantUtilise === 0 && now >= debut) {
                messageCle =
                    montantJournalierMaxPourTenir != null && montantJournalierMaxPourTenir > 0
                        ? `Aucune dépense enregistrée — pour tenir le plafond : max ${montantJournalierMaxPourTenir.toFixed(0)} MAD/jour sur ${joursRestants} jour(s) restant(s).`
                        : 'Aucune dépense enregistrée sur la période pour l’instant.';
            }
            else {
                messageCle = `Projection fin de période : ~${projectedMontantFinPeriode.toFixed(0)} MAD (${projectedPourcentageFin.toFixed(0)} % du plafond).`;
            }
            prevision = {
                joursTotal,
                joursEcoules: Math.min(joursTotal, joursEcoules),
                joursRestants,
                rythmeActuelJournalier: Math.round(rythmeActuelJournalier * 100) / 100,
                projectedMontantFinPeriode,
                projectedPourcentageFin: Math.round(projectedPourcentageFin * 10) / 10,
                risqueDepassement,
                montantJournalierMaxPourTenir,
                messageCle
            };
        }
        return {
            montantUtilise,
            montantRestant,
            pourcentageUtilise,
            statut,
            prevision
        };
    }
    //calculer la progression d'un objectif
    async calculerProgressionObjectif(objectifId) {
        const objectif = await Objectif.Objectif.findById(objectifId);
        if (!objectif) {
            throw new Error('Objectif non trouvé');
        }
        const maintenant = new Date();
        const moisRestants = Math.max(1, Math.ceil((objectif.dateLimite.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        const montantRestant = Math.max(0, objectif.montantCible - objectif.montantActuel);
        const pourcentageComplete = objectif.montantCible > 0
            ? (objectif.montantActuel / objectif.montantCible) * 100
            : 0;
        const montantMensuelRequis = montantRestant / moisRestants;
        return {
            montantRestant,
            pourcentageComplete,
            montantMensuelRequis
        };
    }
    async genererFluxTresorerie(utilisateurId, dateDebut, dateFin) {
        const transactions = await Transaction.Transaction.find({
            utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
            date: { $gte: dateDebut, $lte: dateFin }
        });
        const revenus = transactions.filter(t => t.type === 'revenu');
        const sources = revenus.reduce((acc, t) => {
            const categorie = t.categorie || 'Autres revenus';
            if (!acc[categorie]) {
                acc[categorie] = 0;
            }
            acc[categorie] += t.montant;
            return acc;
        }, {});
        const depenses = transactions.filter(t => t.type === 'depense');
        const categories = depenses.reduce((acc, t) => {
            const categorie = t.categorie || 'Autres';
            if (!acc[categorie]) {
                acc[categorie] = 0;
            }
            acc[categorie] += t.montant;
            return acc;
        }, {});
        const totalRevenus = Object.values(sources).reduce((sum, val) => sum + val, 0);
        const totalDepenses = Object.values(categories).reduce((sum, val) => sum + val, 0);
        const epargne = totalRevenus - totalDepenses;
        const epargnePositive = Math.max(0, epargne);
        const sourcesArr = Object.entries(sources).map(([nom, montant]) => ({ nom, montant }));
        const categoriesArr = Object.entries(categories).map(([nom, montant]) => ({ nom, montant }));
        const sankey = this.construireSankeyFlux(sourcesArr, categoriesArr, epargnePositive, totalRevenus, totalDepenses);
        return {
            sources: sourcesArr,
            categories: categoriesArr,
            epargne: epargnePositive,
            sankey
        };
    }
    construireSankeyFlux(sources, categories, epargne, totalRevenus, totalDepenses) {
        const nodes = [];
        const links = [];
        const nodeIds = new Set();
        const addNode = (id, name) => {
            if (nodeIds.has(id))
                return;
            nodeIds.add(id);
            nodes.push({ id, name });
        };
        const HUB_ID = 'hub-flux';
        if (totalRevenus <= 0 && totalDepenses <= 0) {
            return { nodes, links };
        }
        if (totalRevenus <= 0 && totalDepenses > 0) {
            addNode('source-deficit', 'Sorties (période)');
            categories
                .filter((c) => c.montant > 0)
                .forEach((c) => {
                const id = `dep-${this.slugSankey(c.nom)}`;
                addNode(id, c.nom);
                links.push({ source: 'source-deficit', target: id, value: c.montant });
            });
            return { nodes, links };
        }
        addNode(HUB_ID, 'Flux');
        sources
            .filter((s) => s.montant > 0)
            .forEach((s) => {
            const id = `rev-${this.slugSankey(s.nom)}`;
            addNode(id, s.nom);
            links.push({ source: id, target: HUB_ID, value: s.montant });
        });
        categories
            .filter((c) => c.montant > 0)
            .forEach((c) => {
            const id = `dep-${this.slugSankey(c.nom)}`;
            addNode(id, c.nom);
            links.push({ source: HUB_ID, target: id, value: c.montant });
        });
        if (epargne > 0) {
            addNode('epargne', 'Épargne');
            links.push({ source: HUB_ID, target: 'epargne', value: epargne });
        }
        const entrant = links.filter((l) => l.target === HUB_ID).reduce((s, l) => s + l.value, 0);
        const sortant = links.filter((l) => l.source === HUB_ID).reduce((s, l) => s + l.value, 0);
        if (entrant > 0 && sortant > 0 && Math.abs(entrant - sortant) > 0.01) {
            for (let i = links.length - 1; i >= 0; i--) {
                if (links[i].source === HUB_ID) {
                    links[i].value = Math.max(0, links[i].value + (entrant - sortant));
                    break;
                }
            }
        }
        return { nodes, links };
    }
    slugSankey(nom) {
        return String(nom)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 40) || 'x';
    }
}
exports.ServiceCalculsFinanciers = ServiceCalculsFinanciers;
