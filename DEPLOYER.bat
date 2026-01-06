@echo off
title Fonaredd App - Deploiement
color 0A
echo.
echo ========================================
echo   FONAREDD APP - DEPLOIEMENT FINAL
echo ========================================
echo.
echo [1/3] Verification de l'environnement...
echo.

REM Verifier Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installe
    echo Telechargez Node.js depuis: https://nodejs.org
    pause
    exit /b 1
) else (
    echo ✅ Node.js detecte
)

REM Verifier MySQL
echo ✅ MySQL: Verifiez que votre serveur MySQL est demarre
echo    - Host: localhost:32768
echo    - Database: fonaredd-app
echo    - User: shad
echo.

echo [2/3] Demarrage de l'application...
echo.
echo L'application sera accessible sur: http://localhost:3000
echo.
echo ⏳ Demarrage en cours... (attendez 15 secondes)
echo.

start /B npm run dev

REM Attendre que l'application demarre
timeout /t 15 /nobreak > nul

echo [3/3] Verification du deploiement...
echo.

REM Verifier que l'application ecoute sur le port 3000
netstat -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ✅ APPLICATION DEPLOYEE AVEC SUCCES !
    echo.
    echo 🌐 Ouvrez votre navigateur et allez sur:
    echo    http://localhost:3000
    echo.
    echo 📋 Fonctionnalites disponibles:
    echo    - Authentification securisee
    echo    - Gestion des utilisateurs et roles
    echo    - Gestion des conges
    echo    - Interface responsive avec theme vert
    echo.
    echo 🎉 VOTRE APPLICATION EST PRETE !
    echo.
    echo Appuyez sur une touche pour ouvrir l'application...
    pause > nul
    start http://localhost:3000
) else (
    echo ❌ ERREUR: L'application n'a pas demarre correctement
    echo.
    echo Solutions possibles:
    echo 1. Verifiez que MySQL est demarre
    echo 2. Verifiez que le port 3000 n'est pas occupe
    echo 3. Relancez ce script
    echo.
    pause
)

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
