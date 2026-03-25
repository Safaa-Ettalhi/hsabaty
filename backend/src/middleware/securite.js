const express_rate_limit = require("express-rate-limit");
const limiterConnexion = express_rate_limit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        succes: false,
        message: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const limiterAPI = express_rate_limit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        succes: false,
        message: 'Trop de requêtes. Veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const limiterAgentIA = express_rate_limit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        succes: false,
        message: 'Trop de requêtes à l\'agent IA. Veuillez patienter.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
function validerJSON(req, res, next) {
  if (req.is("application/json")) return next();
  return res.status(400).json({ succes: false, message: "Le contenu doit être au format JSON" });
}

module.exports = { limiterConnexion, limiterAPI, limiterAgentIA, validerJSON };
