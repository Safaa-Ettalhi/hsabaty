import express from 'express';
import { AuthController } from '../controllers/authController';
import { limiterConnexion } from '../middleware/securite';
import { authentifier } from '../middleware/authentification';

const router = express.Router();


router.post('/inscrire', limiterConnexion, AuthController.inscrire);
router.post('/connecter', limiterConnexion, AuthController.connecter);
router.post('/deconnecter', authentifier, AuthController.deconnecter);
router.get('/moi', authentifier, AuthController.obtenirUtilisateurActuel);

export default router;
