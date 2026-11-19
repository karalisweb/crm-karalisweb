#!/usr/bin/env bash
# Apre sul Mac lo schermo del Chrome dell'agente sul server (v3.134), per entrare in LinkedIn, Instagram e
# Facebook o per guardare cosa sta facendo. Passa da un tunnel SSH: dall'esterno lo schermo non si vede.
# Uso: ./scripts/agente-server-vista.sh   (Ctrl+C per chiudere)
set -euo pipefail
VPS_HOST="root@185.192.97.108"
echo "Apro lo schermo dell'agente: http://localhost:6080/vnc.html"
echo "Quando hai finito torna qui e premi Ctrl+C."
( sleep 3; open "http://localhost:6080/vnc.html?autoconnect=1&resize=scale" ) &
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 6080:127.0.0.1:6080 "$VPS_HOST"
