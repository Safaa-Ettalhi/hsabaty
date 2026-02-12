import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import mongoose from 'mongoose';
import { format } from 'date-fns';

export class ServiceCalculsFinanciers {
//calculer le solde total d'un utilisateur
  async calculerSolde(utilisateurId: string): Promise<number> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId)
    });

    return transactions.reduce((total, transaction) => {
      return total + (transaction.type === 'revenu' ? transaction.montant : -transaction.montant);
    }, 0);
  }

//calculer les revenus totaux sur une période
  async calculerRevenus(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<number> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      type: 'revenu',
      date: { $gte: dateDebut, $lte: dateFin }
    });

    return transactions.reduce((total, transaction) => total + transaction.montant, 0);
  }

//calculer les dépenses totales sur une période
  async calculerDepenses(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<number> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      type: 'depense',
      date: { $gte: dateDebut, $lte: dateFin }
    });

    return transactions.reduce((total, transaction) => total + transaction.montant, 0);
  }

//calculer le taux d'épargne
  async calculerTauxEpargne(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<number> {
    const revenus = await this.calculerRevenus(utilisateurId, dateDebut, dateFin);
    const depenses = await this.calculerDepenses(utilisateurId, dateDebut, dateFin);

    if (revenus === 0) return 0;

    return ((revenus - depenses) / revenus) * 100;
  }

 //obtenir la répartition des dépenses par catégorie
  async obtenirRepartitionDepenses(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<Array<{ categorie: string; montant: number; pourcentage: number }>> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      type: 'depense',
      date: { $gte: dateDebut, $lte: dateFin }
    });

    const totalDepenses = transactions.reduce((sum, t) => sum + t.montant, 0);

    const parCategorie = transactions.reduce((acc: any, transaction) => {
      const categorie = transaction.categorie;
      if (!acc[categorie]) {
        acc[categorie] = 0;
      }
      acc[categorie] += transaction.montant;
      return acc;
    }, {});

    return Object.entries(parCategorie)
      .map(([categorie, montant]: [string, any]) => ({
        categorie,
        montant,
        pourcentage: totalDepenses > 0 ? (montant / totalDepenses) * 100 : 0
      }))
      .sort((a, b) => b.montant - a.montant);
  }

//obtenir les top dépenses
  async obtenirTopDepenses(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date,
    limite: number = 5
  ): Promise<Array<{ description: string; montant: number; categorie: string; date: Date }>> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
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

//obtenir l'évolution du solde sur une période
  async obtenirEvolutionSolde(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date,
    granularite: 'jour' | 'semaine' | 'mois' = 'jour'
  ): Promise<Array<{ date: string; solde: number }>> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      date: { $gte: dateDebut, $lte: dateFin }
    }).sort({ date: 1 });

    const evolution: { [key: string]: number } = {};
    let soldeCumule = 0;

    transactions.forEach(transaction => {
      let cleDate: string;
      const date = new Date(transaction.date);

      if (granularite === 'jour') {
        cleDate = format(date, 'yyyy-MM-dd');
      } else if (granularite === 'semaine') {
        cleDate = format(date, 'yyyy-ww');
      } else {
        cleDate = format(date, 'yyyy-MM');
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

//calculer les statistiques d'un budget
  async calculerStatistiquesBudget(budgetId: string): Promise<{
    montantUtilise: number;
    montantRestant: number;
    pourcentageUtilise: number;
    statut: 'ok' | 'attention' | 'depasse';
  }> {
    const budget = await Budget.findById(budgetId);
    if (!budget) {
      throw new Error('Budget non trouvé');
    }

    const transactions = await Transaction.find({
      utilisateurId: budget.utilisateurId,
      type: 'depense',
      date: { $gte: budget.dateDebut, $lte: budget.dateFin },
      ...(budget.categorie && { categorie: budget.categorie })
    });

    const montantUtilise = transactions.reduce((sum, t) => sum + t.montant, 0);
    const montantRestant = Math.max(0, budget.montant - montantUtilise);
    const pourcentageUtilise = budget.montant > 0 ? (montantUtilise / budget.montant) * 100 : 0;

    let statut: 'ok' | 'attention' | 'depasse' = 'ok';
    if (pourcentageUtilise >= 100) {
      statut = 'depasse';
    } else if (pourcentageUtilise >= 80) {
      statut = 'attention';
    }

    return {
      montantUtilise,
      montantRestant,
      pourcentageUtilise,
      statut
    };
  }

//calculer la progression d'un objectif
  async calculerProgressionObjectif(objectifId: string): Promise<{
    montantRestant: number;
    pourcentageComplete: number;
    montantMensuelRequis: number;
  }> {
    const objectif = await Objectif.findById(objectifId);
    if (!objectif) {
      throw new Error('Objectif non trouvé');
    }

    const maintenant = new Date();
    const moisRestants = Math.max(1, Math.ceil(
      (objectif.dateLimite.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24 * 30)
    ));

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

//générer les données pour le flux de trésorerie
  async genererFluxTresorerie(
    utilisateurId: string,
    dateDebut: Date,
    dateFin: Date
  ): Promise<{
    sources: Array<{ nom: string; montant: number }>;
    categories: Array<{ nom: string; montant: number }>;
    epargne: number;
  }> {
    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(utilisateurId),
      date: { $gte: dateDebut, $lte: dateFin }
    });

    const revenus = transactions.filter(t => t.type === 'revenu');
    const sources = revenus.reduce((acc: any, t) => {
      const categorie = t.categorie || 'Autres revenus';
      if (!acc[categorie]) {
        acc[categorie] = 0;
      }
      acc[categorie] += t.montant;
      return acc;
    }, {});

    const depenses = transactions.filter(t => t.type === 'depense');
    const categories = depenses.reduce((acc: any, t) => {
      const categorie = t.categorie || 'Autres';
      if (!acc[categorie]) {
        acc[categorie] = 0;
      }
      acc[categorie] += t.montant;
      return acc;
    }, {});

    const totalRevenus = Object.values(sources).reduce((sum: number, val: any) => sum + val, 0);
    const totalDepenses = Object.values(categories).reduce((sum: number, val: any) => sum + val, 0);
    const epargne = totalRevenus - totalDepenses;

    return {
      sources: Object.entries(sources).map(([nom, montant]: [string, any]) => ({ nom, montant })),
      categories: Object.entries(categories).map(([nom, montant]: [string, any]) => ({ nom, montant })),
      epargne: Math.max(0, epargne)
    };
  }
}
