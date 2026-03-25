# Script PowerShell de build et lancement Docker pour Fonaredd App

Write-Host "🐳 Build et lancement de Fonaredd App avec Docker" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Vérifier que Docker est installé
try {
    docker --version | Out-Null
    Write-Host "✅ Docker détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker n'est pas installé. Veuillez installer Docker Desktop." -ForegroundColor Red
    exit 1
}

# Vérifier que Docker Compose est installé
try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose détecté" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose." -ForegroundColor Red
    exit 1
}

# Arrêter les conteneurs existants
Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose down 2>$null

# Demander le nettoyage
$clean = Read-Host "🗑️  Voulez-vous nettoyer les images Docker anciennes ? (y/N)"
if ($clean -eq "y" -or $clean -eq "Y") {
    Write-Host "🧹 Nettoyage des images..." -ForegroundColor Yellow
    docker system prune -f
}

# Build des images
Write-Host "🔨 Build des images Docker..." -ForegroundColor Yellow
docker-compose build --no-cache

# Démarrer les services
Write-Host "🚀 Démarrage des services..." -ForegroundColor Yellow

# Demander le mode de lancement
Write-Host "Choisissez le mode de lancement :"
Write-Host "1) Développement (avec hot reload)"
Write-Host "2) Production"
Write-Host "3) Redis uniquement (MySQL sur l'hôte — .env DATABASE_URL)"
$choice = Read-Host "Votre choix (1-3)"

switch ($choice) {
    "1" {
        Write-Host "🔧 Lancement en mode développement..." -ForegroundColor Green
        docker-compose up -d app-dev redis
        Write-Host "✅ Application démarrée en mode développement" -ForegroundColor Green
        Write-Host "📱 URL: http://localhost:13000 (FONAREDD_APP_DEV_PORT)" -ForegroundColor Cyan
    }
    "2" {
        Write-Host "🏭 Lancement en mode production..." -ForegroundColor Green
        docker-compose up -d app-prod caddy redis
        Write-Host "✅ Application démarrée en mode production" -ForegroundColor Green
        Write-Host "📱 App: :13001 — Caddy: :18080" -ForegroundColor Cyan
    }
    "3" {
        Write-Host "🔴 Lancement de Redis uniquement..." -ForegroundColor Green
        docker-compose up -d redis
        Write-Host "✅ Redis démarré (défaut port 16379)" -ForegroundColor Green
    }
    default {
        Write-Host "❌ Choix invalide" -ForegroundColor Red
        exit 1
    }
}

# Attendre que les services soient prêts
Write-Host "⏳ Attente du démarrage des services..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Vérifier l'état des conteneurs
Write-Host "📊 État des conteneurs :" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "🎉 Démarrage terminé !" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Commandes utiles :" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f app-dev    # Voir les logs développement"
Write-Host "  docker-compose logs -f app-prod   # Voir les logs production"
Write-Host "  docker-compose logs -f caddy      # Voir les logs Caddy"
Write-Host "  docker-compose down               # Arrêter tous les services"
Write-Host "  docker-compose exec app-dev sh    # Accéder au shell de l'app"
Write-Host ""
Write-Host "🔧 MySQL sur l'hôte : DATABASE_URL dans .env (ex. host.docker.internal:3306)" -ForegroundColor Yellow
Write-Host ""
Write-Host "👤 Utilisateur par défaut :" -ForegroundColor Yellow
Write-Host "  Username: admin"
Write-Host "  Password: admin123"
