import { Response } from 'express';
import { ServiceAgentIA } from '../services/agentIA';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import { Transaction } from '../models/Transaction';
import { Budget } from '../models/Budget';
import { Objectif } from '../models/Objectif';
import { Utilisateur } from '../models/Utilisateur';
import { asyncHandler } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const serviceAgentIA = new ServiceAgentIA();
const serviceCalculs = new ServiceCalculsFinanciers();

export class ConseilsController {

//conseils et insights financiers
  static obtenirInsights = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const utilisateur = await Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
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

Revenus ce mois: ${revenusMois} ${utilisateur.devise}
Dépenses ce mois: ${depensesMois} ${utilisateur.devise}
Revenus mois précédent: ${revenusPrecedents} ${utilisateur.devise}
Dépenses mois précédent: ${depensesPrecedentes} ${utilisateur.devise}

Top catégories de dépenses:
${repartition.slice(0, 5).map((r: any) => `- ${r.categorie}: ${r.montant} ${utilisateur.devise} (${r.pourcentage.toFixed(2)}%)`).join('\n')}

Budgets actifs: ${budgets.length}
Objectifs actifs: ${objectifs.length}

Génère des insights sur:
1. Tendances des dépenses
2. Opportunités d'économies
3. Comparaison avec le mois précédent
4. Recommandations pour améliorer l'épargne
5. Alertes sur dépenses inhabituelles
`;

    const resultat = await serviceAgentIA.traiterMessage(req.utilisateurId!, promptInsights);

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

    const utilisateur = await Utilisateur.findById(req.utilisateurId);

    const prompt = `
Analyse les dépenses suivantes et génère des recommandations concrètes pour réduire les dépenses:

Total dépenses: ${depenses} ${utilisateur?.devise || 'MAD'}

Répartition par catégorie:
${repartition.map((r: any) => `- ${r.categorie}: ${r.montant} ${utilisateur?.devise || 'MAD'} (${r.pourcentage.toFixed(2)}%)`).join('\n')}

Top dépenses:
${topDepenses.map((t: any, i: number) => `${i + 1}. ${t.description}: ${t.montant} ${utilisateur?.devise || 'MAD'}`).join('\n')}

Génère 5-7 recommandations actionnables et spécifiques pour réduire les dépenses.
`;

    const resultat = await serviceAgentIA.traiterMessage(req.utilisateurId!, prompt);

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

    const utilisateur = await Utilisateur.findById(req.utilisateurId);

    const prompt = `
Analyse la situation d'épargne suivante et génère des recommandations pour optimiser l'épargne:

Revenus mensuels: ${revenus} ${utilisateur?.devise || 'MAD'}
Dépenses mensuelles: ${depenses} ${utilisateur?.devise || 'MAD'}
Épargne mensuelle: ${revenus - depenses} ${utilisateur?.devise || 'MAD'}
Taux d'épargne actuel: ${tauxEpargne.toFixed(2)}%

Objectifs d'épargne actifs: ${objectifs.length}
${objectifs.map((o: any) => `- ${o.nom}: ${o.montantActuel}/${o.montantCible} ${utilisateur?.devise || 'MAD'}`).join('\n')}

Génère des recommandations pour:
1. Augmenter le taux d'épargne
2. Atteindre les objectifs plus rapidement
3. Optimiser la répartition de l'épargne
4. Créer de nouveaux objectifs si nécessaire
`;

    const resultat = await serviceAgentIA.traiterMessage(req.utilisateurId!, prompt);

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
    const maintenant = new Date();
    const debutMois = startOfMonth(maintenant);
    const finMois = endOfMonth(maintenant);
    const moisPrecedent = subMonths(maintenant, 1);

    const depensesMois = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      type: 'depense',
      date: { $gte: debutMois, $lte: finMois }
    });

    const depensesPrecedentes = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      type: 'depense',
      date: {
        $gte: startOfMonth(moisPrecedent),
        $lte: endOfMonth(moisPrecedent)
      }
    });

    const moyenneParCategorie: { [key: string]: number } = {};
    depensesPrecedentes.forEach(t => {
      moyenneParCategorie[t.categorie] = (moyenneParCategorie[t.categorie] || 0) + t.montant;
    });

    const depensesInhabituelles: any[] = [];
    depensesMois.forEach(t => {
      const moyenne = moyenneParCategorie[t.categorie] || 0;
      if (t.montant > moyenne * 1.5 && moyenne > 0) {
        depensesInhabituelles.push({
          transaction: t,
          montant: t.montant,
          moyenneMoisPrecedent: moyenne,
          ecart: ((t.montant - moyenne) / moyenne) * 100
        });
      }
    });

    res.json({
      succes: true,
      donnees: {
        depensesInhabituelles: depensesInhabituelles.sort((a, b) => b.ecart - a.ecart),
        nombreAlertes: depensesInhabituelles.length
      }
    });
  });

//conseils de planification financière
  static obtenirConseilsPlanification = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const utilisateur = await Utilisateur.findById(req.utilisateurId);
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

Solde actuel: ${solde} ${utilisateur?.devise || 'MAD'}
Revenus mensuels: ${revenusMois} ${utilisateur?.devise || 'MAD'}
Dépenses mensuelles: ${depensesMois} ${utilisateur?.devise || 'MAD'}
Épargne mensuelle: ${revenusMois - depensesMois} ${utilisateur?.devise || 'MAD'}

Objectifs actifs: ${objectifs.length}
${objectifs.map((o: any) => `- ${o.nom}: ${o.montantCible} ${utilisateur?.devise || 'MAD'} d'ici ${o.dateLimite.toLocaleDateString('fr-FR')}`).join('\n')}

Génère des conseils sur:
1. Planification à court terme (1-3 mois)
2. Planification à moyen terme (3-12 mois)
3. Planification à long terme (1+ an)
4. Gestion des objectifs multiples
5. Création d'un fonds d'urgence
`;

    const resultat = await serviceAgentIA.traiterMessage(req.utilisateurId!, prompt);

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
