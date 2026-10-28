#!/usr/bin/env bash
# Deploy rapido in produzione (Alessio, 2026-10-28: "basta chiedere sta cosa del deploy").
# Pubblica sul server SOLO quello che è già su origin/main: il WIP non committato resta sul Mac.
# Passi: pull, build, copia della grafica nello standalone (senza = app "smontata"), riavvio,
# controllo che CSS e /api/health rispondano 200.
set -euo pipefail

VPS_HOST="root@185.192.97.108"
VPS_PATH="/opt/sales-app"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$HOME/.ssh/cm-crm-%r@%h:%p -o ControlPersist=15m -o ServerAliveInterval=30"

cd "$(dirname "$0")/.."
git fetch -q origin main
if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]; then
  echo "ERRORE: HEAD locale e origin/main non coincidono: fai push prima del deploy." >&2
  exit 1
fi

# shellcheck disable=SC2086
ssh $SSH_OPTS "$VPS_HOST" "bash -s" <<REMOTE
set -e
cd $VPS_PATH
git pull -q origin main
echo "server su: \$(git rev-parse --short HEAD)"
if ! NODE_OPTIONS="--max-old-space-size=4096" npm run build > /tmp/build-crm.log 2>&1; then
  echo "BUILD FALLITA"; tail -20 /tmp/build-crm.log; exit 1
fi
rm -rf .next/standalone/.next/static .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
pm2 restart sales-crm --update-env >/dev/null
sleep 6
u=\$(curl -s http://localhost:3003/login | grep -o '/_next/static/[^"]*\.css' | head -1)
css=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003\$u)
health=\$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003/api/health)
echo "css: \$css health: \$health"
[ "\$css" = 200 ] && [ "\$health" = 200 ]
REMOTE
