import express from 'express';
import { InvestissementController } from '../controllers/investissementController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();
router.use(authentifier);

router.post('/', InvestissementController.creer);
router.get('/', InvestissementController.obtenirTous);
router.get('/:id', InvestissementController.obtenirParId);
router.put('/:id', InvestissementController.mettreAJour);
router.delete('/:id', InvestissementController.supprimer);

export default router;
