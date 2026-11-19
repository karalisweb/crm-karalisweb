#!/bin/bash
# Comando unico dell'agente di browser sul server per parlare con il CRM (v3.134).
#   crm-agenti.sh lavori [N]        → prende fino a N lavori e li stampa in JSON
#                                      (dalle 22 alle 8, ora italiana, solo i lavori che leggono)
#   crm-agenti.sh referto FILE.json → consegna un referto (JSON: runId, esito, referto|errore)
# La chiave resta in ~/.config/crm.env e non viene mai stampata.
set -euo pipefail
set -a; . "$HOME/.config/crm.env"; set +a
URL="${AGENTI_URL:-http://127.0.0.1:3003}"
case "${1:-}" in
  lavori)
    ora=$(TZ=Europe/Rome date +%-H)
    extra=""
    if [ "$ora" -ge 22 ] || [ "$ora" -lt 8 ]; then extra="&soloLettura=1"; fi
    curl -s -m 60 -H "Authorization: Bearer $AGENTI_BROWSER_KEY" "$URL/api/agenti/browser/lavori?limit=${2:-5}$extra"
    ;;
  referto)
    [ -f "${2:-}" ] || { echo "file del referto mancante" >&2; exit 1; }
    curl -s -m 60 -X POST -H "Authorization: Bearer $AGENTI_BROWSER_KEY" -H "Content-Type: application/json" --data @"$2" "$URL/api/agenti/browser/referto"
    ;;
  *) echo "uso: crm-agenti.sh lavori [N] | referto FILE.json" >&2; exit 2 ;;
esac
echo
