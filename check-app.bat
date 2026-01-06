@echo off
echo ========================================
echo   VERIFICATION DE L'APPLICATION
echo ========================================
echo.

echo Verification du port 3000...
netstat -an | findstr :3000
if %errorlevel% equ 0 (
    echo.
    echo ✅ APPLICATION ACTIVE sur le port 3000
    echo.
    echo 🌐 Ouvrez votre navigateur et allez sur:
    echo    http://localhost:3000
    echo.
    echo 📋 Si vous voyez une erreur de connexion:
    echo    1. Attendez 30 secondes que l'application se charge
    echo    2. Actualisez la page (F5)
    echo    3. Essayez http://localhost:3001 si le port 3000 ne fonctionne pas
    echo.
) else (
    echo.
    echo ❌ APPLICATION NON ACTIVE
    echo.
    echo Pour demarrer l'application:
    echo    1. Ouvrez un terminal dans le dossier du projet
    echo    2. Tapez: npm run dev
    echo    3. Ou utilisez: start-app.bat
    echo.
)

echo.
echo Appuyez sur une touche pour ouvrir l'application dans le navigateur...
pause > nul
start http://localhost:3000
