# Architecture du Projet Hssabaty

## 🏗️ Architecture Globale

Hssabaty est une application web full-stack moderne, suivant le modèle client-serveur.

*   **Frontend (Single Page Application)** : Next.js (App Router), React, Tailwind CSS. Gère l'interface utilisateur, les interactions et l'état de l'application. Communique avec le Backend via une API REST sécurisée et potentiellement GraphQL.
*   **Backend (API Server)** : Node.js (Express), TypeScript. Gère la logique métier, l'authentification, les interactions avec la base de données et les appels aux services d'IA (LLMs).
*   **Base de Données** : MongoDB. Stocke les données utilisateurs, transactions, budgets, objectifs, conversations, et l'historique des interactions avec l'IA.
*   **Cache & Session** : Redis. Utilisé pour gérer les sessions utilisateurs et le cache pour améliorer les performances (par exemple, pour la conversation IA ou les données fréquemment consultées).
*   **Services Tiers (IA & Vecteurs)** :
    *   **OpenAI / Anthropic / Google Gemini** : Utilisés pour l'analyse financière, la génération de conseils et les interactions de chat intelligent.
    *   **Pinecone** : Base de données vectorielle pour la recherche sémantique et la récupération de contexte pertinent (RAG) pour l'IA.

## 💾 Modèle de Données (Vue d'ensemble)

Les principaux modèles Mongoose définissent la structure des données :

### 1. Utilisateurs & Authentification (`Utilisateur.ts`, `Admin.ts`)
*   Gère les informations de compte, les préférences, et les rôles (Utilisateur standard, Admin).
*   Utilise JWT et Session via Redis pour la gestion des accès.

### 2. Gestion Financière (`Transaction.ts`, `Budget.ts`, `Objectif.ts`)
*   **Transactions** : Revenus et dépenses, avec catégorisation, date, montant, description.
*   **Budgets** : Limites de dépenses définies par catégorie/période.
*   **Objectifs** : Cibles d'épargne avec date limite et montant cible.
*   **Investissements (`Investissement.ts`)** : Suivi de portefeuilles d'actifs.
*   **Transactions Récurrentes (`TransactionRecurrente.ts`)** : Gestion des abonnements et factures périodiques.

### 3. Intelligence Artificielle (`Conversation.ts`)
*   Stocke l'historique des échanges entre l'utilisateur et l'assistant IA.
*   Les embeddings vectoriels (synchronisés via `syncVectors.ts`) permettent à l'IA de "comprendre" les données financières de l'utilisateur pour fournir des réponses contextuelles.

## 🧠 Flux de l'Intelligence Artificielle (Agent IA)

L'Agent IA (`agentIAController.ts`, `agentIAService.ts`) est au cœur de l'expérience utilisateur avancée.

1.  **Réception de la requête** : L'utilisateur pose une question ou demande une analyse via le Frontend.
2.  **Traitement (Backend)** :
    *   Le backend reçoit la requête.
    *   Il interroge la base de données vectorielle (Pinecone) pour récupérer le contexte pertinent (ex: transactions récentes, budget actuel).
    *   Il construit un prompt enrichi avec ce contexte.
3.  **Appel LLM** :
    *   Le prompt est envoyé à un modèle de langage (GPT-4, Claude, Gemini).
4.  **Réponse & Action** :
    *   L'IA génère une réponse textuelle et/ou des données structurées (ex: graphiques, résumés).
    *   La réponse est renvoyée au Frontend pour affichage.

## 🌐 API & Communication

*   **REST API** : La communication principale se fait via des endpoints REST (`/api/*`).
*   **GraphQL** : Une interface GraphQL est également disponible (`/graphql`) pour des requêtes de données plus flexibles.
*   **Sécurité** :
    *   Middleware d'authentification (`authentification.ts`) protège les routes sensibles.
    *   Validation des données entrantes avec Zod/Express Validator.
    *   Rate Limiting (`express-rate-limit`) pour prévenir les abus.
    *   CORS configuré pour sécuriser les origines.

## 📦 Structure des Dossiers Backend

```
backend/
├── src/
│   ├── config/       # Configuration (DB, Env, Redis, Session)
│   ├── controllers/  # Logique de traitement des requêtes
│   ├── graphql/      # Schémas et Resolveurs GraphQL
│   ├── middleware/   # Auth, Erreurs, Sécurité
│   ├── models/       # Schémas Mongoose
│   ├── routes/       # Définition des endpoints API
│   ├── scripts/      # Scripts utilitaires (Admin, Sync Vecteurs)
│   ├── services/     # Logique métier réutilisable (IA, Email, Export)
│   ├── types/        # Définitions TypeScript
│   ├── validators/   # Règles de validation
│   └── server.ts     # Point d'entrée
```

## 🖥️ Structure Frontend (App Router)

```
frontend/
├── src/
│   ├── app/          # Pages et Layouts (Next.js App Router)
│   ├── components/   # Composants UI réutilisables
│   ├── hooks/        # Custom Hooks React
│   ├── lib/          # Utilitaires et fonctions helper
│   ├── types/        # Types TypeScript frontend
│   └── ...
```
