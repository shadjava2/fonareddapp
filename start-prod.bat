@echo off
chcp 65001 >nul
title Fonaredd App - Production (Port 3001)
echo ========================================
echo   FONAREDD APP - PRODUCTION
echo   Port: 3001
echo ========================================
echo.

REM Vérifier que Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Node.js 18 ou superieur
    pause
    exit /b 1
)

REM Vérifier que le build existe
if not exist .next\standalone (
    echo ❌ ERREUR: Le build de production n'existe pas
    echo Veuillez executer: npm run build
    pause
    exit /b 1
)

echo [1/2] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de la generation Prisma
    pause
    exit /b 1
)
echo ✓ Client Prisma genere
echo.

echo [2/2] Demarrage du serveur sur le port 3001...
echo.
echo L'application sera accessible sur: http://localhost:3001
echo.
echo Appuyez sur Ctrl+C pour arreter l'application
echo.
echo ========================================
echo.

REM Définir le port et démarrer
set PORT=3001
set NODE_ENV=production
node .next\standalone\server.js



