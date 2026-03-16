# Hssabaty - Plateforme de Gestion Financière Intelligente

Bienvenue dans la documentation du projet **Hssabaty**. Cette plateforme SaaS offre une solution complète pour la gestion des finances personnelles et professionnelles, enrichie par une intelligence artificielle avancée pour l'analyse et le conseil.

## 🌟 Fonctionnalités Principales

*   **Tableau de Bord Intuitif** : Vue d'ensemble de vos finances, revenus, dépenses et solde.
*   **Gestion des Transactions** : Suivi détaillé des transactions, catégorisation intelligente.
*   **Gestion Budgétaire** : Création et suivi de budgets par catégorie.
*   **Objectifs Financiers** : Définition et suivi de la progression vers vos objectifs d'épargne.
*   **Gestion des Investissements** : Suivi de portefeuille et performance.
*   **Agent IA Financier** : Assistant intelligent pour l'analyse de données, conseils personnalisés et réponses à vos questions financières (alimenté par OpenAI/Anthropic/Google).
*   **Rapports et Analyses** : Génération de rapports PDF/Excel détaillés.
*   **Transactions Récurrentes** : Gestion automatisée des abonnements et factures récurrentes.
*   **Interface Moderne** : Frontend réactif et performant construit avec Next.js et Tailwind CSS.

## 🛠️ Stack Technologique

### Backend (Node.js/Express)
*   **Langage** : TypeScript
*   **Framework** : Express.js
*   **Base de Données** : MongoDB (Mongoose)
*   **Cache & Session** : Redis
*   **Authentification** : JWT & Session
*   **AI & Vector Store** : OpenAI, Anthropic, Google Gemini, Pinecone
*   **Outils** : Zod (Validation), PDFKit (Rapports), GraphQL

### Frontend (Next.js)
*   **Framework** : Next.js 16 (App Router)
*   **UI Library** : React 19, Shadcn UI, Radix UI
*   **Styling** : Tailwind CSS
*   **Gestion d'État & Formulaires** : React Hook Form, TanStack Query (supposé/recommandé), Zod
*   **Charts** : Recharts, Chart.js

### Infrastructure
*   **Conteneurisation** : Docker, Docker Compose

## 🚀 Démarrage Rapide

Pour installer et lancer le projet localement, consultez le [Guide d'Installation](docs/SETUP_GUIDE.md).

## 📚 Documentation Détaillée

*   [Guide d'Installation & Configuration](docs/SETUP_GUIDE.md) : Instructions pas à pas pour configurer l'environnement de développement.
*   [Architecture du Système](docs/ARCHITECTURE.md) : Détails sur l'architecture technique, le modèle de données et les flux d'IA.
*   [Référence API](docs/API_REFERENCE.md) : Documentation des endpoints de l'API Backend.
*   [Guide de Déploiement](docs/DEPLOYMENT.md) : Instructions pour le déploiement en production.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez consulter les directives de contribution avant de soumettre une Pull Request.

## 📄 Licence

Ce projet est sous licence ISC.
