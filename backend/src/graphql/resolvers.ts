import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { Investissement } from '../models/Investissement';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();

function toGqlTransaction(t: { _id: any; montant: number; type: string; categorie: string; description: string; date: Date }) {
  return {
    id: t._id?.toString(),
    montant: t.montant,
    type: t.type,
    categorie: t.categorie,
    description: t.description,
    date: t.date?.toISOString?.()
  };
}

function toGqlBudget(b: { _id: any; nom: string; montant: number; categorie?: string; periode: string; actif: boolean }) {
  return {
    id: b._id?.toString(),
    nom: b.nom,
    montant: b.montant,
    categorie: b.categorie,
    periode: b.periode,
    actif: b.actif
  };
}

function toGqlObjectif(o: { _id: any; nom: string; montantCible: number; montantActuel: number; dateLimite: Date; type: string; actif: boolean }) {
  return {
    id: o._id?.toString(),
    nom: o.nom,
    montantCible: o.montantCible,
    montantActuel: o.montantActuel,
    dateLimite: o.dateLimite?.toISOString?.(),
    type: o.type,
    actif: o.actif
  };
}

function toGqlInvestissement(i: { _id: any; nom: string; type: string; montantInvesti: number; valeurActuelle?: number; rendementPourcentage?: number; dateAchat: Date; actif: boolean }) {
  return {
    id: i._id?.toString(),
    nom: i.nom,
    type: i.type,
    montantInvesti: i.montantInvesti,
    valeurActuelle: i.valeurActuelle,
    rendementPourcentage: i.rendementPourcentage,
    dateAchat: i.dateAchat?.toISOString?.(),
    actif: i.actif
  };
}

export interface GraphQLContext {
  utilisateurId: string;
}

export function createRoot(ctx: GraphQLContext) {
  const uid = new mongoose.Types.ObjectId(ctx.utilisateurId);
  return {
    async dashboard(_: unknown, args: { periode?: string }) {
      const periode = args.periode || 'mois';
      let dateDebut: Date;
      let dateFin: Date = new Date();
      if (periode === 'trimestre') {
        dateDebut = subMonths(dateFin, 3);
      } else if (periode === 'annee') {
        dateDebut = startOfYear(dateFin);
        dateFin = endOfYear(dateFin);
      } else {
        dateDebut = startOfMonth(dateFin);
        dateFin = endOfMonth(dateFin);
      }
      const solde = await serviceCalculs.calculerSolde(ctx.utilisateurId);
      const revenus = await serviceCalculs.calculerRevenus(ctx.utilisateurId, dateDebut, dateFin);
      const depenses = await serviceCalculs.calculerDepenses(ctx.utilisateurId, dateDebut, dateFin);
      const tauxEpargne = await serviceCalculs.calculerTauxEpargne(ctx.utilisateurId, dateDebut, dateFin);
      return {
        periode: { dateDebut: dateDebut.toISOString(), dateFin: dateFin.toISOString() },
        metriques: {
          solde,
          revenus,
          depenses,
          revenusNets: revenus - depenses,
          tauxEpargne
        }
      };
    },

    async transactions(_: unknown, args: { limite?: number; type?: string }) {
      const filtre: Record<string, unknown> = { utilisateurId: uid };
      if (args.type) filtre.type = args.type;
      const list = await Transaction.find(filtre)
        .sort({ date: -1 })
        .limit(args.limite || 50);
      return list.map(toGqlTransaction);
    },

    async budgets() {
      const list = await Budget.find({ utilisateurId: uid, actif: true });
      return list.map(toGqlBudget);
    },

    async objectifs() {
      const list = await Objectif.find({ utilisateurId: uid, actif: true });
      return list.map(toGqlObjectif);
    },

    async investissements() {
      const list = await Investissement.find({ utilisateurId: uid, actif: true }).sort({ dateAchat: -1 });
      return list.map(toGqlInvestissement);
    },

    async resumeInvestissements() {
      const list = await Investissement.find({ utilisateurId: uid, actif: true });
      const totalInvesti = list.reduce((s, i) => s + i.montantInvesti, 0);
      const totalValeur = list.reduce((s, i) => s + (i.valeurActuelle ?? i.montantInvesti), 0);
      const rendementTotal = totalInvesti > 0 ? ((totalValeur - totalInvesti) / totalInvesti) * 100 : 0;
      return { totalInvesti, totalValeur, rendementTotal: Math.round(rendementTotal * 100) / 100 };
    },

    async creerTransaction(_: unknown, args: { input: { montant: number; type: string; categorie: string; description: string; date?: string } }) {
      const { montant, type, categorie, description, date } = args.input;
      const t = new Transaction({
        utilisateurId: uid,
        montant,
        type: type as 'revenu' | 'depense',
        categorie,
        description,
        date: date ? new Date(date) : new Date()
      });
      await t.save();
      return toGqlTransaction(t);
    }
  };
}
