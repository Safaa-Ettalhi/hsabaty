# Guide de Déploiement

Ce document décrit le déploiement de **Hssabaty** avec Docker Compose.

## 🐳 Modes Docker disponibles

- **Développement**: `docker-compose.dev.yml`
- **Production**: `docker-compose.yml`

## Développement avec Docker

1. Préparez `backend/.env` avec vos variables locales.
2. Lancez la stack dev:

```bash
docker-compose -f docker-compose.dev.yml up -d --build
```

3. Arrêtez la stack dev:

```bash
docker-compose -f docker-compose.dev.yml down
```

## Production avec Docker

1. Préparez un `.env` à la racine (utilisé par `docker-compose.yml`) avec au minimum:
   - `SESSION_SECRET`
   - `JWT_SECRET`
   - `JWT_EXPIRE` (optionnel, défaut `7d`)
   - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` (selon fournisseur IA)
   - `IA_PROVIDER`, `IA_MODEL`
   - `CORS_ORIGIN`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
2. Lancez la stack prod:

```bash
docker-compose -f docker-compose.yml up -d --build
```

3. Arrêtez la stack prod:

```bash
docker-compose -f docker-compose.yml down
```

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
