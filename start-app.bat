@echo off
chcp 65001 >nul
echo ========================================
echo   Fonaredd App - Lancement
echo ========================================
echo.

REM 1. Arrêter PM2 si installé
echo [1/4] Arrêt des processus PM2...
call npx pm2 stop fonaredd-app 2>nul
call npx pm2 delete fonaredd-app 2>nul
echo.

REM 2. Libérer le port 3001
echo [2/4] Libération du port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do (
    echo   Arrêt du processus PID %%a
    taskkill /PID %%a /F 2>nul
)
timeout /t 2 /nobreak >nul
echo.

REM 3. Vérifier les dépendances
echo [3/4] Vérification des dépendances...
if not exist "node_modules" (
    echo   Installation des dépendances...
    call npm install
)
if not exist "node_modules\.prisma\client\index.js" (
    echo   Génération du client Prisma...
    call npx prisma generate
)
echo.

REM 4. Lancer l'application
echo [4/4] Démarrage de l'application...
echo.
echo   Ouvrez http://localhost:3001 dans votre navigateur
echo   Appuyez sur Ctrl+C pour arrêter
echo ========================================
call npm run dev
