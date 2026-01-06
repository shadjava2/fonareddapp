@echo off
echo ========================================
echo   DEPLOIEMENT RAPIDE FONAREDD APP
echo ========================================
echo.

echo [1/4] Installation des dependances...
call npm install --no-optional --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)

echo.
echo [2/4] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERREUR: Echec de la generation Prisma
    pause
    exit /b 1
)

echo.
echo [3/4] Test de connexion a la base de donnees...
call npx prisma db pull
if %errorlevel% neq 0 (
    echo ERREUR: Impossible de se connecter a la base de donnees
    echo Verifiez que MySQL est demarre et accessible
    pause
    exit /b 1
)

echo.
echo [4/4] Demarrage de l'application...
echo.
echo ========================================
echo   APPLICATION PRETE !
echo ========================================
echo.
echo L'application sera accessible sur: http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter l'application
echo.
call npm run dev
