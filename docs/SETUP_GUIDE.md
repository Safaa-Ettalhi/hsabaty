# Guide d'Installation et de Démarrage

Ce guide vous explique comment configurer l'environnement de développement pour le projet **Hssabaty**.

## 🚀 Prérequis

Assurez-vous d'avoir les outils suivants installés sur votre machine :

1.  **Node.js** (v20+) et **npm** (v10+).
2.  **Docker** et **Docker Compose** (optionnel mais recommandé pour les services externes comme MongoDB/Redis).
3.  **MongoDB** (Si vous n'utilisez pas Docker).
4.  **Redis** (Si vous n'utilisez pas Docker).
5.  **Git**.

## 📦 Clonez le projet

```bash
git clone https://github.com/Safaa-Ettalhi/hsabaty.git
cd hsabaty
```

## ⚙️ Configuration Backend (`/backend`)

1.  **Naviguez vers le dossier backend :**
    ```bash
    cd backend
    ```

2.  **Installez les dépendances :**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configurez les variables d'environnement :**
    Créez un fichier `.env` à la racine de `/backend` en vous basant sur l'exemple fourni (ou les clés nécessaires) :

    ```env
    PORT=3000
    MONGODB_URI=mongodb://localhost:27017/hssabaty
    REDIS_URL=redis://localhost:6379
    SESSION_SECRET=votre_secret_session_fort
    JWT_SECRET=votre_secret_jwt_fort
    CORS_ORIGIN=http://localhost:3001
    
    # Clés API pour l'IA (Optionnel pour le dev local basique)
    OPENAI_API_KEY=votre_openai_key
    ANTHROPIC_API_KEY=votre_anthropic_key
    GEMINI_API_KEY=votre_google_key
    PINECONE_API_KEY=votre_pinecone_key
    PINECONE_INDEX_NAME=votre_index
    ```

4.  **Lancez le serveur de développement :**
    ```bash
    npm run dev
    ```
    Le serveur devrait démarrer sur `http://localhost:3000`.

## 🎨 Configuration Frontend (`/frontend`)

1.  **Naviguez vers le dossier frontend :**
    ```bash
    cd ../frontend
    ```

2.  **Installez les dépendances :**
    ```bash
    npm install
    # ou
    bun install
    # ou
    pnpm install
    # ou
    yarn install
    ```

3.  **Configurez les variables d'environnement :**
    Créez un fichier `.env.local` à la racine de `/frontend` :

    ```env
    NEXT_PUBLIC_API_URL=http://localhost:3000/api
    ```

4.  **Lancez l'application Next.js :**
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:3001` si le backend tourne déjà sur `3000`.

## 🐳 Utilisation avec Docker (Recommandé)

Le projet contient des configurations Docker pour faciliter le déploiement et le développement.

1.  **Démarrer les services de développement (Backend + DB + Redis) :**
    À la racine du projet, exécutez :

    ```bash
    docker-compose -f docker-compose.dev.yml up -d --build
    ```

    Cela démarrera :
    *   MongoDB
    *   Redis
    *   Le serveur Backend (Node.js)

    *Note : Le frontend se lance séparément avec `npm run dev` dans `/frontend`.*

2.  **Arrêter les services :**
    ```bash
    docker-compose -f docker-compose.dev.yml down
    ```

## 🧪 Scripts Utiles

*   **Backend** :
    *   `npm run test` : Lance la suite de tests avec Jest.
    *   `npm run build` : Compile le TypeScript en JavaScript.
    *   `npm run creer-super-admin` : Script pour initialiser un utilisateur super admin.
    *   `npm run sync-vectors` : Synchronise les données vectorielles pour l'IA (Pinecone).

*   **Frontend** :
    *   `npm run lint` : Vérifie le code avec ESLint.
    *   `npm run build` : Construit l'application pour la production.

## ⚠️ Dépannage Courant

*   **Erreur de connexion MongoDB** : Vérifiez que votre instance MongoDB est en cours d'exécution et que `MONGODB_URI` est correct.
*   **Erreur CORS** : Assurez-vous que `CORS_ORIGIN` dans le `.env` du backend correspond à l'URL de votre frontend (ex: `http://localhost:3001`).
*   **Redis** : Si vous ne disposez pas de Redis localement, utilisez Docker ou commentez temporairement les parties liées à la session Redis (non recommandé pour la prod).
