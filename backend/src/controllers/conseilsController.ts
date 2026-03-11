import { Response } from 'express';
import { ServiceAgentIA } from '../services/agentIA';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { asyncHandler } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const serviceAgentIA = new ServiceAgentIA();
const serviceCalculs = new ServiceCalculsFinanciers();

export class ConseilsController {

//conseils et insights financiers
  static obtenirInsights = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    if (!req.utilisateurId) {
      throw new Error('Utilisateur non trouvé');
    }

    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);
    const moisPrecedent = subMonths(maintenant, 1);

    const revenusMois = await serviceCalculs.calculerRevenus(req.utilisateurId!, debutMois, finMois);
    const depensesMois = await serviceCalculs.calculerDepenses(req.utilisateurId!, debutMois, finMois);
    const revenusPrecedents = await serviceCalculs.calculerRevenus(
      req.utilisateurId!,
      startOfMonth(moisPrecedent),
      endOfMonth(moisPrecedent)
    );
    const depensesPrecedentes = await serviceCalculs.calculerDepenses(
      req.utilisateurId!,
      startOfMonth(moisPrecedent),
      endOfMonth(moisPrecedent)
    );

    const repartition = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, debutMois, finMois);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId!, debutMois, finMois, 5);

    const budgets = await Budget.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      actif: true
    });

    const objectifs = await Objectif.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      actif: true
    });

    const promptInsights = `
Analyse les finances suivantes et génère des insights personnalisés:

Revenus ce mois: ${revenusMois}
Dépenses ce mois: ${depensesMois}
Revenus mois précédent: ${revenusPrecedents}
Dépenses mois précédent: ${depensesPrecedentes}

Top catégories de dépenses:
${repartition.slice(0, 5).map((r: any) => `- ${r.categorie}: ${r.montant} (${r.pourcentage.toFixed(2)}%)`).join('\n')}

Budgets actifs: ${budgets.length}
Objectifs actifs: ${objectifs.length}

Génère des insights sur:
1. Tendances des dépenses
2. Opportunités d'économies
3. Comparaison avec le mois précédent
4. Recommandations pour améliorer l'épargne
5. Alertes sur dépenses inhabituelles

IMPORTANT: RÉPONDS TOUJOURS EN FRANÇAIS ET UTILISE LE DIRHAM MAROCAIN (MAD ou DH) POUR TOUS LES MONTANTS.
`;

    const resultat = await serviceAgentIA.genererConseils(promptInsights);

    res.json({
      succes: true,
      donnees: {
        insights: resultat.reponse,
        metriques: {
          revenusMois,
          depensesMois,
          epargneMois: revenusMois - depensesMois,
          evolutionRevenus: revenusMois - revenusPrecedents,
          evolutionDepenses: depensesMois - depensesPrecedentes
        },
        repartitionDepenses: repartition,
        topDepenses,
        nombreBudgets: budgets.length,
        nombreObjectifs: objectifs.length
      }
    });
  });

//recommandations pour réduire les dépenses
  static obtenirRecommandationsReductionDepenses = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { periode = 'mois' } = req.query;

    const maintenant = new Date();
    let dateDebut: Date;
    let dateFin: Date = maintenant;

    if (periode === 'mois') {
      dateDebut = startOfMonth(maintenant);
      dateFin = endOfMonth(maintenant);
    } else if (periode === 'trimestre') {
      dateDebut = subMonths(maintenant, 3);
    } else {
      dateDebut = startOfMonth(maintenant);
      dateFin = endOfMonth(maintenant);
    }

    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, dateDebut, dateFin);
    const repartition = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, dateDebut, dateFin);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId!, dateDebut, dateFin, 10);


    const prompt = `
Analyse les dépenses suivantes et génère des recommandations concrètes pour réduire les dépenses:

Total dépenses: ${depenses}

Répartition par catégorie:
${repartition.map((r: any) => `- ${r.categorie}: ${r.montant} (${r.pourcentage.toFixed(2)}%)`).join('\n')}

Top dépenses:
${topDepenses.map((t: any, i: number) => `${i + 1}. ${t.description}: ${t.montant}`).join('\n')}

Génère 5-7 recommandations actionnables et spécifiques pour réduire les dépenses.

IMPORTANT: RÉPONDS TOUJOURS EN FRANÇAIS ET UTILISE LE DIRHAM MAROCAIN (MAD ou DH) POUR TOUS LES MONTANTS.
`;

    const resultat = await serviceAgentIA.genererConseils(prompt);

    res.json({
      succes: true,
      donnees: {
        recommandations: resultat.reponse,
        analyse: {
          totalDepenses: depenses,
          repartition,
          topDepenses
        }
      }
    });
  });

