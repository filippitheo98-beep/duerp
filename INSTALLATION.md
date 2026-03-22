# Guide d'Installation - Générateur de DUERP

Ce guide vous explique comment installer et utiliser l'application Générateur de DUERP sur votre ordinateur personnel.

## Prérequis

Avant de commencer, vous devez installer les logiciels suivants sur votre ordinateur :

### 1. Node.js (obligatoire)
- Téléchargez Node.js version 18 ou plus récente depuis : https://nodejs.org
- Choisissez la version "LTS" (recommandée)
- Suivez l'assistant d'installation

### 2. PostgreSQL (base de données)
- **Windows** : Téléchargez depuis https://www.postgresql.org/download/windows/
- **Mac** : Utilisez Homebrew `brew install postgresql` ou téléchargez depuis le site officiel
- **Linux** : `sudo apt install postgresql postgresql-contrib` (Ubuntu/Debian)

Pendant l'installation de PostgreSQL :
- Notez bien le mot de passe que vous définissez pour l'utilisateur "postgres"
- Le port par défaut est 5432 (gardez-le)

## Installation de l'Application

### Étape 1 : Télécharger le code
1. Sur Replit, cliquez sur les trois points (...) à côté du nom de votre projet
2. Sélectionnez "Download as zip"
3. Décompressez le fichier dans un dossier de votre choix

### Étape 2 : Installer les dépendances
1. Ouvrez un terminal/invite de commande
2. Naviguez vers le dossier de votre application :
   ```bash
   cd chemin/vers/votre/dossier/duerp-generator
   ```
3. Installez les dépendances :
   ```bash
   npm install
   ```

### Étape 3 : Configurer la base de données
1. Créez une nouvelle base de données PostgreSQL :
   ```sql
   -- Connectez-vous à PostgreSQL avec psql ou pgAdmin
   CREATE DATABASE duerp_app;
   ```

2. Créez un fichier `.env` dans le dossier principal avec ce contenu :
   ```env
   DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/duerp_app
   NODE_ENV=production
   SESSION_SECRET=votre-cle-secrete-aleatoire-tres-longue
   ```

   Remplacez `VOTRE_MOT_DE_PASSE` par le mot de passe PostgreSQL que vous avez défini.

### Étape 4 : Initialiser la base de données
```bash
npm run db:push
```

Cette commande crée toutes les tables nécessaires dans votre base de données.

## Lancement de l'Application

### Pour utilisation quotidienne :
```bash
npm run build
npm start
```

L'application sera accessible à l'adresse : http://localhost:5000

### Pour développement (si vous voulez modifier l'application) :
```bash
npm run dev
```

## Configuration Optionnelle

### Ollama (pour l'IA)
Si vous voulez utiliser les fonctionnalités d'intelligence artificielle avec Ollama **en local** :
1. Installez Ollama sur votre machine
2. Téléchargez un modèle (ex. `llama3.2`)
3. Ajoutez dans votre fichier `.env` :
   ```env
   OLLAMA_BASE_URL=http://127.0.0.1:11434
   OLLAMA_MODEL=llama3.2
   ```

Par défaut, l’application refuse une URL Ollama non-locale. Si vous devez vraiment pointer un Ollama distant, ajoutez :
```env
OLLAMA_LOCAL_ONLY=false
```

### Clé API Anthropic (alternative)
Vous pouvez aussi utiliser Anthropic Claude :
1. Créez un compte sur https://console.anthropic.com
2. Générez une clé API
3. Ajoutez dans `.env` :
   ```env
   ANTHROPIC_API_KEY=votre-cle-anthropic
   ```

## Utilisation

1. **Première utilisation** : Créez un compte utilisateur lors de votre première visite
2. **Accès** : Ouvrez http://localhost:5000 dans votre navigateur
3. **Données** : Toutes vos données sont stockées localement sur votre ordinateur
4. **Sauvegarde** : Pensez à sauvegarder régulièrement votre dossier d'application

## Dépannage

### L'application ne démarre pas
- Vérifiez que Node.js est installé : `node --version`
- Vérifiez que PostgreSQL fonctionne
- Regardez les messages d'erreur dans le terminal

### Erreur de base de données
- Vérifiez que PostgreSQL est démarré
- Vérifiez le mot de passe dans le fichier `.env`
- Essayez de recréer la base de données

### Port déjà utilisé
Si le port 5000 est utilisé par une autre application :
1. Modifiez le fichier `server/index.ts`
2. Changez `const PORT = 5000` vers un autre port (ex: 3000, 8000)

## Avantages de l'Installation Locale

✅ **Données privées** : Tout reste sur votre ordinateur
✅ **Fonctionne sans internet** : Pas besoin de connexion (sauf pour l'IA)
✅ **Performance** : Plus rapide que le web
✅ **Personnalisation** : Vous pouvez modifier l'application
✅ **Pas de limites** : Créez autant de documents que vous voulez

## Support

Si vous rencontrez des difficultés lors de l'installation, les erreurs les plus courantes sont liées à :
- L'installation de Node.js
- La configuration de PostgreSQL
- Les permissions de fichiers

N'hésitez pas à demander de l'aide si vous bloquez sur une étape !