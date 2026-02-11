import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwtService';

export interface AuthentifieRequest extends Request {
  utilisateurId?: string;
  adminId?: string;
  role?: string;
}

//authentifier l'utilisateur 
export const authentifier = (
  req: AuthentifieRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = JWTService.verifierToken(token);
      
      if (decoded.role === 'admin') {
        req.adminId = decoded.id;
        req.role = decoded.adminRole || 'admin';
      } else {
        req.utilisateurId = decoded.id;
      }
      
      return next();
    } catch (error) {
    }
  }

  if (req.session && (req.session as any).utilisateurId) {
    req.utilisateurId = (req.session as any).utilisateurId;
    return next();
  }

  res.status(401).json({
    succes: false,
    message: 'Authentification requise. Veuillez vous connecter.'
  });
};

//authentifier l'utilisateur avec JWT
export const authentifierJWT = (
  req: AuthentifieRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      succes: false,
      message: 'Token JWT requis'
    });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JWTService.verifierToken(token);
    
    if (decoded.role === 'admin') {
      req.adminId = decoded.id;
      req.role = decoded.adminRole || 'admin';
    } else {
      req.utilisateurId = decoded.id;
    }
    
    next();
  } catch (error: any) {
    res.status(401).json({
      succes: false,
      message: 'Token invalide ou expiré'
    });
  }
};

//verifier si l'utilisateur est un admin
export const verifierAdmin = (
  req: AuthentifieRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.adminId) {
    res.status(403).json({
      succes: false,
      message: 'Accès refusé. Droits administrateur requis.'
    });
    return;
  }
  next();
};

//verifier une permission specifique
export const verifierPermission = (permission: string) => {
  return async (
    req: AuthentifieRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.adminId) {
      res.status(403).json({
        succes: false,
        message: 'Accès refusé. Droits administrateur requis.'
      });
      return;
    }

    const { Admin } = await import('../models/Admin');
    const admin = await Admin.findById(req.adminId);

    if (!admin || !admin.actif) {
      res.status(403).json({
        succes: false,
        message: 'Compte administrateur invalide ou désactivé.'
      });
      return;
    }

    if (!admin.aPermission(permission)) {
      res.status(403).json({
        succes: false,
        message: `Permission requise: ${permission}`
      });
      return;
    }

    next();
  };
};

//authentifier l'utilisateur de facon optionnelle
export const authentifierOptionnel = (
  req: AuthentifieRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const decoded = JWTService.verifierToken(token);
      
      if (decoded.role === 'admin') {
        req.adminId = decoded.id;
        req.role = decoded.adminRole || 'admin';
      } else {
        req.utilisateurId = decoded.id;
      }
    } catch (error) {
    }
  }

  if (req.session && (req.session as any).utilisateurId) {
    req.utilisateurId = (req.session as any).utilisateurId;
  }
  
  next();
};
