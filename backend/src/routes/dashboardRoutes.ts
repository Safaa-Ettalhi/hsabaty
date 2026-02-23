import express from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authentifier } from '../middleware/authentification';
import { validerQuery } from '../validators/middleware';
import { dashboardMetriquesQuerySchema } from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.get('/metriques', validerQuery(dashboardMetriquesQuerySchema), DashboardController.obtenirMetriques);
router.get('/tendances-mensuelles', DashboardController.tendancesMensuelles);

export default router;
