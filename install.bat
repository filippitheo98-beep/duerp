@echo off
echo ========================================
echo Installation du Generateur de DUERP
echo ========================================
echo.

echo Verification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Node.js n'est pas installe.
    echo Telechargez-le depuis: https://nodejs.org
    pause
    exit /b 1
)

echo Node.js detecte!
echo.

echo Installation des dependances...
npm install
if errorlevel 1 (
    echo ERREUR: Echec de l'installation des dependances
    pause
    exit /b 1
)

echo.
echo Installation terminee!
echo.
echo PROCHAINES ETAPES:
echo 1. Installez PostgreSQL si ce n'est pas fait
echo 2. Creez un fichier .env avec vos parametres de base de donnees
echo 3. Executez: npm run db:push
echo 4. Lancez l'application: npm start
echo.
echo Voir INSTALLATION.md pour les instructions detaillees
pause