import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction';
import { VectorService } from '../services/vectorService';

dotenv.config();

async function syncExistingTransactions() {
  try {
    console.log('[Sync] Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hssabaty');
    console.log('[Sync] Initialisation de VectorService...');
    await VectorService.init();

    const transactions = await Transaction.find({});
    console.log(`[Sync] ${transactions.length} transactions trouvées à synchroniser.`);

    let successCount = 0;
    let errorCount = 0;

    for (const t of transactions) {
      try {
        process.stdout.write(`[Sync] Synchronisation ${successCount + errorCount + 1}/${transactions.length}... \r`);
        await VectorService.upsertTransaction(t);
        successCount++;
      } catch (err) {
        console.error(`\n[Sync] Erreur pour la transaction ${t._id}:`, err);
        errorCount++;
      }
    }

    console.log(`\n[Sync] Terminé !`);
    console.log(`[Sync] Succès: ${successCount}`);
    console.log(`[Sync] Erreurs: ${errorCount}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Sync] Erreur globale:', error);
    process.exit(1);
  }
}

syncExistingTransactions();
