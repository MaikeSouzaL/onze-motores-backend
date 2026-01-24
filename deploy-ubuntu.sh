#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   ./deploy-ubuntu.sh [branch]
# Ex:
#   ./deploy-ubuntu.sh main

BRANCH="${1:-main}"
APP_DIR="/var/www/backend"

cd "$APP_DIR"

echo "[deploy] Atualizando código (branch: $BRANCH)"
# Garante que está na branch correta
git fetch --all --prune
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "[deploy] Instalando dependências (produção)"
# Em produção, não precisa do nodemon
npm ci --omit=dev

echo "[deploy] Reiniciando PM2"
# Preferência: ecosystem.config.json (não deve estar no git; fica só na VPS)
if [ -f "ecosystem.config.json" ]; then
  pm2 start ecosystem.config.json --update-env || pm2 restart ecosystem.config.json --update-env
else
  # Fallback por nome do app
  pm2 restart onze-motores-api --update-env
fi

pm2 save

echo "[deploy] Health check"
if command -v curl >/dev/null 2>&1; then
  curl -fsS "http://127.0.0.1:4882/api/health" >/dev/null
  echo "[deploy] OK: backend respondeu no /api/health"
else
  echo "[deploy] curl não instalado; pulei health check"
fi

echo "[deploy] Concluído"
