# Référence API Hssabaty

Cette documentation décrit les principaux points de terminaison de l'API Backend.
L'URL de base est généralement `http://localhost:3000/api`.

Toutes les routes (sauf `/auth/*` et `/admin-auth/*`) nécessitent une authentification via Bearer Token ou Session.

## 🔐 Authentification (`/api/auth`)

*   `POST /auth/inscription` : Créer un nouveau compte utilisateur.
*   `POST /auth/connexion` : Se connecter (retourne token/session).
*   `POST /auth/deconnexion` : Se déconnecter.
*   `GET /auth/profil` : Obtenir les informations de l'utilisateur connecté.
*   `PUT /auth/profil` : Mettre à jour le profil.

## 💰 Transactions (`/api/transactions`)

*   `GET /transactions` : Lister les transactions (avec filtres: date, catégorie, etc.).
*   `POST /transactions` : Créer une nouvelle transaction.
*   `GET /transactions/:id` : Détails d'une transaction.
*   `PUT /transactions/:id` : Modifier une transaction.
*   `DELETE /transactions/:id` : Supprimer une transaction.
*   `GET /transactions/stats` : Statistiques des transactions.

## 🔄 Transactions Récurrentes (`/api/transactions-recurrentes`)

*   `GET /transactions-recurrentes` : Liste des abonnements/factures récurrentes.
*   `POST /transactions-recurrentes` : Ajouter une transaction récurrente.
*   `PUT /transactions-recurrentes/:id` : Modifier.
*   `DELETE /transactions-recurrentes/:id` : Supprimer.

## 📊 Budgets (`/api/budgets`)

*   `GET /budgets` : Liste des budgets définis.
*   `POST /budgets` : Créer un budget.
*   `PUT /budgets/:id` : Mettre à jour un budget.
*   `DELETE /budgets/:id` : Supprimer un budget.
*   `GET /budgets/suivi` : Suivi de la consommation des budgets.

## 🎯 Objectifs (`/api/objectifs`)

*   `GET /objectifs` : Liste des objectifs financiers.
*   `POST /objectifs` : Créer un objectif d'épargne.
*   `PUT /objectifs/:id` : Mettre à jour la progression ou les détails.
*   `DELETE /objectifs/:id` : Supprimer un objectif.

## 📈 Investissements (`/api/investissements`)

*   `GET /investissements` : Liste des investissements.
*   `POST /investissements` : Ajouter un investissement.
*   `PUT /investissements/:id` : Mettre à jour un investissement.
*   `DELETE /investissements/:id` : Supprimer un investissement.

## 🤖 Agent IA (`/api/agent-ia`)

*   `POST /agent-ia/chat` : Envoyer un message à l'assistant IA.
    *   **Body** : `{ "message": "Analyser mes dépenses du mois dernier" }`
*   `GET /agent-ia/historique` : Historique des conversations avec l'IA.
*   `POST /agent-ia/analyse` : Demander une analyse spécifique (ex: graphiques, résumés).

## 💡 Conseils (`/api/conseils`)

*   `GET /conseils` : Obtenir des conseils financiers personnalisés générés par l'IA.
*   `POST /conseils/generer` : Forcer la génération de nouveaux conseils basés sur les données récentes.

## 📄 Rapports (`/api/rapports`)

*   `GET /rapports/mensuel` : Rapport mensuel (PDF/JSON).
*   `GET /rapports/annuel` : Rapport annuel.
*   `POST /rapports/export` : Exporter les données (CSV/Excel).

## 🛡️ Admin (`/api/admin`) et `/api/admin-auth`

*   Routes réservées aux super-administrateurs pour la gestion de la plateforme.
*   `POST /admin-auth/connexion`
*   `GET /admin/users` : Gestion des utilisateurs.
*   `GET /admin/stats` : Statistiques globales de la plateforme.

## 🕸️ GraphQL (`/graphql`)

Un endpoint GraphQL est disponible pour des requêtes flexibles.
Vous pouvez explorer le schéma via un client GraphQL (ex: Altair, Postman) à l'adresse `http://localhost:3000/graphql` (si activé en dev).
