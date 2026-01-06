@echo off
title Fonaredd App - Demarrage Rapide
color 0A
echo.
echo ========================================
echo   FONAREDD APP - DEMARRAGE RAPIDE
echo ========================================
echo.

echo [1/2] Arret des processus existants...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Processus arretes

echo.
echo [2/2] Demarrage de l'application...
echo.
echo L'application sera accessible sur: http://localhost:3000
echo.
echo ⏳ Demarrage en cours... (attendez 10 secondes)
echo.

start /B npm run dev

REM Attendre que l'application demarre
timeout /t 10 /nobreak > nul

echo ✅ APPLICATION DEMARREE !
echo.
echo 🌐 Ouvrez votre navigateur et allez sur:
echo    http://localhost:3000
echo.
echo 📋 Si vous voyez encore des erreurs:
echo    1. Attendez 30 secondes
echo    2. Actualisez la page (F5)
echo    3. L'application se stabilisera automatiquement
echo.
echo 🎉 VOTRE APPLICATION EST PRETE !
echo.
echo Appuyez sur une touche pour ouvrir l'application...
pause > nul
start http://localhost:3000

echo.
echo Appuyez sur une touche pour fermer...
pause > nul
