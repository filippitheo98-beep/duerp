#!/bin/bash

echo "========================================"
echo "Démarrage du Générateur de DUERP"
echo "========================================"
echo

echo "Vérification de l'installation..."
if [ ! -d "node_modules" ]; then
    echo "ERREUR: Dépendances non installées"
    echo "Exécutez d'abord: ./install.sh"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "ERREUR: Fichier .env manquant"
    echo "Copiez .env.example vers .env et configurez-le"
    exit 1
fi

echo "Démarrage de l'application..."
echo "L'application sera accessible sur: http://localhost:5000"
echo "Appuyez sur Ctrl+C pour arrêter l'application"
echo

npm start