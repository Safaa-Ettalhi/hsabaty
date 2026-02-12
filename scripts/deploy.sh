set -e

ENVIRONMENT=${1:-production}

echo "Déploiement en mode: $ENVIRONMENT"

if ! command -v docker &> /dev/null; then
    echo "Docker n'est pas installé"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose n'est pas installé"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f ".env" ]; then
    echo "Fichier .env non trouvé. Copiez .env.example en .env et configurez-le."
    exit 1
fi

# Arrêter les conteneurs existants
echo "Arrêt des conteneurs existants..."
docker-compose down

# Builder les images
echo "Construction des images Docker..."
docker-compose build --no-cache

# Démarrer les services
echo "Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "Attente du démarrage des services..."
sleep 10

# Vérifier l'état des conteneurs
echo "État des conteneurs:"
docker-compose ps

echo "Déploiement terminé!"
echo "Backend: http://localhost:3000"
echo "MongoDB: localhost:27017"
echo "Redis: localhost:6379"
