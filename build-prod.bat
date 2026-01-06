@echo off
chcp 65001 >nul
title Build Production - Fonaredd App
echo ========================================
echo   BUILD PRODUCTION FONAREDD APP
echo   Pour deploiement Windows
echo ========================================
echo.

REM Verification de Node.js
echo [0/6] Verification de l'environnement...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Node.js 18 ou superieur
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js: %NODE_VERSION%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ ERREUR: npm n'est pas installe
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm: %NPM_VERSION%
echo.

echo [1/6] Nettoyage des fichiers precedents...
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out
if exist dist rmdir /s /q dist
if exist dist-electron rmdir /s /q dist-electron
echo ✓ Nettoyage termine
echo.

echo [2/6] Installation des dependances...
call npm ci --no-optional --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)
echo ✓ Dependances installees
echo.

echo [3/6] Generation du client Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec de la generation Prisma
    pause
    exit /b 1
)
echo ✓ Client Prisma genere
echo.

echo [4/6] Build de l'application Next.js...
set NODE_ENV=production
call npm run build:prod
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Echec du build
    pause
    exit /b 1
)

REM Verification que le build standalone existe
if not exist .next\standalone (
    echo ❌ ERREUR: Le build standalone n'a pas ete cree
    echo Verifiez la configuration next.config.js
    pause
    exit /b 1
)
echo ✓ Build termine
echo.

echo [5/6] Preparation des fichiers de deploiement...
if not exist dist mkdir dist

REM Copier le dossier standalone qui contient tout
if exist .next\standalone (
    echo   - Copie du build standalone...
    xcopy /E /I /Y /Q .next\standalone dist\.next\standalone >nul
    if %errorlevel% neq 0 (
        echo ❌ ERREUR: Echec de la copie du build standalone
        pause
        exit /b 1
    )
)

REM Copier les fichiers statiques
if exist .next\static (
    echo   - Copie des fichiers statiques...
    xcopy /E /I /Y /Q .next\static dist\.next\static >nul
)

REM Copier public
if exist public (
    echo   - Copie du dossier public...
    xcopy /E /I /Y /Q public dist\public >nul
)

REM Copier prisma
if exist prisma (
    echo   - Copie du schema Prisma...
    xcopy /E /I /Y /Q prisma dist\prisma >nul
)

REM Copier les fichiers essentiels
echo   - Copie des fichiers de configuration...
copy package.json dist\ >nul 2>nul
copy package-lock.json dist\ >nul 2>nul
copy next.config.js dist\ >nul 2>nul
if exist env.example copy env.example dist\env.example >nul 2>nul
if exist INSTALLER-SERVEUR-WINDOWS.bat copy INSTALLER-SERVEUR-WINDOWS.bat dist\ >nul 2>nul
if exist start-prod.bat copy start-prod.bat dist\ >nul 2>nul

REM Ne PAS copier .env.local (doit etre cree sur la machine cible)
if exist .env.local (
    echo   ⚠ ATTENTION: .env.local existe mais ne sera PAS copie (securite)
    echo   Vous devrez creer .env.local sur la machine de production
)

REM Creer le script de demarrage avec port 3001
echo   - Creation du script de demarrage...
(
echo @echo off
echo chcp 65001 ^>nul
echo title Fonaredd App - Production
echo echo ========================================
echo echo   FONAREDD APP - PRODUCTION
echo echo   Port: 3001
echo echo ========================================
echo echo.
echo cd /d "%%~dp0"
echo.
echo REM Verification de Node.js
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ ERREUR: Node.js n'est pas installe
echo     pause
echo     exit /b 1
echo ^)
echo.
echo REM Verification du build
echo if not exist .next\standalone ^(
echo     echo ❌ ERREUR: Le build de production n'existe pas
echo     echo Executez: npm install --production
echo     echo Executez: npx prisma generate
echo     pause
echo     exit /b 1
echo ^)
echo.
echo echo [1/2] Generation du client Prisma...
echo call npx prisma generate
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ ERREUR: Echec de la generation Prisma
echo     pause
echo     exit /b 1
echo ^)
echo echo ✓ Client Prisma genere
echo echo.
echo.
echo echo [2/2] Demarrage du serveur sur le port 3001...
echo echo.
echo echo L'application sera accessible sur: http://localhost:3001
echo echo.
echo echo Appuyez sur Ctrl+C pour arreter l'application
echo echo.
echo echo ========================================
echo echo.
echo.
echo REM Definir le port et demarrer
echo set PORT=3001
echo set NODE_ENV=production
echo node .next\standalone\server.js
) > dist\start.bat

