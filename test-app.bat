@echo off
echo ========================================
echo   TEST DE L'APPLICATION FONAREDD
echo ========================================
echo.

echo Test de connexion a l'application...
curl -s -o nul -w "%%{http_code}" http://localhost:3000
if %errorlevel% equ 0 (
    echo.
    echo ✅ APPLICATION ACCESSIBLE sur http://localhost:3000
    echo.
    echo 🌐 Ouvrez votre navigateur et allez sur:
    echo    http://localhost:3000
    echo.
    echo 📋 Fonctionnalites disponibles:
    echo    - Login avec vos identifiants de base de donnees
    echo    - Gestion des utilisateurs (Admin)
    echo    - Gestion des roles et permissions
    echo    - Gestion des services et sites
    echo    - Gestion des conges
    echo.
) else (
    echo ❌ ERREUR: Application non accessible
    echo Verifiez que npm run dev est en cours d'execution
)

echo.
echo Appuyez sur une touche pour ouvrir l'application dans le navigateur...
pause > nul
start http://localhost:3000
