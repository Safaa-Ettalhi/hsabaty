import express from 'express';
import { AdminAuthController } from '../controllers/adminAuthController';
import { limiterConnexion } from '../middleware/securite';
import { authentifierJWT, verifierAdmin } from '../middleware/authentification';

const router = express.Router();

//routes d'authentification admin
router.post('/connecter', limiterConnexion, AdminAuthController.connecter);
router.get('/moi', authentifierJWT, verifierAdmin, AdminAuthController.obtenirAdminActuel);
router.post('/deconnecter', authentifierJWT, verifierAdmin, AdminAuthController.deconnecter);

export default router;
