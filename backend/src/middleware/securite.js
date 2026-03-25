const express_rate_limit = require("express-rate-limit");
//limiter les tentatives de connexion
exports.limiterConnexion = express_rate_limit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        succes: false,
        message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//limiter les requêtes à l'API
exports.limiterAPI = express_rate_limit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        succes: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//limiter les requêtes à l'agent IA
exports.limiterAgentIA = express_rate_limit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        succes: false,
        message: 'Trop de requêtes à l\'agent IA. Veuillez patienter.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
//valider les données JSON
const validerJSON = (req, res, next) => {
    if (req.is('application/json')) {
        next();
    }
    else {
        res.status(400).json({
            succes: false,
            message: 'Le contenu doit être au format JSON'
        });
    }
};
exports.validerJSON = validerJSON;
