#!/bin/bash

# Script de lancement rapide pour Fonaredd App

set -e

echo "🚀 Lancement rapide de Fonaredd App"
echo "===================================="

# Vérifier que les conteneurs sont déjà buildés
if ! docker-compose images | grep -q "fonareddapp"; then
    echo "⚠️  Les images Docker ne sont pas buildées."
    echo "Exécution du build..."
    bash docker/build.sh
    exit 0
fi

# Arrêter les conteneurs existants
docker-compose down 2>/dev/null || true

# Démarrer en mode développement par défaut
echo "🔧 Démarrage en mode développement..."
docker-compose up -d app-dev mysql redis

# Attendre le démarrage
echo "⏳ Attente du démarrage..."
sleep 5

# Vérifier l'état
echo "📊 État des conteneurs :"
docker-compose ps

echo ""
echo "✅ Application démarrée !"
echo "📱 URL: http://localhost:3000"
echo "🗄️  MySQL: localhost:3306"
echo ""
echo "👤 Connexion par défaut :"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo "📋 Commandes utiles :"
echo "  docker-compose logs -f app-dev    # Voir les logs"
echo "  docker-compose down               # Arrêter"
echo "  docker-compose exec app-dev sh    # Shell"
