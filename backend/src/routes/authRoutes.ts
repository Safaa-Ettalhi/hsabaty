import express from 'express';
import { AuthController } from '../controllers/authController';
import { limiterConnexion } from '../middleware/securite';
import { authentifier } from '../middleware/authentification';
import { validerBody } from '../validators/middleware';
import { authInscriptionSchema, authConnexionSchema } from '../validators/schemas';

const router = express.Router();

router.post('/inscrire', limiterConnexion, validerBody(authInscriptionSchema), AuthController.inscrire);
router.post('/connecter', limiterConnexion, validerBody(authConnexionSchema), AuthController.connecter);
router.post('/deconnecter', authentifier, AuthController.deconnecter);
router.get('/moi', authentifier, AuthController.obtenirUtilisateurActuel);

export default router;
