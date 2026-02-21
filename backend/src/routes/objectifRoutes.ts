import express from 'express';
import { ObjectifController } from '../controllers/objectifController';
import { authentifier } from '../middleware/authentification';
import { validerBody } from '../validators/middleware';
import {
  objectifCreerSchema,
  objectifModifierSchema,
  objectifContributionSchema
} from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.post('/', validerBody(objectifCreerSchema), ObjectifController.creer);
router.get('/', ObjectifController.obtenirTous);
router.get('/:id', ObjectifController.obtenirParId);
router.put('/:id', validerBody(objectifModifierSchema), ObjectifController.mettreAJour);
router.post('/:id/contribution', validerBody(objectifContributionSchema), ObjectifController.ajouterContribution);
router.delete('/:id', ObjectifController.supprimer);

export default router;
