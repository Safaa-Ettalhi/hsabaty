import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ErreurApp } from '../middleware/gestionErreurs';

type SchemaTarget = 'body' | 'query' | 'params';

/**
 * Valide req[target] avec le schéma et remplace par la version parsée.
 */
export function valider<T extends ZodSchema>(schema: T, target: SchemaTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const raw = req[target];
      const result = schema.safeParse(raw);

      if (!result.success) {
        const err = result.error as ZodError;
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ErreurApp(messages.join(' ; '), 400);
      }

      (req as any)[target] = result.data;
      next();
    } catch (error) {
      if (error instanceof ErreurApp) throw error;
      next(error);
    }
  };
}

/**
 * Valide req.body avec le schéma (attendu: schema avec clé .shape.body).
 */
export function validerBody<T extends z.ZodObject<{ body: z.ZodTypeAny }>>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = (schema.shape.body as z.ZodSchema).safeParse(req.body);
      if (!result.success) {
        const err = result.error as ZodError;
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ErreurApp(messages.join(' ; '), 400);
      }
      req.body = result.data;
      next();
    } catch (error) {
      if (error instanceof ErreurApp) throw error;
      next(error);
    }
  };
}

/**
 * Valide req.query avec le schéma (attendu: schema avec clé .shape.query).
 */
export function validerQuery<T extends z.ZodObject<{ query: z.ZodTypeAny }>>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = (schema.shape.query as z.ZodSchema).safeParse(req.query);
      if (!result.success) {
        const err = result.error as ZodError;
        const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new ErreurApp(messages.join(' ; '), 400);
      }
      req.query = result.data as any;
      next();
    } catch (error) {
      if (error instanceof ErreurApp) throw error;
      next(error);
    }
  };
}
