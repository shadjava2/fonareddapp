# Script PowerShell de lancement rapide pour Fonaredd App

Write-Host "🚀 Lancement rapide de Fonaredd App" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Vérifier que les conteneurs sont déjà buildés
try {
    $images = docker-compose images
    if (-not ($images -match "fonareddapp")) {
        Write-Host "⚠️  Les images Docker ne sont pas buildées." -ForegroundColor Yellow
        Write-Host "Exécution du build..." -ForegroundColor Yellow
        & .\docker\build.ps1
        exit 0
    }
} catch {
    Write-Host "⚠️  Erreur lors de la vérification des images." -ForegroundColor Yellow
}

# Arrêter les conteneurs existants
docker-compose down 2>$null

# Démarrer en mode développement par défaut
Write-Host "🔧 Démarrage en mode développement..." -ForegroundColor Green
docker-compose up -d app-dev mysql redis

# Attendre le démarrage
Write-Host "⏳ Attente du démarrage..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Vérifier l'état
Write-Host "📊 État des conteneurs :" -ForegroundColor Green
docker-compose ps

Write-Host ""
Write-Host "✅ Application démarrée !" -ForegroundColor Green
Write-Host "📱 URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🗄️  MySQL: localhost:3306" -ForegroundColor Cyan
Write-Host ""
Write-Host "👤 Connexion par défaut :" -ForegroundColor Yellow
Write-Host "  Username: admin"
Write-Host "  Password: admin123"
Write-Host ""
Write-Host "📋 Commandes utiles :" -ForegroundColor Yellow
Write-Host "  docker-compose logs -f app-dev    # Voir les logs"
Write-Host "  docker-compose down               # Arrêter"
Write-Host "  docker-compose exec app-dev sh    # Shell"
