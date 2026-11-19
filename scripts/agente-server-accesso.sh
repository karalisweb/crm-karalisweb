#!/usr/bin/env bash
# Mette email e password nella pagina di accesso aperta nel Chrome del server dell'agente (LinkedIn, Instagram,
# Facebook), quando dalla vista la tastiera storpia i simboli (v3.134). La password non si vede e va dritta al
# server: non resta sul Mac, né nei log, né in chat.
# Uso: ./scripts/agente-server-accesso.sh
set -euo pipefail
VPS_HOST="root@185.192.97.108"
read -r -p "Email (o nome utente): " UTENTE
read -r -s -p "Password (mentre scrivi non si vede): " PASSWORD; echo
[ -n "$UTENTE" ] && [ -n "$PASSWORD" ] || { echo "Servono email e password." >&2; exit 1; }
printf '%s\n%s' "$UTENTE" "$PASSWORD" | ssh "$VPS_HOST" 'su - agente -c "node /home/agente/scrivi-campo.js accesso"'
unset PASSWORD
