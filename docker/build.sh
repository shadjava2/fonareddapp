#!/bin/bash

# Script de build et lancement Docker pour Fonaredd App

set -e

echo "🐳 Build et lancement de Fonaredd App avec Docker"
echo "=================================================="

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

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || true

# Nettoyer les images anciennes (optionnel)
read -p "🗑️  Voulez-vous nettoyer les images Docker anciennes ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Nettoyage des images..."
    docker system prune -f
fi

# Build des images
echo "🔨 Build des images Docker..."
docker-compose build --no-cache

# Démarrer les services
echo "🚀 Démarrage des services..."

# Demander le mode de lancement
echo "Choisissez le mode de lancement :"
echo "1) Développement (avec hot reload)"
echo "2) Production"
echo "3) Redis uniquement (MySQL = hôte, voir .env DATABASE_URL)"
read -p "Votre choix (1-3): " -n 1 -r
echo

case $REPLY in
    1)
        echo "🔧 Lancement en mode développement..."
        docker-compose up -d app-dev redis
        echo "✅ Application démarrée en mode développement"
        echo "📱 URL: http://localhost:13000 (voir FONAREDD_APP_DEV_PORT dans .env)"
        ;;
    2)
        echo "🏭 Lancement en mode production..."
        docker-compose up -d app-prod caddy redis
        echo "✅ Application démarrée en mode production"
        echo "📱 App directe: http://localhost:13001 — via Caddy: http://localhost:18080"
        ;;
    3)
        echo "🔴 Lancement de Redis uniquement..."
        docker-compose up -d redis
        echo "✅ Redis démarré (ports selon .env, défaut 16379)"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier l'état des conteneurs
echo "📊 État des conteneurs :"
docker-compose ps

echo ""
echo "🎉 Démarrage terminé !"
echo ""
echo "📋 Commandes utiles :"
echo "  docker-compose logs -f app-dev    # Voir les logs développement"
echo "  docker-compose logs -f app-prod   # Voir les logs production"
echo "  docker-compose logs -f caddy      # Voir les logs Caddy"
echo "  docker-compose down               # Arrêter tous les services"
echo "  docker-compose exec app-dev sh    # Accéder au shell de l'app"
echo ""
echo "🔧 MySQL sur l’hôte : renseignez DATABASE_URL dans .env (ex. host.docker.internal:3306)"
echo ""
echo "👤 Utilisateur par défaut :"
echo "  Username: admin"
echo "  Password: admin123"
