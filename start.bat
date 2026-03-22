@echo off
echo ========================================
echo Demarrage du Generateur de DUERP
echo ========================================
echo.

echo Verification de l'installation...
if not exist "node_modules" (
    echo ERREUR: Dependances non installees
    echo Executez d'abord: install.bat
    pause
    exit /b 1
)

if not exist ".env" (
    echo ERREUR: Fichier .env manquant
    echo Copiez .env.example vers .env et configurez-le
    pause
    exit /b 1
)

echo Demarrage de l'application...
echo L'application sera accessible sur: http://localhost:5000
echo Appuyez sur Ctrl+C pour arreter l'application
echo.

npm start