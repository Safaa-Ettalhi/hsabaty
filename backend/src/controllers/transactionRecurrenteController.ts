import { Response } from 'express';
import { TransactionRecurrente } from '../models/TransactionRecurrente';
import { Transaction } from '../models/Transaction';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';
import { addDays, addMonths, addYears, addWeeks } from 'date-fns';

export class TransactionRecurrenteController {
//creer une transaction recurrente
  static creer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const {
      montant,
      type,
      categorie,
      sousCategorie,
      description,
      frequence,
      jourDuMois,
      jourDeLaSemaine
    } = req.body;

    let prochaineDate = new Date();

    if (frequence === 'hebdomadaire') {
      prochaineDate = addWeeks(prochaineDate, 1);
      if (jourDeLaSemaine !== undefined) {
        const joursJusquAuJour = (jourDeLaSemaine - prochaineDate.getDay() + 7) % 7;
        prochaineDate = addDays(prochaineDate, joursJusquAuJour);
      }
    } else if (frequence === 'mensuel') {
      prochaineDate = addMonths(prochaineDate, 1);
      if (jourDuMois !== undefined) {
        prochaineDate.setDate(jourDuMois);
      }
    } else if (frequence === 'trimestriel') {
      prochaineDate = addMonths(prochaineDate, 3);
      if (jourDuMois !== undefined) {
        prochaineDate.setDate(jourDuMois);
      }
    } else if (frequence === 'annuel') {
      prochaineDate = addYears(prochaineDate, 1);
    }

    const transactionRecurrente = new TransactionRecurrente({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      montant,
      type,
      categorie,
      sousCategorie,
      description,
      frequence,
      jourDuMois,
      jourDeLaSemaine,
      prochaineDate
    });

    await transactionRecurrente.save();

    res.status(201).json({
      succes: true,
      message: 'Transaction récurrente créée avec succès',
      donnees: { transactionRecurrente }
    });
  });

//liste toutes les transactions recurrentes
  static obtenirToutes = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { actif } = req.query;

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };

    if (actif !== undefined) {
      filtre.actif = actif === 'true';
    }

    const transactionsRecurrentes = await TransactionRecurrente.find(filtre)
      .sort({ prochaineDate: 1 });

    // Calculer le total mensuel/annuel
    const totalMensuel = transactionsRecurrentes
      .filter(tr => tr.actif)
      .reduce((sum, tr) => {
        let facteur = 0;
        if (tr.frequence === 'hebdomadaire') facteur = 4.33;
        else if (tr.frequence === 'mensuel') facteur = 1;
        else if (tr.frequence === 'trimestriel') facteur = 1 / 3;
        else if (tr.frequence === 'annuel') facteur = 1 / 12;

        return sum + (tr.type === 'depense' ? tr.montant * facteur : -tr.montant * facteur);
      }, 0);

    res.json({
      succes: true,
      donnees: {
        transactionsRecurrentes,
        totalMensuel: Math.abs(totalMensuel)
      }
    });
  });

//details d'une transaction recurrente
  static obtenirParId = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const transactionRecurrente = await TransactionRecurrente.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transactionRecurrente) {
      throw new ErreurApp('Transaction récurrente non trouvée', 404);
    }

    res.json({
      succes: true,
      donnees: { transactionRecurrente }
    });
  });

//modifier une transaction recurrente
  static mettreAJour = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const {
      montant,
      type,
      categorie,
      sousCategorie,
      description,
      frequence,
      jourDuMois,
      jourDeLaSemaine,
      actif
    } = req.body;

    const transactionRecurrente = await TransactionRecurrente.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transactionRecurrente) {
      throw new ErreurApp('Transaction récurrente non trouvée', 404);
    }

    if (montant !== undefined) transactionRecurrente.montant = montant;
    if (type) transactionRecurrente.type = type;
    if (categorie) transactionRecurrente.categorie = categorie;
    if (sousCategorie !== undefined) transactionRecurrente.sousCategorie = sousCategorie;
    if (description) transactionRecurrente.description = description;
    if (frequence) transactionRecurrente.frequence = frequence;
    if (jourDuMois !== undefined) transactionRecurrente.jourDuMois = jourDuMois;
    if (jourDeLaSemaine !== undefined) transactionRecurrente.jourDeLaSemaine = jourDeLaSemaine;
    if (actif !== undefined) transactionRecurrente.actif = actif;

    transactionRecurrente.dateModification = new Date();
    await transactionRecurrente.save();

    res.json({
      succes: true,
      message: 'Transaction récurrente mise à jour avec succès',
      donnees: { transactionRecurrente }
    });
  });

//supprimer une transaction recurrente
  static supprimer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const transactionRecurrente = await TransactionRecurrente.findOneAndDelete({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transactionRecurrente) {
      throw new ErreurApp('Transaction récurrente non trouvée', 404);
    }

    res.json({
      succes: true,
      message: 'Transaction récurrente supprimée avec succès'
    });
  });

//generer automatiquement les transactions à partir des récurrentes
  static genererTransactions = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const maintenant = new Date();
    const transactionsRecurrentes = await TransactionRecurrente.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      actif: true,
      prochaineDate: { $lte: maintenant }
    });

    const transactionsCreees = [];

    for (const tr of transactionsRecurrentes) {
      const transaction = new Transaction({
        utilisateurId: tr.utilisateurId,
        montant: tr.montant,
        type: tr.type,
        categorie: tr.categorie,
        sousCategorie: tr.sousCategorie,
        description: tr.description,
        date: tr.prochaineDate,
        estRecurrente: true,
        transactionRecurrenteId: tr._id
      });

      await transaction.save();
      transactionsCreees.push(transaction);

      if (tr.frequence === 'hebdomadaire') {
        tr.prochaineDate = addWeeks(tr.prochaineDate, 1);
      } else if (tr.frequence === 'mensuel') {
        tr.prochaineDate = addMonths(tr.prochaineDate, 1);
      } else if (tr.frequence === 'trimestriel') {
        tr.prochaineDate = addMonths(tr.prochaineDate, 3);
      } else if (tr.frequence === 'annuel') {
        tr.prochaineDate = addYears(tr.prochaineDate, 1);
      }

      await tr.save();
    }

    res.json({
      succes: true,
      message: `${transactionsCreees.length} transaction(s) générée(s)`,
      donnees: { transactions: transactionsCreees }
    });
  });
}
