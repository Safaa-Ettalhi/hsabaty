import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';

export class ErreurApp extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

//gestionnaire d'erreurs
export const gestionnaireErreurs = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Erreur serveur interne';

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e: any) => e.message);
    message = messages.join(', ');
  }

  // Erreur de cast Mongoose (ID invalide)
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = 'ID invalide';
  }

  // Erreur de duplication (unique)
  if (err.code === 11000) {
    statusCode = 409;
    const champ = Object.keys(err.keyPattern)[0];
    message = `${champ} existe déjà`;
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token invalide';
  }

  // Erreur JWT expiré
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expiré';
  }

  // Erreur de validation Zod
  if (err instanceof ZodError) {
    statusCode = 400;
    message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(' ; ');
  }

  res.status(statusCode).json({
    succes: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

//wrapper pour les fonctions async dans les routes
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
