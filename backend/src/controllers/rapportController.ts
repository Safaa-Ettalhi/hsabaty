import { Response } from 'express';
import { ServiceCalculsFinanciers } from '../services/calculsFinanciers';
import { Transaction } from '../models/Transaction';
import { ExportService } from '../services/exportService';
import { EmailService } from '../services/emailService';
import { Utilisateur } from '../models/Utilisateur';
import { asyncHandler, ErreurApp } from '../middleware/gestionErreurs';
import { AuthentifieRequest } from '../middleware/authentification';
import mongoose from 'mongoose';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();

export class RapportController {
//rapport de dépenses
  static rapportDepenses = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { dateDebut, dateFin, categorie } = req.query;

    const debut = dateDebut ? new Date(dateDebut as string) : startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin as string) : endOfMonth(new Date());

    const filtre: any = {
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      type: 'depense',
      date: { $gte: debut, $lte: fin }
    };

    if (categorie) {
      filtre.categorie = categorie;
    }

    const transactions = await Transaction.find(filtre).sort({ date: -1 });
    const totalDepenses = transactions.reduce((sum, t) => sum + t.montant, 0);

    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;

    const depensesPrecedentes = await serviceCalculs.calculerDepenses(
      req.utilisateurId!,
      periodePrecedenteDebut,
      periodePrecedenteFin
    );

    const repartition = await serviceCalculs.obtenirRepartitionDepenses(
      req.utilisateurId!,
      debut,
      fin
    );

    res.json({
      succes: true,
      donnees: {
        periode: { debut, fin },
        totalDepenses,
        nombreTransactions: transactions.length,
        depensesPrecedentes,
        evolution: totalDepenses - depensesPrecedentes,
        repartitionParCategorie: repartition,
        transactions
      }
    });
  });

//rapport de revenus
  static rapportRevenus = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { dateDebut, dateFin } = req.query;

    const debut = dateDebut ? new Date(dateDebut as string) : startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin as string) : endOfMonth(new Date());

    const transactions = await Transaction.find({
      utilisateurId: new mongoose.Types.ObjectId(req.utilisateurId),
      type: 'revenu',
      date: { $gte: debut, $lte: fin }
    }).sort({ date: -1 });

    const totalRevenus = transactions.reduce((sum, t) => sum + t.montant, 0);

    const parSource = transactions.reduce((acc: any, t) => {
      const source = t.categorie || 'Autres';
      acc[source] = (acc[source] || 0) + t.montant;
      return acc;
    }, {});

    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;

    const revenusPrecedents = await serviceCalculs.calculerRevenus(
      req.utilisateurId!,
      periodePrecedenteDebut,
      periodePrecedenteFin
    );

    res.json({
      succes: true,
      donnees: {
        periode: { debut, fin },
        totalRevenus,
        nombreTransactions: transactions.length,
        revenusPrecedents,
        evolution: totalRevenus - revenusPrecedents,
        repartitionParSource: Object.entries(parSource).map(([source, montant]: [string, any]) => ({
          source,
          montant,
          pourcentage: (montant / totalRevenus) * 100
        })),
        transactions
      }
    });
  });

//rapport d'épargne
  static rapportEpargne = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { dateDebut, dateFin } = req.query;

    const debut = dateDebut ? new Date(dateDebut as string) : startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin as string) : endOfMonth(new Date());

    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
    const epargne = revenus - depenses;
    const tauxEpargne = revenus > 0 ? (epargne / revenus) * 100 : 0;

    const duree = fin.getTime() - debut.getTime();
    const periodePrecedenteDebut = new Date(debut.getTime() - duree);
    const periodePrecedenteFin = debut;

    const epargnePrecedente = await serviceCalculs.calculerRevenus(
      req.utilisateurId!,
      periodePrecedenteDebut,
      periodePrecedenteFin
    ) - await serviceCalculs.calculerDepenses(
      req.utilisateurId!,
      periodePrecedenteDebut,
      periodePrecedenteFin
    );

    res.json({
      succes: true,
      donnees: {
        periode: { debut, fin },
        revenus,
        depenses,
        epargne,
        tauxEpargne,
        epargnePrecedente,
        evolution: epargne - epargnePrecedente
      }
    });
  });

//rapport mensuel
  static rapportMensuel = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { mois, annee } = req.query;

    const date = mois && annee
      ? new Date(Number(annee), Number(mois) - 1, 1)
      : new Date();

    const debut = startOfMonth(date);
    const fin = endOfMonth(date);

    const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
    const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
    const epargne = revenus - depenses;
    const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debut, fin);

    const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(
      req.utilisateurId!,
      debut,
      fin
    );

    const topDepenses = await serviceCalculs.obtenirTopDepenses(
      req.utilisateurId!,
      debut,
      fin,
      10
    );

    const moisPrecedent = subMonths(debut, 1);
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

    res.json({
      succes: true,
      donnees: {
        periode: { debut, fin },
        resume: {
          revenus,
          depenses,
          epargne,
          tauxEpargne
        },
        comparaison: {
          revenus: { actuel: revenus, precedent: revenusPrecedents, evolution: revenus - revenusPrecedents },
          depenses: { actuel: depenses, precedent: depensesPrecedentes, evolution: depenses - depensesPrecedentes }
        },
        repartitionDepenses,
        topDepenses
      }
    });
  });

