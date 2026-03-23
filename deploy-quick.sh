#!/bin/bash
# deploy-quick.sh — Deploy veloce senza OOM
# Build sull'host (dove c'è abbastanza RAM), Docker solo per eseguire.
#
# Uso: ./deploy-quick.sh

set -e

echo "=== 1/5 Git pull ==="
git pull origin main

echo "=== 2/5 Install dipendenze ==="
npm ci --prefer-offline 2>/dev/null || npm install

echo "=== 3/5 Prisma generate ==="
npx prisma generate

echo "=== 4/5 Build Next.js (host) ==="
NODE_OPTIONS="--max-old-space-size=4096" npm run build

echo "=== 5/5 Docker rebuild + restart ==="
docker compose build app
docker compose up -d app

echo ""
echo "=== Deploy completato! ==="
sleep 3
curl -s http://localhost:3003/api/health && echo "" || echo "Health check fallito — controlla i log con: docker compose logs app"
