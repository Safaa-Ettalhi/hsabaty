import express from 'express';
import { RapportController } from '../controllers/rapportController';
import { authentifier } from '../middleware/authentification';
import { validerBody } from '../validators/middleware';
import { rapportPartagerEmailSchema } from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.get('/depenses', RapportController.rapportDepenses);
router.get('/revenus', RapportController.rapportRevenus);
router.get('/epargne', RapportController.rapportEpargne);
router.get('/mensuel', RapportController.rapportMensuel);
router.get('/flux-tresorerie', RapportController.fluxTresorerie);
router.get('/export/pdf', RapportController.exporterPDF);
router.post('/partager-email', validerBody(rapportPartagerEmailSchema), RapportController.partagerParEmail);

export default router;
