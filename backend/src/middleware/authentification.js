const jwtService = require("../services/jwtService");
//authentifier l'utilisateur 
const authentifier = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwtService.JWTService.verifierToken(token);
            if (decoded.role === 'admin') {
                req.adminId = decoded.id;
                req.role = decoded.adminRole || 'admin';
            }
            else {
                req.utilisateurId = decoded.id;
            }
            return next();
        }
        catch (error) {
        }
    }
    if (req.session && req.session.utilisateurId) {
        req.utilisateurId = req.session.utilisateurId;
        return next();
    }
    res.status(401).json({
        succes: false,
        message: 'Authentification requise. Veuillez vous connecter.'
    });
};
exports.authentifier = authentifier;
//authentifier l'utilisateur avec JWT
const authentifierJWT = (req, res, next) => {
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
        const decoded = jwtService.JWTService.verifierToken(token);
        if (decoded.role === 'admin') {
            req.adminId = decoded.id;
            req.role = decoded.adminRole || 'admin';
        }
        else {
            req.utilisateurId = decoded.id;
        }
        next();
    }
    catch (error) {
        res.status(401).json({
            succes: false,
            message: 'Token invalide ou expiré'
        });
    }
};
exports.authentifierJWT = authentifierJWT;
//verifier si l'utilisateur est un admin
const verifierAdmin = (req, res, next) => {
    if (!req.adminId) {
        res.status(403).json({
            succes: false,
            message: 'Accès refusé. Droits administrateur requis.'
        });
        return;
    }
    next();
};
exports.verifierAdmin = verifierAdmin;
//verifier une permission specifique
const verifierPermission = (permission) => {
    return async (req, res, next) => {
        if (!req.adminId) {
            res.status(403).json({
                succes: false,
                message: 'Accès refusé. Droits administrateur requis.'
            });
            return;
        }
        const { Admin } = require('../models/Admin');
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
exports.verifierPermission = verifierPermission;
//authentifier l'utilisateur de facon optionnelle
const authentifierOptionnel = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jwtService.JWTService.verifierToken(token);
            if (decoded.role === 'admin') {
                req.adminId = decoded.id;
                req.role = decoded.adminRole || 'admin';
            }
            else {
                req.utilisateurId = decoded.id;
            }
        }
        catch (error) {
        }
    }
    if (req.session && req.session.utilisateurId) {
        req.utilisateurId = req.session.utilisateurId;
    }
    next();
};
exports.authentifierOptionnel = authentifierOptionnel;
