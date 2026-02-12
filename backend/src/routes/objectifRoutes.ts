import express from 'express';
import { ObjectifController } from '../controllers/objectifController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);

router.post('/', ObjectifController.creer);
router.get('/', ObjectifController.obtenirTous);
router.get('/:id', ObjectifController.obtenirParId);
router.put('/:id', ObjectifController.mettreAJour);
router.post('/:id/contribution', ObjectifController.ajouterContribution);
router.delete('/:id', ObjectifController.supprimer);

export default router;
