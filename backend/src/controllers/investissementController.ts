import { Response } from 'express';
import { Investissement } from '../models/Investissement';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';

export class InvestissementController {
  static creer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { nom, type, montantInvesti, valeurActuelle, rendementPourcentage, dateAchat, description } = req.body;

    const investissement = new Investissement({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      nom,
      type: type || 'autre',
      montantInvesti,
      valeurActuelle: valeurActuelle ?? montantInvesti,
      rendementPourcentage,
      dateAchat: dateAchat ? new Date(dateAchat) : new Date(),
      dateValeur: valeurActuelle != null ? new Date() : undefined,
      description
    });

    await investissement.save();

    res.status(201).json({
      succes: true,
      message: 'Investissement créé avec succès',
      donnees: { investissement }
    });
  });

  static obtenirTous = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { type, actif } = req.query;
    const filtre: Record<string, unknown> = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    };
    if (type) filtre.type = type;
    if (actif !== undefined) filtre.actif = actif === 'true';

    const investissements = await Investissement.find(filtre).sort({ dateAchat: -1 });

    const totalInvesti = investissements.reduce((s, i) => s + i.montantInvesti, 0);
    const totalValeur = investissements.reduce((s, i) => s + (i.valeurActuelle ?? i.montantInvesti), 0);
    const rendementTotal = totalInvesti > 0 ? ((totalValeur - totalInvesti) / totalInvesti) * 100 : 0;

    res.json({
      succes: true,
      donnees: {
        investissements,
        resume: { totalInvesti, totalValeur, rendementTotal: Math.round(rendementTotal * 100) / 100 }
      }
    });
  });

  static obtenirParId = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const investissement = await Investissement.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement) throw new ErreurApp('Investissement non trouvé', 404);
    res.json({ succes: true, donnees: { investissement } });
  });

  static mettreAJour = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { nom, type, montantInvesti, valeurActuelle, rendementPourcentage, dateAchat, description, actif } = req.body;
    const investissement = await Investissement.findOne({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement) throw new ErreurApp('Investissement non trouvé', 404);

    if (nom !== undefined) investissement.nom = nom;
    if (type !== undefined) investissement.type = type;
    if (montantInvesti !== undefined) investissement.montantInvesti = montantInvesti;
    if (valeurActuelle !== undefined) {
      investissement.valeurActuelle = valeurActuelle;
      investissement.dateValeur = new Date();
    }
    if (rendementPourcentage !== undefined) investissement.rendementPourcentage = rendementPourcentage;
    if (dateAchat !== undefined) investissement.dateAchat = new Date(dateAchat);
    if (description !== undefined) investissement.description = description;
    if (actif !== undefined) investissement.actif = actif;

    investissement.dateModification = new Date();
    await investissement.save();

    res.json({
      succes: true,
      message: 'Investissement mis à jour',
      donnees: { investissement }
    });
  });

  static supprimer = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const investissement = await Investissement.findOneAndDelete({
      _id: req.params.id,
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId)
    });
    if (!investissement) throw new ErreurApp('Investissement non trouvé', 404);
    res.json({ succes: true, message: 'Investissement supprimé' });
  });
}
