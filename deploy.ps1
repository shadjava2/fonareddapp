# Script de déploiement rapide pour Fonaredd App
Write-Host "========================================" -ForegroundColor Green
Write-Host "   DEPLOIEMENT RAPIDE FONAREDD APP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "[1/4] Installation des dépendances..." -ForegroundColor Yellow
npm install --no-optional --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Échec de l'installation des dépendances" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Génération du client Prisma..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Échec de la génération Prisma" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Test de connexion à la base de données..." -ForegroundColor Yellow
npx prisma db pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERREUR: Impossible de se connecter à la base de données" -ForegroundColor Red
    Write-Host "Vérifiez que MySQL est démarré et accessible" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour continuer"
    exit 1
}

Write-Host ""
Write-Host "[4/4] Démarrage de l'application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   APPLICATION PRÊTE !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "L'application sera accessible sur: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter l'application" -ForegroundColor Yellow
Write-Host ""
npm run dev
