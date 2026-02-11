import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

//limiter les tentatives de connexion
export const limiterConnexion = rateLimit({
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
export const limiterAPI = rateLimit({
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
export const limiterAgentIA = rateLimit({
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
export const validerJSON = (req: Request, res: Response, next: any): void => {
  if (req.is('application/json')) {
    next();
  } else {
    res.status(400).json({
      succes: false,
      message: 'Le contenu doit être au format JSON'
    });
  }
};
