@echo off
chcp 65001 >nul
echo ========================================
echo   VERIFICATION DU BUILD DE PRODUCTION
echo ========================================
echo.

if not exist dist (
    echo ❌ ERREUR: Le dossier 'dist' n'existe pas
    echo Veuillez executer build-prod.bat d'abord
    pause
    exit /b 1
)

echo Verification des fichiers essentiels...
echo.

set ERRORS=0

REM Verification du build standalone
if not exist dist\.next\standalone (
    echo ❌ ERREUR: .next\standalone n'existe pas
    set /a ERRORS+=1
) else (
    echo ✓ .next\standalone existe
)

REM Verification des fichiers statiques
if not exist dist\.next\static (
    echo ⚠ ATTENTION: .next\static n'existe pas
) else (
    echo ✓ .next\static existe
)

REM Verification de public
if not exist dist\public (
    echo ⚠ ATTENTION: public n'existe pas
) else (
    echo ✓ public existe
)

REM Verification de prisma
if not exist dist\prisma (
    echo ❌ ERREUR: prisma n'existe pas
    set /a ERRORS+=1
) else (
    echo ✓ prisma existe
)

REM Verification des fichiers de configuration
if not exist dist\package.json (
    echo ❌ ERREUR: package.json n'existe pas
    set /a ERRORS+=1
) else (
    echo ✓ package.json existe
)

if not exist dist\next.config.js (
    echo ❌ ERREUR: next.config.js n'existe pas
    set /a ERRORS+=1
) else (
    echo ✓ next.config.js existe
)

REM Verification du script de demarrage
if not exist dist\start.bat (
    echo ❌ ERREUR: start.bat n'existe pas
    set /a ERRORS+=1
) else (
    echo ✓ start.bat existe
)

REM Verification du README
if not exist dist\README-DEPLOIEMENT.txt (
    echo ⚠ ATTENTION: README-DEPLOIEMENT.txt n'existe pas
) else (
    echo ✓ README-DEPLOIEMENT.txt existe
)

echo.
echo ========================================
if %ERRORS% equ 0 (
    echo ✓ VERIFICATION REUSSIE
    echo Le package est pret pour le deploiement
) else (
    echo ❌ VERIFICATION ECHOUE
    echo %ERRORS% erreur(s) trouvee(s)
    echo Veuillez corriger les erreurs avant le deploiement
)
echo ========================================
echo.

REM Afficher la taille du package
echo TAILLE DU PACKAGE:
for /f "tokens=3" %%a in ('dir /s /-c dist ^| find "bytes"') do echo   - Dossier dist: ~%%a octets
echo.

pause

