@echo off
chcp 65001 >nul
title Installation Fonaredd App - Serveur Windows
echo ========================================
echo   INSTALLATION FONAREDD APP
echo   Serveur Windows - Port 3001
echo ========================================
echo.

REM Vérifier les privilèges administrateur
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ATTENTION: Ce script doit etre execute en tant qu'administrateur
    echo Veuillez relancer en tant qu'administrateur
    pause
    exit /b 1
)

echo [ETAPE 1/6] Verification de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installe
    echo.
    echo Veuillez installer Node.js 18 ou superieur depuis:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js installe: %NODE_VERSION%
echo.

echo [ETAPE 2/6] Verification de npm...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERREUR: npm n'est pas installe
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm installe: %NPM_VERSION%
echo.

echo [ETAPE 3/6] Verification de la structure des fichiers...
if not exist .next\standalone (
    echo ❌ ERREUR: Le build de production n'existe pas
    echo Le dossier .next\standalone est introuvable
    echo.
    echo Veuillez executer le build de production avant l'installation
    pause
    exit /b 1
)
echo ✓ Structure des fichiers OK
echo.

echo [ETAPE 4/6] Verification du fichier .env.local...
if not exist .env.local (
    echo ⚠ ATTENTION: Le fichier .env.local n'existe pas
    echo.
    echo Creation d'un fichier .env.local a partir de env.example...
    if exist env.example (
        copy env.example .env.local >nul
        echo ✓ Fichier .env.local cree
        echo.
        echo ⚠ IMPORTANT: Veuillez configurer le fichier .env.local avec vos parametres:
        echo    - DATABASE_URL
        echo    - JWT_SECRET
        echo    - NEXTAUTH_SECRET
        echo    - PORT=3001
        echo.
        echo Appuyez sur une touche apres avoir configure .env.local...
        pause
    ) else (
        echo ❌ ERREUR: env.example n'existe pas
        echo Veuillez creer manuellement le fichier .env.local
        pause
        exit /b 1
    )
) else (
    echo ✓ Fichier .env.local existe
)
echo.

echo [ETAPE 5/6] Installation des dependances de production...
call npm install --production --no-optional --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)
echo ✓ Dependances installees
echo.

echo [ETAPE 6/6] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de la generation Prisma
    echo Verifiez votre configuration DATABASE_URL dans .env.local
    pause
    exit /b 1
)
echo ✓ Client Prisma genere
echo.

echo ========================================
echo   INSTALLATION TERMINEE AVEC SUCCES !
echo ========================================
echo.
echo L'application est prete a etre demarree.
echo.
echo Pour demarrer l'application:
echo   1. Executez: start.bat
echo   2. Ou executez: npm start
echo   3. Ou executez: start-prod.bat
echo.
echo L'application sera accessible sur: http://localhost:3001
echo.
echo Pour creer un service Windows pour demarrage automatique,
echo consultez le guide: GUIDE-DEPLOIEMENT-WINDOWS.md
echo.
pause



