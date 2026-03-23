#!/bin/bash
# deploy-quick.sh — Deploy veloce con PM2
# Uso: ./deploy-quick.sh
set -e

cd /opt/sales-app

echo "=== 1/5 Git pull ==="
git pull origin main

echo "=== 2/5 Dipendenze ==="
npm ci --prefer-offline 2>/dev/null || npm install

echo "=== 3/5 Prisma ==="
npx prisma generate

echo "=== 4/5 Build ==="
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Copia static files nella cartella standalone (necessario per Next.js standalone)
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

echo "=== 5/5 Restart ==="
pm2 restart sales-crm --update-env 2>/dev/null || pm2 start ecosystem.config.cjs

echo ""
echo "=== Deploy OK ==="
sleep 2
curl -sf http://localhost:3003/api/health && echo " ✓" || echo "⚠ Health check fallito — pm2 logs sales-crm"
