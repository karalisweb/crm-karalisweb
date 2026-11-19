#!/usr/bin/env bash
# Scrive un codice di verifica (LinkedIn, Instagram, Facebook) nel Chrome del server dell'agente, quando dalla
# vista la tastiera non arriva al campo (v3.134). Il codice va dritto al server: non si vede, non resta da nessuna parte.
# Uso: ./scripts/agente-server-scrivi.sh
set -euo pipefail
VPS_HOST="root@185.192.97.108"
read -r -s -p "Scrivi il codice e premi Invio: " CODICE; echo
[ -n "$CODICE" ] || { echo "Codice vuoto, niente da fare." >&2; exit 1; }
printf '%s' "$CODICE" | ssh "$VPS_HOST" 'su - agente -c "node /home/agente/scrivi-campo.js codice"'
unset CODICE
