import express from 'express';
import { AdminController } from '../controllers/adminController';
import { authentifierJWT, verifierAdmin, verifierPermission } from '../middleware/authentification';

const router = express.Router();

router.use(authentifierJWT);
router.use(verifierAdmin);



// Dashboard et statistiques
router.get('/statistiques', AdminController.obtenirStatistiquesGlobales);

// Gestion des utilisateurs
router.get('/utilisateurs', verifierPermission('gestion_utilisateurs'), AdminController.listerUtilisateurs);
router.put('/utilisateurs/:id', verifierPermission('gestion_utilisateurs'), AdminController.modifierUtilisateur);
router.delete('/utilisateurs/:id', verifierPermission('gestion_utilisateurs'), AdminController.supprimerUtilisateur);



// Gestion des administrateurs (super admin uniquement)
router.get('/admins', verifierPermission('gestion_admins'), AdminController.listerAdmins);
router.post('/admins', verifierPermission('gestion_admins'), AdminController.creerAdmin);
router.put('/admins/:id', verifierPermission('gestion_admins'), AdminController.modifierAdmin);
router.delete('/admins/:id', verifierPermission('gestion_admins'), AdminController.supprimerAdmin);

export default router;
