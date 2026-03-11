import express from 'express';
import { AgentIAController } from '../controllers/agentIAController';
import { authentifier } from '../middleware/authentification';
import { limiterAgentIA } from '../middleware/securite';
import { validerBody } from '../validators/middleware';
import { agentIAMessageSchema } from '../validators/schemas';

const router = express.Router();

router.use(authentifier);

router.post('/message', limiterAgentIA, validerBody(agentIAMessageSchema), AgentIAController.envoyerMessage);
router.post('/voice', limiterAgentIA, AgentIAController.messageVocal);
router.get('/historique', AgentIAController.obtenirHistorique);
router.get('/conversation/:id', AgentIAController.obtenirConversation);
router.delete('/conversation/:id', AgentIAController.supprimerConversation);
router.post('/categoriser', AgentIAController.categoriser);

export default router;