//flux de trésorerie (Sankey)
  static fluxTresorerie = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { dateDebut, dateFin } = req.query;

    const debut = dateDebut ? new Date(dateDebut as string) : startOfMonth(new Date());
    const fin = dateFin ? new Date(dateFin as string) : endOfMonth(new Date());

    const flux = await serviceCalculs.genererFluxTresorerie(
      req.utilisateurId!,
      debut,
      fin
    );

    res.json({
      succes: true,
      donnees: {
        periode: { debut, fin },
        ...flux
      }
    });
  });

//exporter un rapport en PDF
  static exporterPDF = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { type, dateDebut, dateFin, mois, annee } = req.query;

    let donnees: any = {};

    if (type === 'mensuel') {
      const date = mois && annee
        ? new Date(Number(annee), Number(mois) - 1, 1)
        : new Date();
      const debut = startOfMonth(date);
      const fin = endOfMonth(date);

      const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
      const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
      const epargne = revenus - depenses;
      const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debut, fin);
      const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, debut, fin);
      const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId!, debut, fin, 10);

      donnees = {
        resume: { revenus, depenses, epargne, tauxEpargne },
        repartitionDepenses,
        topDepenses
      };
    } else {
      const debut = dateDebut ? new Date(dateDebut as string) : startOfMonth(new Date());
      const fin = dateFin ? new Date(dateFin as string) : endOfMonth(new Date());

      const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
      const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
      const epargne = revenus - depenses;
      const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debut, fin);
      const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, debut, fin);

      donnees = {
        resume: { revenus, depenses, epargne, tauxEpargne },
        repartitionDepenses
      };
    }

    const titre = type === 'mensuel' 
      ? `Rapport Mensuel - ${mois}/${annee}`
      : `Rapport Financier - ${dateDebut} au ${dateFin}`;

    const pdfBuffer = await ExportService.exporterRapportPDF(
      titre,
      donnees,
      req.utilisateurId!
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${Date.now()}.pdf`);
    res.send(pdfBuffer);
  });

//partager un rapport par email
  static partagerParEmail = asyncHandler(async (req: AuthentifieRequest, res: Response) => {
    const { type, emailDestinataire, dateDebut, dateFin, mois, annee } = req.body;

    const utilisateur = await Utilisateur.findById(req.utilisateurId);
    if (!utilisateur) {
      throw new ErreurApp('Utilisateur non trouvé', 404);
    }

    let donnees: any = {};

    if (type === 'mensuel') {
      const date = mois && annee
        ? new Date(Number(annee), Number(mois) - 1, 1)
        : new Date();
      const debut = startOfMonth(date);
      const fin = endOfMonth(date);

      const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
      const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
      const epargne = revenus - depenses;
      const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debut, fin);
      const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, debut, fin);
      const topDepenses = await serviceCalculs.obtenirTopDepenses(req.utilisateurId!, debut, fin, 10);

      donnees = {
        resume: { revenus, depenses, epargne, tauxEpargne },
        repartitionDepenses,
        topDepenses
      };
    } else {
      const debut = dateDebut ? new Date(dateDebut) : startOfMonth(new Date());
      const fin = dateFin ? new Date(dateFin) : endOfMonth(new Date());

      const revenus = await serviceCalculs.calculerRevenus(req.utilisateurId!, debut, fin);
      const depenses = await serviceCalculs.calculerDepenses(req.utilisateurId!, debut, fin);
      const epargne = revenus - depenses;
      const tauxEpargne = await serviceCalculs.calculerTauxEpargne(req.utilisateurId!, debut, fin);
      const repartitionDepenses = await serviceCalculs.obtenirRepartitionDepenses(req.utilisateurId!, debut, fin);

      donnees = {
        resume: { revenus, depenses, epargne, tauxEpargne },
        repartitionDepenses
      };
    }

    const titre = type === 'mensuel' 
      ? `Rapport Mensuel - ${mois}/${annee}`
      : `Rapport Financier`;

    const pdfBuffer = await ExportService.exporterRapportPDF(
      titre,
      donnees,
      req.utilisateurId!
    );

    await EmailService.envoyerRapport(
      emailDestinataire || utilisateur.email,
      utilisateur.nom,
      pdfBuffer,
      type || 'financier'
    );

    res.json({
      succes: true,
      message: 'Rapport envoyé par email avec succès'
    });
  });
}
