#!/usr/bin/env bash
# Mette sul server il token di Claude per l'agente di browser (v3.134). Una volta l'anno.
# 1. Nel Terminale del Mac:  claude setup-token   (si apre il browser, accedi, copia il token che stampa)
# 2. Poi:                    ./scripts/agente-server-token.sh   e incolla il token (non si vede mentre lo incolli)
# Il token va dritto in /home/agente/.config/claude-token sul server: non resta sul Mac, né in chat, né nel repo.
set -euo pipefail
VPS_HOST="root@185.192.97.108"
read -r -s -p "Incolla il token di Claude e premi Invio: " TOKEN; echo
[ -n "$TOKEN" ] || { echo "Token vuoto, niente da fare." >&2; exit 1; }
printf '%s' "$TOKEN" | ssh "$VPS_HOST" 'umask 077; cat > /home/agente/.config/claude-token && chown agente:agente /home/agente/.config/claude-token && echo "Token salvato sul server."'
unset TOKEN
