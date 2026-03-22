# Guide de Dépannage - Générateur de DUERP

## Problèmes Courants et Solutions

### 1. "Node.js n'est pas installé"
**Problème :** Le terminal affiche "node n'est pas reconnu" ou "command not found"
**Solution :**
- Téléchargez et installez Node.js depuis https://nodejs.org
- Redémarrez votre terminal/invite de commande après installation
- Vérifiez avec `node --version`

### 2. "npm install échoue"
**Problème :** Erreurs lors de l'installation des dépendances
**Solutions :**
- Vérifiez votre connexion internet
- Essayez : `npm cache clean --force` puis `npm install`
- Si vous êtes derrière un proxy d'entreprise, configurez npm :
  ```bash
  npm config set proxy http://proxy.entreprise.com:port
  npm config set https-proxy http://proxy.entreprise.com:port
  ```

### 3. "Erreur de connexion à la base de données"
**Problème :** L'application ne peut pas se connecter à PostgreSQL
**Solutions :**
- Vérifiez que PostgreSQL est démarré :
  - **Windows :** Services → PostgreSQL
  - **Mac/Linux :** `sudo systemctl status postgresql`
- Vérifiez le fichier `.env` :
  - Mot de passe correct
  - Port correct (5432 par défaut)
  - Nom de base de données correct
- Testez la connexion manuellement :
  ```bash
  psql -U postgres -d duerp_app
  ```

### 4. "Port 5000 déjà utilisé"
**Problème :** Une autre application utilise le port 5000
**Solutions :**
- Fermez l'autre application
- Ou modifiez le port dans `server/index.ts` :
  ```javascript
  const PORT = 3000; // Changez 5000 vers 3000 ou un autre port
  ```

### 5. "L'IA ne fonctionne pas"
**Problème :** Les fonctionnalités d'intelligence artificielle ne marchent pas
**Solutions :**
- Vérifiez que vous avez ajouté une clé API dans `.env`
- Vérifiez que votre clé API est valide
- Vérifiez votre connexion internet
- L'application fonctionne sans IA, seules les suggestions automatiques ne marcheront pas

### 6. "L'application est lente"
**Problème :** Chargement lent ou interface qui rame
**Solutions :**
- Fermez les autres applications gourmandes
- Vérifiez l'espace disque disponible
- Redémarrez l'application
- En mode développement (`npm run dev`), l'application peut être plus lente

### 7. "Je ne peux pas accéder à l'application"
**Problème :** http://localhost:5000 ne fonctionne pas
**Solutions :**
- Vérifiez que l'application est bien démarrée (pas d'erreurs dans le terminal)
- Essayez http://127.0.0.1:5000
- Vérifiez qu'aucun antivirus ne bloque l'application
- Redémarrez votre navigateur

### 8. "Mes données ont disparu"
**Problème :** Les documents créés ne s'affichent plus
**Solutions :**
- Vérifiez que PostgreSQL fonctionne
- Vérifiez que vous utilisez la même base de données (même nom dans `.env`)
- Les données sont dans PostgreSQL, pas dans des fichiers

## Commandes Utiles

### Redémarrer complètement l'application :
```bash
# Arrêtez l'application (Ctrl+C)
npm run db:push  # Resynchronise la base de données
npm start        # Redémarre l'application
```

### Vérifier les logs d'erreurs :
L'application affiche les erreurs directement dans le terminal où vous l'avez lancée.

### Sauvegarder vos données :
```bash
# Exportez votre base de données
pg_dump -U postgres duerp_app > sauvegarde_duerp.sql

# Pour restaurer plus tard :
psql -U postgres duerp_app < sauvegarde_duerp.sql
```

### Mettre à jour l'application :
1. Téléchargez la nouvelle version depuis Replit
2. Sauvegardez votre fichier `.env`
3. Remplacez tous les fichiers sauf `.env`
4. Exécutez `npm install` puis `npm run db:push`

## Besoin d'Aide ?

Si ces solutions ne résolvent pas votre problème :
1. Notez exactement le message d'erreur
2. Vérifiez dans quel contexte l'erreur apparaît
3. Gardez les logs du terminal pour diagnostic

L'application est conçue pour être robuste et facile à utiliser en local !