REM Creer un README pour le deploiement
echo   - Creation du README de deploiement...
(
echo ========================================
echo   FONAREDD APP - PACKAGE DE DEPLOIEMENT
echo ========================================
echo.
echo Ce package contient tous les fichiers necessaires pour deployer
echo l'application Fonaredd sur une machine Windows de production.
echo.
echo INSTRUCTIONS DE DEPLOIEMENT:
echo.
echo 1. PREPARATION DE LA MACHINE CIBLE:
echo    - Installer Node.js 18 ou superieur ^(https://nodejs.org/^)
echo    - Installer MySQL ^(si base de donnees locale^)
echo    - Creer un dossier pour l'application ^(ex: C:\fonaredd-app^)
echo.
echo 2. COPIE DES FICHIERS:
echo    - Copier TOUT le contenu du dossier 'dist' sur la machine cible
echo    - S'assurer que la structure des dossiers est preservee
echo.
echo 3. CONFIGURATION:
echo    - Creer le fichier .env.local dans le dossier d'installation
echo    - Utiliser env.example comme reference
echo    - Configurer au minimum:
echo        * DATABASE_URL
echo        * JWT_SECRET
echo        * NEXTAUTH_SECRET
echo        * PORT=3001
echo.
echo 4. INSTALLATION:
echo    - Ouvrir PowerShell ou CMD dans le dossier d'installation
echo    - Executer: npm install --production --no-optional
echo    - Executer: npx prisma generate
echo.
echo 5. DEMARRAGE:
echo    - Double-cliquer sur start.bat
echo    - Ou executer: start.bat
echo    - L'application sera accessible sur http://localhost:3001
echo.
echo STRUCTURE DES FICHIERS:
echo.
echo dist/
echo ├── .next/
echo │   ├── standalone/    ^(Serveur Next.js^)
echo │   └── static/         ^(Fichiers statiques^)
echo ├── public/            ^(Assets publics^)
echo ├── prisma/            ^(Schema Prisma^)
echo ├── package.json
echo ├── package-lock.json
echo ├── next.config.js
echo ├── start.bat          ^(Script de demarrage^)
echo ├── env.example        ^(Exemple de configuration^)
echo └── INSTALLER-SERVEUR-WINDOWS.bat
echo.
echo POUR PLUS D'INFORMATIONS:
echo Consultez GUIDE-DEPLOIEMENT-WINDOWS.md
echo.
echo Date de build: %date% %time%
) > dist\README-DEPLOIEMENT.txt

echo ✓ Fichiers prepares
echo.

echo [6/6] Verification du package...
if not exist dist\.next\standalone (
    echo ❌ ERREUR: Le package n'est pas complet
    pause
    exit /b 1
)
if not exist dist\start.bat (
    echo ❌ ERREUR: Le script de demarrage n'existe pas
    pause
    exit /b 1
)
echo ✓ Package verifie
echo.

echo ========================================
echo   BUILD TERMINE AVEC SUCCES !
echo ========================================
echo.
echo Le dossier 'dist' contient tous les fichiers necessaires pour le deploiement.
echo.
echo TAILLE DU PACKAGE:
for /f "tokens=3" %%a in ('dir /s /-c dist ^| find "bytes"') do set SIZE=%%a
echo   - Dossier dist: ~%SIZE% octets
echo.
echo PROCHAINES ETAPES:
echo   1. Copiez le dossier 'dist' sur la machine de production
echo   2. Installez Node.js 18+ sur la machine cible
echo   3. Configurez les variables d'environnement ^(.env.local^)
echo   4. Executez: npm install --production
echo   5. Executez: npx prisma generate
echo   6. Executez: start.bat
echo   7. L'application sera accessible sur http://localhost:3001
echo.
echo Pour plus de details, consultez: dist\README-DEPLOIEMENT.txt
echo.
pause

