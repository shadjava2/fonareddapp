@echo off
echo ====================================
echo  NETTOYAGE ET FIX CALENDRIER
echo ====================================
echo.
echo 1. Arretez le serveur Next.js (Ctrl+C dans le terminal)
echo 2. Appuyez sur une touche quand c'est fait...
pause

echo.
echo 2. Nettoyage des caches...
if exist .next rmdir /s /q .next
if exist out rmdir /s /q out
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo 3. Generation Prisma...
call npx prisma generate

echo.
echo 4. Verification...
if %ERRORLEVEL% EQU 0 (
    echo ✓ Prisma genere avec succes
) else (
    echo ✗ Erreur generation Prisma
    echo Verifiez que le serveur est bien arrete
)

echo.
echo ====================================
echo  FINI - Relancez: npm run dev
echo ====================================
pause
