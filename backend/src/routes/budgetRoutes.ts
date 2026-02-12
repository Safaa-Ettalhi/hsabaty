import express from 'express';
import { BudgetController } from '../controllers/budgetController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);


router.post('/', BudgetController.creer);
router.get('/', BudgetController.obtenirTous);
router.get('/:id', BudgetController.obtenirParId);
router.put('/:id', BudgetController.mettreAJour);
router.delete('/:id', BudgetController.supprimer);

export default router;
