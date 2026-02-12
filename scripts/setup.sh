set -e

echo "🔧 Configuration initiale du projet Hssabaty"

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js n'est pas installé. Installez Node.js 20+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "Node.js version 20+ requis. Version actuelle: $(node -v)"
    exit 1
fi

# Installer les dépendances du backend
echo "Installation des dépendances backend..."
cd backend
if [ ! -f "package-lock.json" ]; then
    npm install
else
    npm ci
fi
cd ..

# Créer les fichiers .env si ils n'existent pas
if [ ! -f "backend/.env" ]; then
    echo "Création de backend/.env depuis .env.example..."
    cp backend/.env.example backend/.env
    echo "Configurez backend/.env avec vos valeurs"
fi

if [ ! -f ".env" ]; then
    echo "Création de .env depuis .env.example..."
    cp .env.example .env
    echo "Configurez .env avec vos valeurs"
fi

# Créer les dossiers nécessaires
echo "Création des dossiers..."
mkdir -p backend/exports
mkdir -p logs

echo "Configuration terminée!"
echo ""
echo "Prochaines étapes:"
echo "1. Configurez backend/.env avec vos clés API et secrets"
echo "2. Configurez .env avec vos paramètres globaux"
echo "3. Lancez 'make dev' ou 'docker-compose -f docker-compose.dev.yml up'"
