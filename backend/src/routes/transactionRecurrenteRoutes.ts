import express from 'express';
import { TransactionRecurrenteController } from '../controllers/transactionRecurrenteController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);

router.post('/', TransactionRecurrenteController.creer);
router.get('/', TransactionRecurrenteController.obtenirToutes);
router.get('/generer', TransactionRecurrenteController.genererTransactions);
router.get('/:id', TransactionRecurrenteController.obtenirParId);
router.put('/:id', TransactionRecurrenteController.mettreAJour);
router.delete('/:id', TransactionRecurrenteController.supprimer);

export default router;
