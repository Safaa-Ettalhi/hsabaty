import express from 'express';
import { TransactionController } from '../controllers/transactionController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);

router.post('/', TransactionController.creer);
router.get('/', TransactionController.obtenirToutes);
router.get('/statistiques', TransactionController.obtenirStatistiques);
router.get('/export/csv', TransactionController.exporterCSV);
router.get('/export/excel', TransactionController.exporterExcel);
router.get('/:id', TransactionController.obtenirParId);
router.put('/:id', TransactionController.mettreAJour);
router.delete('/:id', TransactionController.supprimer);

export default router;
