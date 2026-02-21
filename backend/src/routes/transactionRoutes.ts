import express from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authentifier } from '../middleware/authentification';
import { validerBody, validerQuery } from '../validators/middleware';
import {
  transactionCreerSchema,
  transactionModifierSchema,
  transactionListeQuerySchema
} from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.post('/', validerBody(transactionCreerSchema), TransactionController.creer);
router.get('/', validerQuery(transactionListeQuerySchema), TransactionController.obtenirToutes);
router.get('/statistiques', TransactionController.obtenirStatistiques);
router.get('/export/csv', TransactionController.exporterCSV);
router.get('/export/excel', TransactionController.exporterExcel);
router.get('/:id', TransactionController.obtenirParId);
router.put('/:id', validerBody(transactionModifierSchema), TransactionController.mettreAJour);
router.delete('/:id', TransactionController.supprimer);

export default router;
