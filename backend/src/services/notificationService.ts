import { Budget } from '../models/Budget';
import { TransactionRecurrente } from '../models/TransactionRecurrente';
import { Utilisateur } from '../models/Utilisateur';
import { ServiceCalculsFinanciers } from './calculsFinanciers';
import { EmailService } from './emailService';
import { subDays } from 'date-fns';

const serviceCalculs = new ServiceCalculsFinanciers();

export class NotificationService {
//vérifier et envoyer les alertes budgétaires
  static async verifierAlertesBudgets(): Promise<void> {
    const budgets = await Budget.find({ actif: true });

    for (const budget of budgets) {
      try {
        const stats = await serviceCalculs.calculerStatistiquesBudget(budget._id.toString());
        const utilisateur = await Utilisateur.findById(budget.utilisateurId);

        if (!utilisateur || !utilisateur.preferences.notificationsEmail) {
          continue;
        }

        if (stats.pourcentageUtilise >= 80 && !budget.alertes.seuil80Pourcent) {
          await EmailService.envoyerAlerteBudget(
            utilisateur.email,
            utilisateur.nom,
            budget.nom,
            stats.pourcentageUtilise,
            stats.montantRestant
          );
          budget.alertes.seuil80Pourcent = true;
        }

        if (stats.pourcentageUtilise >= 100 && !budget.alertes.seuil100Pourcent) {
          await EmailService.envoyerAlerteBudget(
            utilisateur.email,
            utilisateur.nom,
            budget.nom,
            stats.pourcentageUtilise,
            stats.montantRestant
          );
          budget.alertes.seuil100Pourcent = true;
        }

        if (stats.pourcentageUtilise < 80) {
          budget.alertes.seuil80Pourcent = false;
          budget.alertes.seuil100Pourcent = false;
        }

        await budget.save();
      } catch (error) {
        console.error(`Erreur lors de la vérification du budget ${budget._id}:`, error);
      }
    }
  }

//envoyer les rappels pour transactions récurrentes
  static async envoyerRappelsTransactionsRecurrentes(): Promise<void> {
    const maintenant = new Date();
    const dans3Jours = subDays(maintenant, -3);

    const transactionsRecurrentes = await TransactionRecurrente.find({
      actif: true,
      prochaineDate: {
        $gte: maintenant,
        $lte: dans3Jours
      }
    });

    for (const tr of transactionsRecurrentes) {
      try {
        const utilisateur = await Utilisateur.findById(tr.utilisateurId);

        if (!utilisateur || !utilisateur.preferences.notificationsEmail) {
          continue;
        }

        await EmailService.envoyerRappelTransactionRecurrente(
          utilisateur.email,
          utilisateur.nom,
          tr.description,
          tr.montant,
          tr.prochaineDate
        );
      } catch (error) {
        console.error(`Erreur lors de l'envoi du rappel pour ${tr._id}:`, error);
      }
    }
  }
}
