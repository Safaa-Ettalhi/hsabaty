const dotenv = require("dotenv");
dotenv.config();
const { validerEnv } = require("./config/validateEnv");
validerEnv();
const express = require("express");
const cors = require("cors");
const database = require("./config/database");
const session = require("./config/session");
const gestionErreurs = require("./middleware/gestionErreurs");
const securite = require("./middleware/securite");
// Routes
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const agentIARoutes = require("./routes/agentIARoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const objectifRoutes = require("./routes/objectifRoutes");
const rapportRoutes = require("./routes/rapportRoutes");
const transactionRecurrenteRoutes = require("./routes/transactionRecurrenteRoutes");
const conseilsRoutes = require("./routes/conseilsRoutes");
const investissementRoutes = require("./routes/investissementRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminRoutes = require("./routes/adminRoutes");
const services = require("./services");
const config = require("./config");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session.configurerSession());
app.use('/api', securite.limiterAPI);
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
            investissements: '/api/investissements'
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
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use((_req, res) => {
    res.status(404).json({
        succes: false,
        message: 'Route non trouvée'
    });
});
app.use(gestionErreurs.gestionnaireErreurs);
const demarrerServeur = async () => {
    try {
        await database.connecterBaseDeDonnees();
        if (process.env.REDIS_URL?.trim()) {
            await config.obtenirClientRedis();
        }
        services.CronService.demarrerTachesProgrammees();
        const { VectorService } = require('./services/vectorService');
        await VectorService.init();
        app.listen(PORT, () => {
            console.log(`1: Serveur démarré sur le port ${PORT}`);
            console.log(`2: Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log(`3: API disponible sur: http://localhost:${PORT}/api`);
        });
    }
    catch (error) {
        console.error(' Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
};
demarrerServeur();
module.exports = app;
