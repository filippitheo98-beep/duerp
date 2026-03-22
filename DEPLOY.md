# Déploiement (Railway et VPS)

Ce document décrit la configuration nécessaire pour déployer l'application sur [Railway](https://railway.app).

## Variables d'environnement

| Variable        | Requis | Description                                   |
|-----------------|--------|-----------------------------------------------|
| `DATABASE_URL`  | Oui    | URL de connexion PostgreSQL (Railway provisionne automatiquement si vous ajoutez un service Postgres) |
| `SESSION_SECRET`| Non    | Secret pour les sessions (si auth Replit activée) |

## Configuration du port (Target Port)

**Important** : Railway injecte la variable `PORT` au démarrage (souvent 8080). Vous devez configurer le **Target Port** dans les paramètres du service pour qu'il corresponde.

1. Ouvrez votre service dans le dashboard Railway
2. Allez dans **Settings** → **Public Networking**
3. Modifiez le domaine et assurez-vous que le **Target Port** est identique à la valeur de `PORT` (typiquement **8080**)
4. Si le Target Port est configuré sur 5000 alors que l'app écoute sur 8080, vous obtiendrez des erreurs 502

## Migrations base de données

Les migrations ne sont pas exécutées automatiquement au démarrage. Pour pousser le schéma :

```bash
railway run npx drizzle-kit push
```

Exécutez cette commande après avoir provisionné la base et configuré `DATABASE_URL`.

## Build Docker

L'application utilise un Dockerfile multi-stage. Railway détecte le Dockerfile et build automatiquement. Le build :

1. Installe les dépendances et exécute `npm run build`
2. Copie uniquement `dist/` et `package.json` dans l'image finale
3. Démarre avec `node dist/index.js`

## Health check

L'endpoint `/health` vérifie la connexion à la base de données. Il retourne :
- **200** si l'app et la DB sont opérationnelles
- **503** si la base est injoignable

---

# Déploiement sur VPS (OVH)

## Architecture : serveur uniquement

Le VPS héberge **uniquement le serveur** (API Express + SPA statique). Aucune installation de l’application desktop sur le VPS.

Les ordinateurs des utilisateurs installent l’application desktop cliente, qui se connecte au serveur via l’URL configurée. Voir [INSTALLATION-CLIENT.md](INSTALLATION-CLIENT.md) pour le guide d’installation côté PC.

## Prérequis

1. Un VPS OVH avec un accès SSH.
2. Un reverse proxy HTTPS (recommandé) type Nginx.
3. Une base PostgreSQL sur le VPS (au même endroit ou accessible en réseau).

## Installer PostgreSQL sur le VPS (Ubuntu)

Depuis le VPS (SSH) :

```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Créer un utilisateur + base dédiée (exemple) :

```bash
sudo -u postgres psql -c "CREATE USER duerp WITH PASSWORD 'REMPLACE_MOT_DE_PASSE';"
sudo -u postgres psql -c "CREATE DATABASE duerp OWNER duerp;"
```

Si l’app et la DB tournent sur la même machine, garde PostgreSQL en écoute locale (par défaut souvent en `localhost`), ce qui est plus sûr.

Puis définis côté VPS :

```bash
export DATABASE_URL="postgres://duerp:REMPLACE_MOT_DE_PASSE@127.0.0.1:5432/duerp"
```

## Variables d’environnement (côté VPS)

Le backend s’attend à :

- `DATABASE_URL` : URL Postgres de la base centrale.
- `SESSION_SECRET` : secret pour les sessions (obligatoire pour login).
- `OPENAI_API_KEY` : clé OpenAI (pour les fonctionnalités IA).
- `OPENAI_MODEL` : (optionnel) modèle, ex: `gpt-4o-mini`.
- `PORT` : (optionnel) port de l’app Node (souvent `5000` par défaut).

Synchronisation multi-PC (optionnel) :

- `DUERP_SYNC_SECRET` : secret interne pour la synchronisation des `outbox_events` entre instances.

Sécurité cookies :

- `SESSION_COOKIE_SECURE=true` si et seulement si tu termines HTTPS sur le reverse proxy (recommandé).

## Migrations

Le schéma n’est pas toujours appliqué automatiquement en prod.

Sur le VPS, après provision de `DATABASE_URL` :

```bash
npx drizzle-kit push --force
```

## Récupération des données Railway (Postgres -> VPS Postgres)

Si tu veux remplacer la base centrale Railway par celle du VPS (en conservant aussi la logique `outbox_events` pour que la sync continue), utilise le script :

```bash
npx ts-node scripts/migrate-railway-to-postgres.ts --replace \
  --sourceDatabaseUrl="POSTGRES_URL_RAILWAY" \
  --destDatabaseUrl="POSTGRES_URL_VPS"
```

Note : le `--replace` tronque la base VPS avant import.

## Lancer le serveur

Depuis le dossier du projet, construire puis lancer :

```bash
npm run build
node dist/index.js
```

Recommandé : lancer via `pm2` (ou systemd). Le serveur expose l'API et sert la SPA (interface web) ; les clients desktop et navigateurs s'y connectent.

## Reverse proxy HTTPS (Nginx)

Exemple (remplace `duerp.example.com` et `PORT`) :

```nginx
server {
  listen 443 ssl;
  server_name duerp.example.com;

  # Certificats (Let's Encrypt ou autre)
  ssl_certificate     /etc/letsencrypt/live/duerp.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/duerp.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Important :

- Active `SESSION_COOKIE_SECURE=true` sur le VPS pour que les cookies de session passent correctement en HTTPS.
- Le backend fait déjà `app.set("trust proxy", 1)`, ce qui aide derrière un proxy.

## Clients (PC)

L’application desktop est installée sur chaque ordinateur et se connecte au serveur. Au premier lancement, une fenêtre de configuration demande l’URL du serveur (ex. `https://duerp.example.com`). Aucune installation de Node.js, PostgreSQL ou autre sur les PC.

Voir [INSTALLATION-CLIENT.md](INSTALLATION-CLIENT.md) pour le guide complet.

