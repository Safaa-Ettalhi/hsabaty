import express from 'express';
import { AuthController } from '../controllers/authController';
import { limiterConnexion } from '../middleware/securite';
import { authentifier } from '../middleware/authentification';
import { validerBody } from '../validators/middleware';
import {
  authInscriptionSchema,
  authConnexionSchema,
  authProfilModifierSchema,
  authMotDePasseOublieSchema,
  authReinitialiserMotDePasseSchema,
} from '../validators/schemas';

const router = express.Router();

router.post('/inscrire', limiterConnexion, validerBody(authInscriptionSchema), AuthController.inscrire);
router.post('/connecter', limiterConnexion, validerBody(authConnexionSchema), AuthController.connecter);
router.post('/deconnecter', authentifier, AuthController.deconnecter);
router.get('/moi', authentifier, AuthController.obtenirUtilisateurActuel);
router.put('/moi', authentifier, validerBody(authProfilModifierSchema), AuthController.modifierProfil);
router.post('/mot-de-passe-oublie', limiterConnexion, validerBody(authMotDePasseOublieSchema), AuthController.demanderReinitialisation);
router.post('/reinitialiser-mot-de-passe', limiterConnexion, validerBody(authReinitialiserMotDePasseSchema), AuthController.reinitialiserMotDePasse);

export default router;
