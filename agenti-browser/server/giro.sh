#!/bin/bash
# Un giro dell'agente di browser sul server (v3.134). Lo lancia il cron dell'utente `agente` ogni ora.
# Prende fino a 10 lavori dal CRM e li fa con il Chrome del server (Playwright MCP collegato via CDP).
# Un solo giro alla volta; un giro dura al massimo 55 minuti.
set -uo pipefail
cd "$HOME"
mkdir -p log referti
LOG="$HOME/log/giro-$(TZ=Europe/Rome date +%F).log"
exec 9>/tmp/agente-giro.lock
flock -n 9 || { echo "$(TZ=Europe/Rome date '+%F %T') giro precedente ancora in corso, salto" >> "$LOG"; exit 0; }

# Il token di Claude (abbonamento di Alessio) lo mette lui con scripts/agente-server-token.sh dal Mac.
if [ ! -s "$HOME/.config/claude-token" ]; then
  echo "$(TZ=Europe/Rome date '+%F %T') manca il token di Claude: lancia scripts/agente-server-token.sh dal Mac" >> "$LOG"
  exit 1
fi
CLAUDE_CODE_OAUTH_TOKEN="$(cat "$HOME/.config/claude-token")"
export CLAUDE_CODE_OAUTH_TOKEN

# Il browser deve rispondere; se è caduto, systemd lo riavvia: qui si aspetta un poco.
for _ in 1 2 3 4 5 6; do curl -s -m 5 http://127.0.0.1:9222/json/version >/dev/null && break; sleep 10; done

# Pulizia: referti di più di 14 giorni e log di più di 30.
find "$HOME/referti" -name '*.json' -mtime +14 -delete 2>/dev/null
find "$HOME/log" -name 'giro-*.log' -mtime +30 -delete 2>/dev/null

{
  echo "=== $(TZ=Europe/Rome date '+%F %T') inizio giro"
  timeout 55m claude -p "$(cat "$HOME/prompt.md")" \
    --mcp-config "$HOME/mcp.json" --strict-mcp-config \
    --allowedTools "mcp__playwright" "Bash(/home/agente/crm-agenti.sh:*)" "Write(//home/agente/referti/**)" "Read(//home/agente/ISTRUZIONI.md)" "Read(//home/agente/referti/**)" \
    --max-turns 400 --output-format text 2>&1
  echo "=== $(TZ=Europe/Rome date '+%F %T') fine giro (uscita $?)"
} >> "$LOG"
