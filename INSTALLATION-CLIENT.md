# Installation du client DUERP (PC)

Ce guide explique comment installer l'application desktop DUERP sur les ordinateurs des utilisateurs. L'application se connecte à un serveur central (hébergé sur un VPS) — elle ne nécessite **aucune** installation de Node.js, PostgreSQL ou autre logiciel sur le PC.

## Prérequis

- Windows (ou autre système supporté par Electron)
- Connexion internet
- URL du serveur DUERP (fournie par l'administrateur, ex. `https://duerp.example.com`)

## Installation

1. **Télécharger l'installateur**  
   Récupérez le fichier d'installation (ex. `DUERP Setup X.X.X.exe`) depuis la distribution prévue par votre administrateur.

2. **Exécuter l'installateur**  
   Lancez le fichier et suivez les étapes d'installation (choix du répertoire, raccourcis bureau/menu Démarrer).

3. **Premier lancement**  
   Au premier démarrage, une fenêtre de configuration s'affiche :
   - Entrez l'URL du serveur (ex. `https://duerp.example.com`)
   - Cliquez sur **Se connecter**
   - L'application vérifie que le serveur est accessible, puis ouvre l'interface

4. **Utilisation**  
   L'application charge l'interface depuis le serveur. Vos données sont stockées sur le serveur central.

## Changer l'URL du serveur

Si vous devez modifier l'URL du serveur (nouveau domaine, migration, etc.) :

- **Windows** : supprimez le fichier `duerp.env` dans `%APPDATA%\DUERP\` (ou le dossier de données de l'app)
- Au prochain lancement, la fenêtre de configuration réapparaîtra

## Aucune installation technique requise

- Pas de Node.js
- Pas de PostgreSQL
- Pas de ligne de commande
- Pas de fichier `.env` à configurer

Tout est géré par l'application. Seule l'URL du serveur est demandée au premier lancement.

## Dépannage

### « Serveur injoignable »

- Vérifiez votre connexion internet
- Vérifiez que l'URL est correcte (https://, pas de faute de frappe)
- Contactez l'administrateur pour confirmer que le serveur est en ligne

### L'application ne démarre pas

- Réinstallez l'application
- Vérifiez que votre antivirus n bloque pas l'exécution

## Accès via navigateur

L'interface DUERP est aussi accessible directement depuis un navigateur web en ouvrant l'URL du serveur. L'application desktop offre une fenêtre dédiée et une intégration au bureau.
