#!/usr/bin/env bash
set -euo pipefail

# Déploiement VPS (OVH) - lance les migrations puis démarre le serveur.
# Hypothèses :
# - Le dossier contient déjà `dist/` (build fait avant, ou artefacts copiés).
# - Les variables d'env sont disponibles (DATABASE_URL, SESSION_SECRET, OPENAI_API_KEY, DUERP_SYNC_SECRET, etc.).
# - pm2 est installé globalement (ou accessible via `npx pm2`).

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-5000}"

echo "==> Migrations (drizzle-kit push --force)"
npx drizzle-kit push --force

echo "==> Démarrage serveur (pm2)"
if pm2 describe duerp >/dev/null 2>&1; then
  pm2 restart duerp
else
  # `--update-env` évite de devoir redémarrer manuellement si env change.
  pm2 start "node dist/index.js" --name duerp --time --update-env
fi

echo "==> OK"

