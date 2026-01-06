#!/bin/bash

# Script de configuration Docker pour Fonaredd App

set -e

echo "🐳 Configuration Docker pour Fonaredd App"
echo "=========================================="

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker Desktop."
    exit 1
fi

# Vérifier que Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose."
    exit 1
fi

echo "✅ Docker et Docker Compose détectés"

# Générer les certificats SSL si nécessaire
if [ ! -f "./docker/nginx/ssl/cert.pem" ]; then
    echo "🔐 Génération des certificats SSL..."
    if command -v openssl &> /dev/null; then
        bash ./docker/scripts/generate-ssl.sh
    else
        echo "⚠️  OpenSSL non trouvé. Les certificats SSL ne seront pas générés."
        echo "   Vous devrez les générer manuellement ou utiliser HTTP uniquement."
    fi
fi

# Créer le fichier .env s'il n'existe pas
if [ ! -f "./.env" ]; then
    echo "📝 Création du fichier .env..."
    cp env.example .env
    echo "✅ Fichier .env créé à partir d'env.example"
    echo "⚠️  Veuillez modifier le fichier .env avec vos paramètres de production"
fi

# Créer les volumes Docker s'ils n'existent pas
echo "📦 Création des volumes Docker..."
docker volume create fonareddapp_mysql_data 2>/dev/null || true
docker volume create fonareddapp_redis_data 2>/dev/null || true

echo "🚀 Configuration terminée !"
echo ""
echo "Commandes disponibles :"
echo "  docker-compose up -d app-dev    # Démarrer en mode développement"
echo "  docker-compose up -d app-prod   # Démarrer en mode production"
echo "  docker-compose up -d mysql      # Démarrer uniquement MySQL"
echo "  docker-compose logs -f app-dev  # Voir les logs"
echo "  docker-compose down             # Arrêter tous les services"
echo ""
echo "URLs d'accès :"
echo "  Développement: http://localhost:3000"
echo "  Production:    http://localhost:3001"
echo "  MySQL:         localhost:3306"
echo "  Redis:         localhost:6379"
