import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import { ExportService } from '../services/exportService';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subDays } from 'date-fns';

export class TransactionController {
//creer une transaction
  static creer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    if (!req.utilisateurId) {
      throw new ErreurApp(
        'Token utilisateur requis. Connectez-vous via Auth > Connexion (pas Admin).',
        403
      );
    }

    const { montant, type, categorie, sousCategorie, description, date, tags } = req.body;

    const transaction = new Transaction({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      montant,
      type,
      categorie,
      sousCategorie,
      description,
      date: date ? new Date(date) : new Date(),
      tags: tags || []
    });

    await transaction.save();

    res.status(201).json({
      succes: true,
      message: 'Transaction créée avec succès',
      donnees: { transaction }
    });
  });

//liste toutes les transactions avec filtres
  static obtenirToutes = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    if (!req.utilisateurId) {
      throw new ErreurApp(
        'Token utilisateur requis pour cette ressource. Utilisez le token reçu lors de la connexion (Auth > Connexion), pas le token admin.',
        403
      );
    }

    const { page, limite, type, categorie, dateDebut, dateFin, recherche, sort, order } = req.query as any;

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };

    if (type) filtre.type = type;
    if (categorie) filtre.categorie = categorie;
    if (dateDebut || dateFin) {
      filtre.date = {};
      if (dateDebut) filtre.date.$gte = new Date(dateDebut);
      if (dateFin) filtre.date.$lte = new Date(dateFin);
    }
    if (recherche) {
      filtre.$or = [
        { description: { $regex: recherche, $options: 'i' } },
        { categorie: { $regex: recherche, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limite;
    const sortField = (sort || 'date') as 'date' | 'montant' | 'categorie' | 'description';
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortObj: { [key: string]: 1 | -1 } = { [sortField]: sortOrder };

    const transactions = await Transaction.find(filtre)
      .sort(sortObj)
      .skip(skip)
      .limit(limite);

    const total = await Transaction.countDocuments(filtre);

    res.json({
      succes: true,
      donnees: {
        transactions,
        pagination: {
          page,
          limite,
          total,
          pages: Math.ceil(total / limite)
        }
      }
    });
  });

//details d'une transaction
  static obtenirParId = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transaction) {
      throw new ErreurApp('Transaction non trouvée', 404);
    }

    res.json({
      succes: true,
      donnees: { transaction }
    });
  });

//modifier une transaction
  static mettreAJour = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { montant, type, categorie, sousCategorie, description, date, tags } = req.body;

    const transaction = await Transaction.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transaction) {
      throw new ErreurApp('Transaction non trouvée', 404);
    }

    if (montant !== undefined) transaction.montant = montant;
    if (type) transaction.type = type;
    if (categorie) transaction.categorie = categorie;
    if (sousCategorie !== undefined) transaction.sousCategorie = sousCategorie;
    if (description) transaction.description = description;
    if (date) transaction.date = new Date(date);
    if (tags) transaction.tags = tags;

    transaction.dateModification = new Date();
    await transaction.save();

    res.json({
      succes: true,
      message: 'Transaction mise à jour avec succès',
      donnees: { transaction }
    });
  });

//supprimer une transaction
  static supprimer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });

    if (!transaction) {
      throw new ErreurApp('Transaction non trouvée', 404);
    }

    res.json({
      succes: true,
      message: 'Transaction supprimée avec succès'
    });
  });

//statistiques des transactions
  static obtenirStatistiques = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { periode = 'mois' } = req.query;

    let dateDebut: Date;
    let dateFin: Date = new Date();

    switch (periode) {
      case 'jour':
        dateDebut = subDays(dateFin, 1);
        break;
      case 'semaine':
        dateDebut = subDays(dateFin, 7);
        break;
      case 'mois':
        dateDebut = startOfMonth(dateFin);
        dateFin = endOfMonth(dateFin);
        break;
      case 'trimestre':
        dateDebut = subMonths(dateFin, 3);
        break;
      case 'annee':
        dateDebut = startOfYear(dateFin);
        dateFin = endOfYear(dateFin);
        break;
      default:
        dateDebut = startOfMonth(dateFin);
        dateFin = endOfMonth(dateFin);
    }

    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      date: { $gte: dateDebut, $lte: dateFin }
    });

    const revenus = transactions
      .filter(t => t.type === 'revenu')
      .reduce((sum, t) => sum + t.montant, 0);

    const depenses = transactions
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + t.montant, 0);

    const repartition = transactions
      .filter(t => t.type === 'depense')
      .reduce((acc: any, t) => {
        const cat = t.categorie;
        acc[cat] = (acc[cat] || 0) + t.montant;
        return acc;
      }, {});

    res.json({
      succes: true,
      donnees: {
        periode: { dateDebut, dateFin },
        revenus,
        depenses,
        solde: revenus - depenses,
        repartitionParCategorie: repartition
      }
    });
  });

//exporter les transactions en CSV
  static exporterCSV = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { type, categorie, dateDebut, dateFin } = req.query;

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };

    if (type) filtre.type = type;
    if (categorie) filtre.categorie = categorie;
    if (dateDebut || dateFin) {
      filtre.date = {};
      if (dateDebut) filtre.date.$gte = new Date(dateDebut as string);
      if (dateFin) filtre.date.$lte = new Date(dateFin as string);
    }

    const transactions = await Transaction.find(filtre).sort({ date: -1 });
    const cheminFichier = await ExportService.exporterTransactionsCSV(
      req.utilisateurId!,
      transactions
    );

    res.download(cheminFichier, `transactions_${Date.now()}.csv`, (err) => {
      if (err) {
        console.error('Erreur lors du téléchargement:', err);
      }
    });
  });

//exporter les transactions en Excel
  static exporterExcel = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { type, categorie, dateDebut, dateFin } = req.query;

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };

    if (type) filtre.type = type;
    if (categorie) filtre.categorie = categorie;
    if (dateDebut || dateFin) {
      filtre.date = {};
      if (dateDebut) filtre.date.$gte = new Date(dateDebut as string);
      if (dateFin) filtre.date.$lte = new Date(dateFin as string);
    }

    const transactions = await Transaction.find(filtre).sort({ date: -1 });
    const buffer = await ExportService.exporterTransactionsExcel(
      req.utilisateurId!,
      transactions
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.xlsx`);
    res.send(buffer);
  });
}
