import express from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authentifier } from '../middleware/authentification';

const router = express.Router();

router.use(authentifier);

router.get('/metriques', DashboardController.obtenirMetriques);

export default router;
