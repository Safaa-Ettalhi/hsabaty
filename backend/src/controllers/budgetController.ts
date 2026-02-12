import { Response } from 'express';
import { Budget } from '../models/Budget';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';
import { addMonths, addYears } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();

export class BudgetController {
//creer un budget
  static creer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { nom, montant, categorie, periode } = req.body;

    const dateDebut = new Date();
    let dateFin = new Date();

    if (periode === 'mensuel') {
      dateFin = addMonths(dateDebut, 1);
    } else if (periode === 'trimestriel') {
      dateFin = addMonths(dateDebut, 3);
    } else if (periode === 'annuel') {
      dateFin = addYears(dateDebut, 1);
    }

    const budget = new Budget({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      nom,
      montant,
      categorie,
      periode: periode || 'mensuel',
      dateDebut,
      dateFin
    });

    await budget.save();

    res.status(201).json({
      succes: true,
      message: 'Budget créé avec succès',
      donnees: { budget }
    });
  });

//liste tous les budgets
  static obtenirTous = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { actif } = req.query;

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };

    if (actif !== undefined) {
      filtre.actif = actif === 'true';
    }

    const budgets = await Budget.find(filtre).sort({ dateCreation: -1 });

    const budgetsAvecStats = await Promise.all(
      budgets.map(async (budget) => {
        const stats = await serviceCalculs.calculerStatistiquesBudget(budget._id.toString());
        return {
          ...budget.toObject(),
          statistiques: stats
        };
      })
    );

    res.json({
      succes: true,
      donnees: { budgets: budgetsAvecStats }
    });
  });

//details d'un budget
  static obtenirParId = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const budget = await Budget.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!budget) {
      throw new ErreurApp('Budget non trouvé', 404);
    }

    const statistiques = await serviceCalculs.calculerStatistiquesBudget(budget._id.toString());

    res.json({
      succes: true,
      donnees: {
        budget,
        statistiques
      }
    });
  });

//modifier un budget
  static mettreAJour = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { nom, montant, categorie, periode, actif } = req.body;

    const budget = await Budget.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!budget) {
      throw new ErreurApp('Budget non trouvé', 404);
    }

    if (nom) budget.nom = nom;
    if (montant !== undefined) budget.montant = montant;
    if (categorie !== undefined) budget.categorie = categorie;
    if (periode) budget.periode = periode;
    if (actif !== undefined) budget.actif = actif;

    budget.dateModification = new Date();
    await budget.save();

    res.json({
      succes: true,
      message: 'Budget mis à jour avec succès',
      donnees: { budget }
    });
  });

//supprimer un budget
  static supprimer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!budget) {
      throw new ErreurApp('Budget non trouvé', 404);
    }

    res.json({
      succes: true,
      message: 'Budget supprimé avec succès'
    });
  });
}
