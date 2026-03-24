# Fonaredd App - Script de lancement
# Ferme les instances existantes puis démarre l'app

$ErrorActionPreference = "SilentlyContinue"
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fonaredd App - Lancement" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Arrêter PM2
Write-Host "[1/4] Arrêt des processus PM2..." -ForegroundColor Yellow
npx pm2 stop fonaredd-app 2>$null
npx pm2 delete fonaredd-app 2>$null
Write-Host ""

# 2. Libérer le port 3001
Write-Host "[2/4] Libération du port 3001..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":3001" | Select-String "LISTENING"
foreach ($line in $connections) {
    $parts = $line -split '\s+'
    $pid = $parts[-1]
    if ($pid -match '^\d+$') {
        Write-Host "  Arrêt du processus PID $pid"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 2
Write-Host ""

# 3. Vérifier les dépendances
Write-Host "[3/4] Vérification des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installation des dépendances..."
    npm install
}
if (-not (Test-Path "node_modules\.prisma\client\index.js")) {
    Write-Host "  Génération du client Prisma..."
    npx prisma generate
}
Write-Host ""

# 4. Lancer l'application
Write-Host "[4/4] Démarrage de l'application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Ouvrez http://localhost:3001 dans votre navigateur" -ForegroundColor Green
Write-Host "  Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
npm run dev
