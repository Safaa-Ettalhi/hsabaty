import express from 'express';
import { BudgetController } from '../controllers/budgetController';
import { authentifier } from '../middleware/authentification';
import { validerBody } from '../validators/middleware';
import { budgetCreerSchema, budgetModifierSchema } from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.post('/', validerBody(budgetCreerSchema), BudgetController.creer);
router.get('/', BudgetController.obtenirTous);
router.get('/:id', BudgetController.obtenirParId);
router.put('/:id', validerBody(budgetModifierSchema), BudgetController.mettreAJour);
router.delete('/:id', BudgetController.supprimer);

export default router;