//recommandations pour optimiser l'épargne
  static obtenirRecommandationsOptimisationEpargne = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);

    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debutMois, finMois);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debutMois, finMois);
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debutMois, finMois);

    const objectifs = await Objectif.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      actif: true
    });


    const prompt = `
Analyse la situation d'épargne suivante et génère des recommandations pour optimiser l'épargne:

Revenus mensuels: ${revenus}
Dépenses mensuelles: ${depenses}
Épargne mensuelle: ${revenus - depenses}
Taux d'épargne actuel: ${tauxEpargne.toFixed(2)}%

Objectifs d'épargne actifs: ${objectifs.length}
${objectifs.map((o: any) => `- ${o.nom}: ${o.montantActuel}/${o.montantCible}`).join('\n')}

Génère des recommandations pour:
1. Augmenter le taux d'épargne
2. Atteindre les objectifs plus rapidement
3. Optimiser la répartition de l'épargne
4. Créer de nouveaux objectifs si nécessaire

IMPORTANT: RÉPONDS TOUJOURS EN FRANÇAIS ET UTILISE LE DIRHAM MAROCAIN (MAD ou DH) POUR TOUS LES MONTANTS.
`;

    const resultat = await serviceAgentIA.genererConseils(prompt);

    res.json({
      succes: true,
      donnees: {
        recommandations: resultat.reponse,
        situation: {
          revenus,
          depenses,
          epargne: revenus - depenses,
          tauxEpargne,
          objectifs
        }
      }
    });
  });

//detecter les dépenses inhabituelles
  static detecterDepensesInhabituelles = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const depenses = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      type: 'depense'
    }).sort({ date: -1 });

    const statsParCategorie: { [key: string]: { total: number, count: number } } = {};
    const depensesInhabituelles: any[] = [];

    depenses.forEach(t => {
      if (!statsParCategorie[t.categorie]) {
        statsParCategorie[t.categorie] = { total: 0, count: 0 };
      }
      statsParCategorie[t.categorie].total += t.montant;
      statsParCategorie[t.categorie].count += 1;
    });

    const ilYa30Jours = new Date();
    ilYa30Jours.setDate(ilYa30Jours.getDate() - 30);
    const depensesRecentes = depenses.filter(t => t.date >= ilYa30Jours);

    depensesRecentes.forEach(t => {
      const stats = statsParCategorie[t.categorie];
      if (stats && stats.count > 1) {
         const moyenneHorsCourante = (stats.total - t.montant) / Math.max(1, stats.count - 1);
         
         if (moyenneHorsCourante > 0 && t.montant > moyenneHorsCourante * 1.5 && t.montant > 50) {
            depensesInhabituelles.push({
               transaction: t,
               montant: t.montant,
               moyenneMoisPrecedent: moyenneHorsCourante,
               ecart: ((t.montant - moyenneHorsCourante) / moyenneHorsCourante) * 100
            });
         }
      }
    });

    const alertesTriees = depensesInhabituelles.sort((a, b) => b.ecart - a.ecart).slice(0, 10);

    res.json({
      succes: true,
      donnees: {
        depensesInhabituelles: alertesTriees,
        nombreAlertes: alertesTriees.length
      }
    });
  });

//conseils de planification financière
  static obtenirConseilsPlanification = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const solde = await serviceCalculs.calculerSolde(req.utilisateurId!);
    const objectifs = await Objectif.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      actif: true
    });

    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);
    const revenusMois = await serviceCalculs.calculerRevenus(req.utilisateurId!, debutMois, finMois);
    const depensesMois = await serviceCalculs.calculerDepenses(req.utilisateurId!, debutMois, finMois);

    const prompt = `
Fournis des conseils de planification financière personnalisés basés sur:

Solde actuel: ${solde}
Revenus mensuels: ${revenusMois}
Dépenses mensuelles: ${depensesMois}
Épargne mensuelle: ${revenusMois - depensesMois}

Objectifs actifs: ${objectifs.length}
${objectifs.map((o: any) => `- ${o.nom}: ${o.montantCible} d'ici ${o.dateLimite.toLocaleDateString('fr-FR')}`).join('\n')}

Génère des conseils sur:
1. Planification à court terme (1-3 mois)
2. Planification à moyen terme (3-12 mois)
3. Planification à long terme (1+ an)
4. Gestion des objectifs multiples
5. Création d'un fonds d'urgence

IMPORTANT: RÉPONDS TOUJOURS EN FRANÇAIS ET UTILISE LE DIRHAM MAROCAIN (MAD ou DH) POUR TOUS LES MONTANTS.
`;

    const resultat = await serviceAgentIA.genererConseils(prompt);

    res.json({
      succes: true,
      donnees: {
        conseils: resultat.reponse,
        contexte: {
          solde,
          revenusMois,
          depensesMois,
          epargneMois: revenusMois - depensesMois,
          nombreObjectifs: objectifs.length
        }
      }
    });
  });
}
