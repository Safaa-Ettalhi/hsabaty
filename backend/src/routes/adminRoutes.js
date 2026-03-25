const express = require("express");
const adminController = require("../controllers/adminController");
const authentification = require("../middleware/authentification");
const router = express.Router();
router.use(authentification.authentifierJWT);
router.use(authentification.verifierAdmin);
// Dashboard et statistiques
router.get('/statistiques', adminController.AdminController.obtenirStatistiquesGlobales);
// Gestion des utilisateurs
router.get('/utilisateurs', authentification.verifierPermission('gestion_utilisateurs'), adminController.AdminController.listerUtilisateurs);
router.put('/utilisateurs/:id', authentification.verifierPermission('gestion_utilisateurs'), adminController.AdminController.modifierUtilisateur);
router.delete('/utilisateurs/:id', authentification.verifierPermission('gestion_utilisateurs'), adminController.AdminController.supprimerUtilisateur);
// Gestion des administrateurs (super admin uniquement)
router.get('/admins', authentification.verifierPermission('gestion_admins'), adminController.AdminController.listerAdmins);
router.post('/admins', authentification.verifierPermission('gestion_admins'), adminController.AdminController.creerAdmin);
router.put('/admins/:id', authentification.verifierPermission('gestion_admins'), adminController.AdminController.modifierAdmin);
router.delete('/admins/:id', authentification.verifierPermission('gestion_admins'), adminController.AdminController.supprimerAdmin);
module.exports = router;
