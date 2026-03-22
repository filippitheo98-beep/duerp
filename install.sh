#!/bin/bash

echo "========================================"
echo "Installation du Générateur de DUERP"
echo "========================================"
echo

# Vérification de Node.js
if ! command -v node &> /dev/null; then
    echo "ERREUR: Node.js n'est pas installé."
    echo "Installez-le depuis: https://nodejs.org"
    exit 1
fi

echo "Node.js détecté: $(node --version)"
echo

# Vérification de npm
if ! command -v npm &> /dev/null; then
    echo "ERREUR: npm n'est pas installé."
    exit 1
fi

echo "Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo "ERREUR: Échec de l'installation des dépendances"
    exit 1
fi

echo
echo "Installation terminée!"
echo
echo "PROCHAINES ÉTAPES:"
echo "1. Installez PostgreSQL si ce n'est pas fait"
echo "2. Créez un fichier .env avec vos paramètres de base de données"
echo "3. Exécutez: npm run db:push"
echo "4. Lancez l'application: npm start"
echo
echo "Voir INSTALLATION.md pour les instructions détaillées"