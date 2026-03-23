# Référence API Hssabaty

Cette documentation reflète les routes actuellement exposées par le backend.
URL de base: `http://localhost:3000/api`.

## Authentification et protection

- Auth utilisateur: Bearer token JWT ou session.
- La plupart des routes métiers sont protégées.
- Routes publiques principales: `POST /api/auth/inscrire`, `POST /api/auth/connecter`, `POST /api/auth/mot-de-passe-oublie`, `POST /api/auth/reinitialiser-mot-de-passe`.
- Les routes admin utilisent `JWT admin` et des permissions dédiées.

##  Authentification utilisateur (`/api/auth`)

- `POST /auth/inscrire`
- `POST /auth/connecter`
- `POST /auth/deconnecter`
- `GET /auth/moi`
- `PUT /auth/moi`
- `PUT /auth/modifier-mot-de-passe`
- `POST /auth/mot-de-passe-oublie`
- `POST /auth/reinitialiser-mot-de-passe`

##  Dashboard (`/api/dashboard`)

- `GET /dashboard/metriques`
- `GET /dashboard/tendances-mensuelles`

##  Transactions (`/api/transactions`)

- `POST /transactions`
- `GET /transactions`
- `GET /transactions/statistiques`
- `GET /transactions/export/csv`
- `GET /transactions/export/excel`
- `GET /transactions/:id`
- `PUT /transactions/:id`
- `DELETE /transactions/:id`

##  Transactions récurrentes (`/api/transactions-recurrentes`)

- `POST /transactions-recurrentes`
- `GET /transactions-recurrentes`
- `GET /transactions-recurrentes/generer`
- `GET /transactions-recurrentes/:id`
- `PUT /transactions-recurrentes/:id`
- `DELETE /transactions-recurrentes/:id`

##  Budgets (`/api/budgets`)

- `POST /budgets`
- `GET /budgets`
- `GET /budgets/:id`
- `PUT /budgets/:id`
- `DELETE /budgets/:id`

##  Objectifs (`/api/objectifs`)

- `POST /objectifs`
- `GET /objectifs`
- `GET /objectifs/:id`
- `PUT /objectifs/:id`
- `POST /objectifs/:id/contribution`
- `DELETE /objectifs/:id`

##  Investissements (`/api/investissements`)

- `POST /investissements`
- `GET /investissements`
- `GET /investissements/:id`
- `PUT /investissements/:id`
- `DELETE /investissements/:id`

##  Agent IA (`/api/agent-ia`)

- `POST /agent-ia/message`
- `GET /agent-ia/historique`
- `GET /agent-ia/conversation/:id`
- `DELETE /agent-ia/conversation/:id`
- `POST /agent-ia/categoriser`

##  Conseils (`/api/conseils`)

- `GET /conseils/insights`
- `GET /conseils/recommandations/reduction-depenses`
- `GET /conseils/recommandations/optimisation-epargne`
- `GET /conseils/depenses-inhabituelles`
- `GET /conseils/planification`

##  Rapports (`/api/rapports`)

- `GET /rapports/depenses`
- `GET /rapports/revenus`
- `GET /rapports/epargne`
- `GET /rapports/mensuel`
- `GET /rapports/flux-tresorerie`
- `GET /rapports/export/pdf`
- `POST /rapports/partager-email`

##  Admin Auth (`/api/admin/auth`)

- `POST /admin/auth/connecter`
- `GET /admin/auth/moi`
- `PUT /admin/auth/moi`
- `POST /admin/auth/deconnecter`

##  Admin (`/api/admin`)

- `GET /admin/statistiques`
- `GET /admin/utilisateurs`
- `PUT /admin/utilisateurs/:id`
- `DELETE /admin/utilisateurs/:id`
- `GET /admin/admins`
- `POST /admin/admins`
- `PUT /admin/admins/:id`
- `DELETE /admin/admins/:id`

##  GraphQL (`/api/graphql`)

Endpoint disponible sur `http://localhost:3000/api/graphql` (protégé par authentification).
