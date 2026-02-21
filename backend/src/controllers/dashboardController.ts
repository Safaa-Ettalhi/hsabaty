import { Response } from 'express';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import { asyncHandler } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();

export class DashboardController {
//metriques du tableau de bord
  static obtenirMetriques = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { periode, dateDebut: dateDebutStr, dateFin: dateFinStr } = req.query as {
      periode?: string;
      dateDebut?: string;
      dateFin?: string;
    };

    let dateDebut: Date;
    let dateFin: Date = new Date();

    if (dateDebutStr && dateFinStr) {
      dateDebut = new Date(dateDebutStr);
      dateFin = new Date(dateFinStr);
      if (isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
        dateDebut = startOfMonth(dateFin);
        dateFin = endOfMonth(dateFin);
      } else if (dateDebut > dateFin) {
        [dateDebut, dateFin] = [dateFin, dateDebut];
      }
    } else {
      switch (periode) {
        case 'mois':
          dateDebut = startOfMonth(dateFin);
          dateFin = endOfMonth(dateFin);
          break;
        case 'trimestre':
          dateDebut = subMonths(dateFin, 3);
          break;
        case 'semestre':
          dateDebut = subMonths(dateFin, 6);
          break;
        case 'annee':
          dateDebut = startOfYear(dateFin);
          dateFin = endOfYear(dateFin);
          break;
        default:
          dateDebut = startOfMonth(dateFin);
          dateFin = endOfMonth(dateFin);
      }
    }

    const solde = await serviceCalculs.calculerSolde(req.utilisateurId!);
    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, dateDebut, dateFin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, dateDebut, dateFin);
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, dateDebut, dateFin);
    const repartition = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, dateDebut, dateFin);
    const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId!, dateDebut, dateFin, 5);
    const evolution = await serviceCalculs.obtenirEvolutionSolde(req.utilisateurId!, dateDebut, dateFin, 'jour');

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
        topDepenses,
        evolutionSolde: evolution
      }
    });
  });
}
