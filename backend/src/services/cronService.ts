import cron from 'node-cron';
import { TransactionRecurrente } from '../models/TransactionRecurrente';
import { Transaction } from '../models/Transaction';
import { NotificationService } from './notificationService';
import { RapportMensuelService } from './rapportMensuelService';
import { addMonths, addWeeks, addYears } from 'date-fns';


export class CronService {
//générer automatiquement les transactions récurrentes dues
  static async genererTransactionsRecurrentes(): Promise<void> {
    const maintenant = new Date();
    const transactionsRecurrentes = await TransactionRecurrente.find({
      actif: true,
      prochaineDate: { $lte: maintenant }
    });

    console.log(` Génération de ${transactionsRecurrentes.length} transaction(s) récurrente(s)...`);

    for (const tr of transactionsRecurrentes) {
      try {
        const transactionExistante = await Transaction.findOne({
          utilisateurId: tr.utilisateurId,
          transactionRecurrenteId: tr._id,
          date: {
            $gte: new Date(tr.prochaineDate.getFullYear(), tr.prochaineDate.getMonth(), tr.prochaineDate.getDate()),
            $lt: new Date(tr.prochaineDate.getFullYear(), tr.prochaineDate.getMonth(), tr.prochaineDate.getDate() + 1)
          }
        });

        if (transactionExistante) {
          continue;
        }

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

        let nouvelleDate = new Date(tr.prochaineDate);
        if (tr.frequence === 'hebdomadaire') {
          nouvelleDate = addWeeks(nouvelleDate, 1);
        } else if (tr.frequence === 'mensuel') {
          nouvelleDate = addMonths(nouvelleDate, 1);
        } else if (tr.frequence === 'trimestriel') {
          nouvelleDate = addMonths(nouvelleDate, 3);
        } else if (tr.frequence === 'annuel') {
          nouvelleDate = addYears(nouvelleDate, 1);
        }

        tr.prochaineDate = nouvelleDate;
        await tr.save();
      } catch (error) {
        console.error(` Erreur génération transaction ${tr._id}:`, error);
      }
    }
  }

//démarrer les tâches cron
  static demarrerTachesProgrammees(): void {
    cron.schedule('0 0 * * *', async () => {
      console.log(' Tâche: Génération des transactions récurrentes');
      await this.genererTransactionsRecurrentes();
    });

    cron.schedule('0 8 * * *', async () => {
      console.log(' Tâche: Alertes budgétaires');
      await NotificationService.verifierAlertesBudgets();
    });

    cron.schedule('0 9 * * *', async () => {
      console.log(' Tâche: Rappels transactions récurrentes');
      await NotificationService.envoyerRappelsTransactionsRecurrentes();
    });

    cron.schedule('0 8 1 * *', async () => {
      console.log(' Tâche: Rapports mensuels');
      await RapportMensuelService.genererRapportsMensuelsPourTous();
    });

    console.log(' Tâches programmées démarrées');
  }
}
