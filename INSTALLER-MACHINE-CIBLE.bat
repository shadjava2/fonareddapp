@echo off
chcp 65001 >nul
echo ========================================
echo   INSTALLATION FONAREDD APP
echo   Machine Cible Windows
echo ========================================
echo.
echo Ce script installe l'application sur cette machine.
echo.
echo PREREQUIS:
echo - Node.js 18+ doit etre installe
echo - MySQL doit etre installe et demarre
echo - Le dossier de l'application doit contenir les fichiers deployes
echo.
pause

echo.
echo [1/4] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installe ou pas dans le PATH
    echo Veuillez installer Node.js 18+ depuis https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js detecte
node --version

echo.
echo [2/4] Installation des dependances de production...
call npm install --production --no-optional --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)
echo ✓ Dependances installees

echo.
echo [3/4] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de la generation Prisma
    echo Verifiez que le schema Prisma existe dans le dossier prisma
    pause
    exit /b 1
)
echo ✓ Client Prisma genere

echo.
echo [4/4] Verification de la configuration...
if not exist .env.local (
    echo ⚠️ ATTENTION: Le fichier .env.local n'existe pas
    echo.
    echo Creer un fichier .env.local avec les configurations suivantes:
    echo.
    echo DATABASE_URL="mysql://user:password@localhost:3306/database"
    echo JWT_SECRET="your-secret-key"
    echo NEXTAUTH_URL="http://localhost:3000"
    echo NEXTAUTH_SECRET="your-nextauth-secret"
    echo NODE_ENV="production"
    echo.
    pause
) else (
    echo ✓ Fichier .env.local trouve
)

echo.
echo ========================================
echo   INSTALLATION TERMINEE !
echo ========================================
echo.
echo Pour demarrer l'application:
echo   node .next\standalone\server.js
echo.
echo Ou utilisez le script start.bat s'il existe.
echo.
pause


