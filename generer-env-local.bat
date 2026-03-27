@echo off
chcp 65001 >nul
echo ========================================
echo   GENERATION .env.local POUR PRODUCTION
echo ========================================
echo.

REM Verifier si .env.local existe deja
if exist .env.local (
    echo ATTENTION: .env.local existe deja
    set /p overwrite="Voulez-vous l'ecraser? (O/N): "
    if /i not "%overwrite%"=="O" (
        echo Operation annulee
        pause
        exit /b 0
    )
)

echo Creation du fichier .env.local pour la production...
echo.

(
echo # Configuration pour la production
echo # Base de donnees MySQL ^(meme configuration que la machine de developpement^)
echo DATABASE_URL="mysql://shad:SDconceptsrdc@243@localhost:32768/fonaredd-app"
echo.
echo # Cles secretes pour JWT et NextAuth
echo # IMPORTANT: Changez ces cles en production pour plus de securite
echo JWT_SECRET="your-super-secret-jwt-key-change-in-production-very-long-and-secure"
echo NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"
echo.
echo # Configuration Next.js pour la production
echo NEXTAUTH_URL="http://localhost:3001"
echo NODE_ENV="production"
echo.
echo # Port de l'application
echo PORT=3001
echo.
echo # SMTP ^(OTP reinitialisation mot de passe^) — Zoho : smtpproto.zoho.com
echo EMAIL_SERVER_HOST="smtpproto.zoho.com"
echo EMAIL_SERVER_PORT=587
echo EMAIL_SERVER_USER="votre-email@votredomaine.com"
echo EMAIL_SERVER_PASSWORD="votre-mot-de-passe-application"
echo EMAIL_FROM="noreply@votredomaine.com"
) > .env.local

echo ✓ Fichier .env.local cree avec succes
echo.
echo Configuration:
echo   - DATABASE_URL: MySQL sur localhost:32768
echo   - PORT: 3001
echo   - NODE_ENV: production
echo   - NEXTAUTH_URL: http://localhost:3001
echo.
echo IMPORTANT: Verifiez et modifiez les cles secretes si necessaire
echo.
pause

