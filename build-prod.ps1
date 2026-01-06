# Build Production - Fonaredd App
# Script PowerShell pour Windows

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD PRODUCTION FONAREDD APP" -ForegroundColor Cyan
Write-Host "  Pour deploiement Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verification de Node.js
Write-Host "[0/6] Verification de l'environnement..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green

    $npmVersion = npm --version
    Write-Host "✓ npm: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH" -ForegroundColor Red
    Write-Host "Veuillez installer Node.js 18 ou superieur" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Nettoyage
Write-Host "[1/6] Nettoyage des fichiers precedents..." -ForegroundColor Yellow
$dirsToClean = @(".next", "out", "dist", "dist-electron")
foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "✓ Nettoyage termine" -ForegroundColor Green
Write-Host ""

# Installation des dependances
Write-Host "[2/6] Installation des dependances..." -ForegroundColor Yellow
try {
    npm ci --no-optional --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        throw "Echec de l'installation"
    }
    Write-Host "✓ Dependances installees" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Echec de l'installation des dependances" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Generation Prisma
Write-Host "[3/6] Generation du client Prisma..." -ForegroundColor Yellow
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        throw "Echec de la generation"
    }
    Write-Host "✓ Client Prisma genere" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Echec de la generation Prisma" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Build Next.js
Write-Host "[4/6] Build de l'application Next.js..." -ForegroundColor Yellow
$env:NODE_ENV = "production"
try {
    npm run build:prod
    if ($LASTEXITCODE -ne 0) {
        throw "Echec du build"
    }

    if (-not (Test-Path ".next\standalone")) {
        throw "Le build standalone n'a pas ete cree"
    }
    Write-Host "✓ Build termine" -ForegroundColor Green
} catch {
    Write-Host "❌ ERREUR: Echec du build" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Preparation des fichiers
Write-Host "[5/6] Preparation des fichiers de deploiement..." -ForegroundColor Yellow
if (-not (Test-Path "dist")) {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

# Copier les fichiers
$copyOperations = @(
    @{Source = ".next\standalone"; Dest = "dist\.next\standalone"; Name = "build standalone"},
    @{Source = ".next\static"; Dest = "dist\.next\static"; Name = "fichiers statiques"},
    @{Source = "public"; Dest = "dist\public"; Name = "dossier public"},
    @{Source = "prisma"; Dest = "dist\prisma"; Name = "schema Prisma"}
)

foreach ($op in $copyOperations) {
    if (Test-Path $op.Source) {
        Write-Host "  - Copie de $($op.Name)..." -ForegroundColor Gray
        Copy-Item -Path $op.Source -Destination $op.Dest -Recurse -Force -ErrorAction Stop
    }
}

# Copier les fichiers essentiels
Write-Host "  - Copie des fichiers de configuration..." -ForegroundColor Gray
$filesToCopy = @("package.json", "package-lock.json", "next.config.js", "env.example")
foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination "dist\" -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path "INSTALLER-SERVEUR-WINDOWS.bat") {
    Copy-Item -Path "INSTALLER-SERVEUR-WINDOWS.bat" -Destination "dist\" -Force
}
if (Test-Path "start-prod.bat") {
    Copy-Item -Path "start-prod.bat" -Destination "dist\" -Force
}

if (Test-Path ".env.local") {
    Write-Host "  ⚠ ATTENTION: .env.local existe mais ne sera PAS copie (securite)" -ForegroundColor Yellow
    Write-Host "  Vous devrez creer .env.local sur la machine de production" -ForegroundColor Yellow
}

# Creer le script de demarrage
Write-Host "  - Creation du script de demarrage..." -ForegroundColor Gray
$startScript = @'
@echo off
chcp 65001 >nul
title Fonaredd App - Production
echo ========================================
echo   FONAREDD APP - PRODUCTION
echo   Port: 3001
echo ========================================
echo.
cd /d "%~dp0"

REM Verification de Node.js
where node >nul 2>nul
if %%errorlevel%% neq 0 (
    echo ERREUR: Node.js n'est pas installe
    pause
    exit /b 1
)

REM Verification du build
if not exist .next\standalone (
    echo ERREUR: Le build de production n'existe pas
    echo Executez: npm install --production
    echo Executez: npx prisma generate
    pause
    exit /b 1
)

echo [1/2] Generation du client Prisma...
call npx prisma generate
if %%errorlevel%% neq 0 (
    echo ERREUR: Echec de la generation Prisma
    pause
    exit /b 1
)
echo Client Prisma genere
echo.

echo [2/2] Demarrage du serveur sur le port 3001...
echo.
echo L'application sera accessible sur: http://localhost:3001
echo.
echo Appuyez sur Ctrl+C pour arreter l'application
echo.
echo ========================================
echo.

REM Definir le port et demarrer
set PORT=3001
set NODE_ENV=production
node .next\standalone\server.js
'@
$startScript | Out-File -FilePath "dist\start.bat" -Encoding ASCII

# Creer README
Write-Host "  - Creation du README de deploiement..." -ForegroundColor Gray
$readme = @"
========================================
  FONAREDD APP - PACKAGE DE DEPLOIEMENT
========================================

Ce package contient tous les fichiers necessaires pour deployer
l'application Fonaredd sur une machine Windows de production.

INSTRUCTIONS DE DEPLOIEMENT:

1. PREPARATION DE LA MACHINE CIBLE:
   - Installer Node.js 18 ou superieur (https://nodejs.org/)
   - Installer MySQL (si base de donnees locale)
   - Creer un dossier pour l'application (ex: C:\fonaredd-app)

2. COPIE DES FICHIERS:
   - Copier TOUT le contenu du dossier 'dist' sur la machine cible
   - S'assurer que la structure des dossiers est preservee

3. CONFIGURATION:
   - Creer le fichier .env.local dans le dossier d'installation
   - Utiliser env.example comme reference
   - Configurer au minimum:
       * DATABASE_URL
       * JWT_SECRET
       * NEXTAUTH_SECRET
       * PORT=3001

4. INSTALLATION:
   - Ouvrir PowerShell ou CMD dans le dossier d'installation
   - Executer: npm install --production --no-optional
   - Executer: npx prisma generate

5. DEMARRAGE:
   - Double-cliquer sur start.bat
   - Ou executer: start.bat
   - L'application sera accessible sur http://localhost:3001

STRUCTURE DES FICHIERS:

dist/
├── .next/
│   ├── standalone/    (Serveur Next.js)
│   └── static/         (Fichiers statiques)
├── public/            (Assets publics)
├── prisma/            (Schema Prisma)
├── package.json
├── package-lock.json
├── next.config.js
├── start.bat          (Script de demarrage)
├── env.example        (Exemple de configuration)
└── INSTALLER-SERVEUR-WINDOWS.bat

POUR PLUS D'INFORMATIONS:
Consultez GUIDE-DEPLOIEMENT-WINDOWS.md

Date de build: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
$readme | Out-File -FilePath "dist\README-DEPLOIEMENT.txt" -Encoding UTF8

Write-Host "✓ Fichiers prepares" -ForegroundColor Green
Write-Host ""

# Verification
Write-Host "[6/6] Verification du package..." -ForegroundColor Yellow
if (-not (Test-Path "dist\.next\standalone")) {
    Write-Host "❌ ERREUR: Le package n'est pas complet" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path "dist\start.bat")) {
    Write-Host "❌ ERREUR: Le script de demarrage n'existe pas" -ForegroundColor Red
    exit 1
}

# Calculer la taille
$size = (Get-ChildItem -Path "dist" -Recurse -File | Measure-Object -Property Length -Sum).Sum
$sizeMB = [math]::Round($size / 1MB, 2)
Write-Host "✓ Package verifie" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BUILD TERMINE AVEC SUCCES !" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Le dossier 'dist' contient tous les fichiers necessaires pour le deploiement." -ForegroundColor Green
Write-Host ""
Write-Host "TAILLE DU PACKAGE: ~$sizeMB MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROCHAINES ETAPES:" -ForegroundColor Yellow
Write-Host "  1. Copiez le dossier 'dist' sur la machine de production"
Write-Host "  2. Installez Node.js 18+ sur la machine cible"
Write-Host "  3. Configurez les variables d'environnement (.env.local)"
Write-Host "  4. Executez: npm install --production"
Write-Host "  5. Executez: npx prisma generate"
Write-Host "  6. Executez: start.bat"
Write-Host "  7. L'application sera accessible sur http://localhost:3001"
Write-Host ""
Write-Host "Pour plus de details, consultez: dist\README-DEPLOIEMENT.txt" -ForegroundColor Cyan
Write-Host ""

