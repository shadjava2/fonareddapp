@echo off
chcp 65001 >nul
echo ========================================
echo   GUIDE DE DEPLOIEMENT PRODUCTION
echo   Fonaredd App - Windows
echo ========================================
echo.
echo Ce script prepare le projet pour le deploiement.
echo.
echo Choisissez une option:
echo.
echo 1. Build complet (recommandé pour nouvelle machine)
echo 2. Build rapide (fichiers essentiels seulement)
echo 3. Afficher les instructions de deploiement
echo.
set /p choice="Votre choix (1-3): "

if "%choice%"=="1" goto build_complete
if "%choice%"=="2" goto build_quick
if "%choice%"=="3" goto instructions
goto end

:build_complete
echo.
echo ========================================
echo   BUILD COMPLET EN COURS...
echo ========================================
call build-prod.bat
goto end

:build_quick
echo.
echo ========================================
echo   BUILD RAPIDE EN COURS...
echo ========================================
echo.
echo [1/3] Installation des dependances...
call npm ci --no-optional --legacy-peer-deps
echo.
echo [2/3] Generation Prisma...
call npx prisma generate
echo.
echo [3/3] Build Next.js...
set NODE_ENV=production
call npm run build:prod
echo.
echo ✓ Build rapide termine
echo Le dossier .next/standalone est pret pour deploiement
goto end

:instructions
echo.
echo ========================================
echo   INSTRUCTIONS DE DEPLOIEMENT
echo ========================================
echo.
echo ETAPE 1: Preparer la machine cible
echo -------------------------------------
echo - Installer Node.js 18 ou superieur
echo - Installer MySQL (ou utiliser une DB distante)
echo - Creer un dossier pour l'application (ex: C:\fonaredd-app)
echo.
echo ETAPE 2: Copier les fichiers
echo -------------------------------------
echo Copiez les fichiers suivants sur la machine cible:
echo   - Dossier .next/standalone (tout le contenu)
echo   - Dossier public
echo   - Dossier prisma
echo   - Fichier package.json
echo   - Fichier next.config.js
echo   - Fichier .env.local (avec vos configurations)
echo.
echo ETAPE 3: Installation sur la machine cible
echo -------------------------------------
echo 1. Ouvrir PowerShell en tant qu'administrateur
echo 2. Naviguer vers le dossier de l'application
echo 3. Executer: npm install --production --no-optional
echo 4. Executer: npx prisma generate
echo 5. Configurer .env.local avec vos parametres
echo.
echo ETAPE 4: Demarrage
echo -------------------------------------
echo Executer: node .next/standalone/server.js
echo.
echo Ou creer un service Windows pour demarrage automatique
echo.
pause
goto end

:end
echo.
echo Appuyez sur une touche pour quitter...
pause >nul


