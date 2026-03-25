const express = require("express");
const adminAuthController = require("../controllers/adminAuthController");
const securite = require("../middleware/securite");
const authentification = require("../middleware/authentification");
const router = express.Router();
//routes d'authentification admin
router.post('/connecter', securite.limiterConnexion, adminAuthController.AdminAuthController.connecter);
router.get('/moi', authentification.authentifierJWT, authentification.verifierAdmin, adminAuthController.AdminAuthController.obtenirAdminActuel);
router.put('/moi', authentification.authentifierJWT, authentification.verifierAdmin, adminAuthController.AdminAuthController.modifierProfil);
router.post('/deconnecter', authentification.authentifierJWT, authentification.verifierAdmin, adminAuthController.AdminAuthController.deconnecter);
module.exports = router;
