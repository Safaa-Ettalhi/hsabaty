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
router.get('/utilisateurs/:id', verifierPermission('gestion_utilisateurs'), AdminController.obtenirUtilisateur);
router.put('/utilisateurs/:id', verifierPermission('gestion_utilisateurs'), AdminController.modifierUtilisateur);
router.delete('/utilisateurs/:id', verifierPermission('gestion_utilisateurs'), AdminController.supprimerUtilisateur);

// Gestion des transactions
router.get('/transactions', verifierPermission('gestion_transactions'), AdminController.listerTransactions);
router.delete('/transactions/:id', verifierPermission('gestion_transactions'), AdminController.supprimerTransaction);

// Gestion des budgets
router.get('/budgets', verifierPermission('gestion_budgets'), AdminController.listerBudgets);

// Gestion des objectifs
router.get('/objectifs', verifierPermission('gestion_objectifs'), AdminController.listerObjectifs);

// Gestion des administrateurs (super admin uniquement)
router.get('/admins', verifierPermission('gestion_admins'), AdminController.listerAdmins);
router.post('/admins', verifierPermission('gestion_admins'), AdminController.creerAdmin);
router.put('/admins/:id', verifierPermission('gestion_admins'), AdminController.modifierAdmin);
router.delete('/admins/:id', verifierPermission('gestion_admins'), AdminController.supprimerAdmin);

export default router;
