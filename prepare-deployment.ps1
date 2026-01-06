# Script PowerShell pour préparer le package de déploiement
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PREPARATION DEPLOIEMENT FONAREDD APP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Créer le dossier dist s'il n'existe pas
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
    Write-Host "[OK] Dossier dist créé" -ForegroundColor Green
}

# Copier le dossier standalone
if (Test-Path ".next\standalone") {
    Write-Host "[1/5] Copie du build standalone..." -ForegroundColor Yellow
    Copy-Item -Path ".next\standalone" -Destination "dist\.next\standalone" -Recurse -Force
    Write-Host "  ✓ Build standalone copié" -ForegroundColor Green
} else {
    Write-Host "  ❌ ERREUR: .next\standalone introuvable" -ForegroundColor Red
    exit 1
}

# Copier les fichiers statiques
if (Test-Path ".next\static") {
    Write-Host "[2/5] Copie des fichiers statiques..." -ForegroundColor Yellow
    Copy-Item -Path ".next\static" -Destination "dist\.next\static" -Recurse -Force
    Write-Host "  ✓ Fichiers statiques copiés" -ForegroundColor Green
}

# Copier public
if (Test-Path "public") {
    Write-Host "[3/5] Copie du dossier public..." -ForegroundColor Yellow
    Copy-Item -Path "public" -Destination "dist\public" -Recurse -Force
    Write-Host "  ✓ Dossier public copié" -ForegroundColor Green
}

# Copier prisma
if (Test-Path "prisma") {
    Write-Host "[4/5] Copie du schema Prisma..." -ForegroundColor Yellow
    Copy-Item -Path "prisma" -Destination "dist\prisma" -Recurse -Force
    Write-Host "  ✓ Schema Prisma copié" -ForegroundColor Green
}

# Copier les fichiers essentiels
Write-Host "[5/5] Copie des fichiers essentiels..." -ForegroundColor Yellow
Copy-Item -Path "package.json" -Destination "dist\package.json" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "package-lock.json" -Destination "dist\package-lock.json" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "next.config.js" -Destination "dist\next.config.js" -Force -ErrorAction SilentlyContinue
if (Test-Path ".env.local") {
    Copy-Item -Path ".env.local" -Destination "dist\.env.local" -Force -ErrorAction SilentlyContinue
}
if (Test-Path "env.example") {
    Copy-Item -Path "env.example" -Destination "dist\env.example" -Force -ErrorAction SilentlyContinue
}
Write-Host "  ✓ Fichiers essentiels copiés" -ForegroundColor Green

# Créer le script de démarrage
Write-Host ""
Write-Host "Création du script de démarrage..." -ForegroundColor Yellow
$startScript = '@echo off
echo Demarrage de Fonaredd App...
cd /d "%~dp0"
echo Generation du client Prisma...
call npx prisma generate
echo Demarrage du serveur...
call node .next\standalone\server.js'
$startScript | Out-File -FilePath "dist\start.bat" -Encoding ASCII

Write-Host "  ✓ Script de démarrage créé" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PREPARATION TERMINEE AVEC SUCCES !" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Le dossier 'dist' contient tous les fichiers nécessaires pour le déploiement." -ForegroundColor Green
Write-Host ""
Write-Host "Pour déployer sur une autre machine Windows:" -ForegroundColor Yellow
Write-Host "  1. Copiez le dossier 'dist' sur la machine cible" -ForegroundColor White
Write-Host "  2. Installez Node.js 18+ sur la machine cible" -ForegroundColor White
Write-Host "  3. Configurez les variables d'environnement (.env.local)" -ForegroundColor White
Write-Host "  4. Dans le dossier dist, exécutez: npm install --production" -ForegroundColor White
Write-Host "  5. Exécutez: npx prisma generate" -ForegroundColor White
Write-Host "  6. Exécutez: node .next\standalone\server.js" -ForegroundColor White
Write-Host "  OU utilisez le script: start.bat" -ForegroundColor White
Write-Host ""

