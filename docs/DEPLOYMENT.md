# Guide de Déploiement

Ce document détaille les procédures pour déployer l'application **Hssabaty** en production.

## 🐳 Déploiement avec Docker (Production)

Pour un déploiement robuste et isolé, utilisez Docker Compose.

1.  **Configuration** :
    Assurez-vous que vos variables d'environnement (`.env`) sont configurées avec des valeurs de production (mots de passe forts, URL réelles).
    Le fichier `docker-compose.yml` (ou une variante `prod`) doit être utilisé.

2.  **Lancement** :
    ```bash
    docker-compose -f docker-compose.yml up -d --build
    ```

    Cela construira les images optimisées pour la production et lancera les conteneurs en arrière-plan.

## ☁️ Hébergement Cloud (Recommandations)

### Backend & Base de Données
*   **VPS (AWS EC2, DigitalOcean, Hetzner)** : Utiliser Docker pour héberger tout sur une seule machine (économique).
*   **PaaS (Heroku, Render, Railway)** : Déploiement simple via connexion GitHub. (Nécessite Redis/MongoDB séparés ou add-ons).
*   **Azure / AWS Managed Services** : Azure App Service pour le backend, CosmosDB pour Mongo.

### Frontend
*   **Vercel** : Recommandé pour Next.js. Déploiement automatique, optimisations Edge.
*   **Netlify** : Alternative solide pour le frontend.
*   **Docker** : Hébergé avec le backend via Nginx comme reverse proxy.

## 🔒 Checklist de Sécurité avant mise en prod

1.  [ ] **Variables d'environnement** : Vérifier que `NODE_ENV=production`.
2.  [ ] **Secrets** : Changer tous les mots de passe par défaut (DB, Redis).
3.  [ ] **HTTPS** : Configurer SSL/TLS (via Nginx/Certbot ou Cloudflare).
4.  [ ] **Sauvegardes** : Mettre en place des backups automatiques pour MongoDB.
5.  [ ] **Monitoring** : Configurer des outils comme PM2 monitor, Sentry ou Azure Insights.
