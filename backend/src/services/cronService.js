const node_cron = require("node-cron");
const TransactionRecurrente = require("../models/TransactionRecurrente");
const Transaction = require("../models/Transaction");
const rapportMensuelService = require("./rapportMensuelService");
const date_fns = require("date-fns");

const AJOUT_PAR_FREQUENCE = {
    hebdomadaire: (d) => date_fns.addWeeks(d, 1),
    mensuel: (d) => date_fns.addMonths(d, 1),
    trimestriel: (d) => date_fns.addMonths(d, 3),
    annuel: (d) => date_fns.addYears(d, 1),
};

function debutJour(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

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
                        $gte: debutJour(tr.prochaineDate),
                        $lt: date_fns.addDays(debutJour(tr.prochaineDate), 1)
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
                const ajouter = AJOUT_PAR_FREQUENCE[tr.frequence];
                tr.prochaineDate = ajouter ? ajouter(new Date(tr.prochaineDate)) : new Date(tr.prochaineDate);
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
