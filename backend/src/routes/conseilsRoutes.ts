import express from 'express';
import { ConseilsController } from '../controllers/conseilsController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);

router.get('/insights', ConseilsController.obtenirInsights);
router.get('/recommandations/reduction-depenses', ConseilsController.obtenirRecommandationsReductionDepenses);
router.get('/recommandations/optimisation-epargne', ConseilsController.obtenirRecommandationsOptimisationEpargne);
router.get('/depenses-inhabituelles', ConseilsController.detecterDepensesInhabituelles);
router.get('/planification', ConseilsController.obtenirConseilsPlanification);

export default router;
