const node_cron = require("node-cron");
const TransactionRecurrente = require("../models/TransactionRecurrente");
const Transaction = require("../models/Transaction");
const rapportMensuelService = require("./rapportMensuelService");
const date_fns = require("date-fns");
class CronService {
    //générer automatiquement les transactions récurrentes dues
    static async genererTransactionsRecurrentes() {
        const maintenant = new Date();
        const transactionsRecurrentes = await TransactionRecurrente.TransactionRecurrente.find({
            actif: true,
            prochaineDate: { $lte: maintenant }
        });
        console.log(` Génération de ${transactionsRecurrentes.length} transaction(s) récurrente(s)...`);
        for (const tr of transactionsRecurrentes) {
            try {
                const transactionExistante = await Transaction.Transaction.findOne({
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
                const transaction = new Transaction.Transaction({
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
                    nouvelleDate = date_fns.addWeeks(nouvelleDate, 1);
                }
                else if (tr.frequence === 'mensuel') {
                    nouvelleDate = date_fns.addMonths(nouvelleDate, 1);
                }
                else if (tr.frequence === 'trimestriel') {
                    nouvelleDate = date_fns.addMonths(nouvelleDate, 3);
                }
                else if (tr.frequence === 'annuel') {
                    nouvelleDate = date_fns.addYears(nouvelleDate, 1);
                }
                tr.prochaineDate = nouvelleDate;
                await tr.save();
            }
            catch (error) {
                console.error(` Erreur génération transaction ${tr._id}:`, error);
            }
        }
    }
    //démarrer les tâches cron
    static demarrerTachesProgrammees() {
        node_cron.schedule('0 0 * * *', async () => {
            console.log(' Tâche: Génération des transactions récurrentes');
            await this.genererTransactionsRecurrentes();
        });
        node_cron.schedule('0 8 1 * *', async () => {
            console.log(' Tâche: Rapports mensuels');
            await rapportMensuelService.RapportMensuelService.genererRapportsMensuelsPourTous();
        });
        console.log(' Tâches programmées démarrées');
    }
}
exports.CronService = CronService;
