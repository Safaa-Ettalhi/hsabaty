// IMPORTANT: Charger dotenv AVANT tous les autres imports qui utilisent process.env
import dotenv from 'dotenv';
dotenv.config();

import { validerEnv } from './config/validateEnv';
validerEnv();

import express from 'express';
import cors from 'cors';
import { connecterBaseDeDonnees } from './config/database';
import { configurerSession } from './config/session';
import { gestionnaireErreurs } from './middleware/gestionErreurs';
import { limiterAPI } from './middleware/securite';
import { authentifier } from './middleware/authentification';

// Routes
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';
import agentIARoutes from './routes/agentIARoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import budgetRoutes from './routes/budgetRoutes';
import objectifRoutes from './routes/objectifRoutes';
import rapportRoutes from './routes/rapportRoutes';
import transactionRecurrenteRoutes from './routes/transactionRecurrenteRoutes';
import conseilsRoutes from './routes/conseilsRoutes';
import investissementRoutes from './routes/investissementRoutes';
import { graphqlMiddleware } from './routes/graphqlRoutes';
import adminAuthRoutes from './routes/adminAuthRoutes';
import adminRoutes from './routes/adminRoutes';
import { CronService } from './services';
import { obtenirClientRedis } from './config';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(configurerSession());

app.use('/api', limiterAPI);

app.get('/api', (_req, res) => {
  res.json({
    succes: true,
    message: 'API Hssabaty - Gestion financière avec Agent IA',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: 'POST /api/auth/inscrire, POST /api/auth/connecter',
      transactions: '/api/transactions',
      dashboard: '/api/dashboard/metriques',
      budgets: '/api/budgets',
      objectifs: '/api/objectifs',
      rapports: '/api/rapports',
      'agent-ia': '/api/agent-ia/message',
      'transactions-recurrentes': '/api/transactions-recurrentes',
      conseils: '/api/conseils',
      investissements: '/api/investissements',
      graphql: '/api/graphql'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (_req, res) => {
  res.json({
    succes: true,
    message: 'Serveur opérationnel',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/agent-ia', agentIARoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/objectifs', objectifRoutes);
app.use('/api/rapports', rapportRoutes);
app.use('/api/transactions-recurrentes', transactionRecurrenteRoutes);
app.use('/api/conseils', conseilsRoutes);
app.use('/api/investissements', investissementRoutes);
app.use('/api/graphql', authentifier, graphqlMiddleware);

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, res) => {
  res.status(404).json({
    succes: false,
    message: 'Route non trouvée'
  });
});

app.use(gestionnaireErreurs);

const demarrerServeur = async () => {
  try {
    await connecterBaseDeDonnees();
    if (process.env.REDIS_URL?.trim()) {
      await obtenirClientRedis();
    }

    CronService.demarrerTachesProgrammees();

    // Démarrer le serveur Express
    app.listen(PORT, () => {
      console.log(`1: Serveur démarré sur le port ${PORT}`);
      console.log(`2: Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`3: API disponible sur: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error(' Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

demarrerServeur();

export default app;
