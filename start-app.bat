@echo off
title Fonaredd App - Serveur de developpement
echo ========================================
echo   FONAREDD APP - SERVEUR DE DEVELOPPEMENT
echo ========================================
echo.
echo Demarrage de l'application...
echo.
echo L'application sera accessible sur: http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter l'application
echo.
echo ========================================
echo.

:start
npm run dev
if %errorlevel% neq 0 (
    echo.
    echo ERREUR: L'application s'est arretee
    echo Redemarrage dans 5 secondes...
    timeout /t 5 /nobreak > nul
    goto start
)

echo.
echo Application arretee.
pause
