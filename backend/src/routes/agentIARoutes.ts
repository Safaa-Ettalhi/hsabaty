import express from 'express';
import { AgentIAController } from '../controllers/agentIAController';
import { authentifier } from '../middleware/authentification';
import { limiterAgentIA } from '../middleware/securite';

const router = express.Router();

router.use(authentifier);

router.post('/message', limiterAgentIA, AgentIAController.envoyerMessage);
router.post('/voice', limiterAgentIA, AgentIAController.messageVocal);
router.get('/historique', AgentIAController.obtenirHistorique);
router.post('/categoriser', AgentIAController.categoriser);

export default router;
