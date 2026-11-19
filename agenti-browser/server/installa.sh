#!/bin/bash
# Installa (o aggiorna) l'agente di browser sul server (v3.134). Da root, dopo il deploy:
#   bash /opt/sales-app/agenti-browser/server/installa.sh
# Idempotente: si può rilanciare. Crea l'utente `agente`, un Chrome vero su uno schermo virtuale (:99)
# con il suo profilo (gli accessi a LinkedIn/Instagram/Facebook restano lì), la vista per Alessio
# (solo da localhost, si apre con scripts/agente-server-vista.sh dal Mac) e il cron orario.
set -euo pipefail
QUI="$(cd "$(dirname "$0")" && pwd)"
H=/home/agente

# 1. Utente senza privilegi
id -u agente >/dev/null 2>&1 || useradd -m -s /bin/bash agente
install -d -o agente -g agente -m 700 "$H/.config" "$H/referti" "$H/log" "$H/profilo"

# 2. Programmi: Chrome stabile (dal sito Google), schermo virtuale, vista VNC/noVNC, font
export DEBIAN_FRONTEND=noninteractive
if ! command -v google-chrome >/dev/null; then
  d=$(mktemp -d)
  curl -fsSL -o "$d/chrome.deb" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -q "$d/chrome.deb"
  rm -rf "$d"
fi
apt-get install -y -q xvfb x11vnc novnc websockify fonts-noto-color-emoji fonts-liberation >/dev/null

# 3. Claude Code aggiornato e Playwright MCP (versione fissa)
npm install -g -s @anthropic-ai/claude-code@latest @playwright/mcp@0.0.86 >/dev/null

# 4. File dell'agente
install -o agente -g agente -m 755 "$QUI/giro.sh" "$QUI/crm-agenti.sh" "$H/"
install -o agente -g agente -m 644 "$QUI/prompt.md" "$QUI/mcp.json" "$H/"
install -o agente -g agente -m 644 "$QUI/../ISTRUZIONI.md" "$H/ISTRUZIONI.md"

# 5. Chiave del CRM (presa dal .env del CRM, mai stampata)
if [ ! -s "$H/.config/crm.env" ]; then
  k=$(grep -h '^AGENTI_BROWSER_KEY=' /opt/sales-app/.env.local /opt/sales-app/.env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"')
  [ -n "$k" ] || { echo "AGENTI_BROWSER_KEY non trovata nel .env del CRM" >&2; exit 1; }
  umask 077
  printf 'AGENTI_BROWSER_KEY=%s\nAGENTI_URL=http://127.0.0.1:3003\n' "$k" > "$H/.config/crm.env"
  chown agente:agente "$H/.config/crm.env"
fi

# 6. Servizi: schermo, Chrome, vista
cat > /etc/systemd/system/agente-schermo.service <<'EOF'
[Unit]
Description=Agente CRM: schermo virtuale :99
[Service]
User=agente
ExecStart=/usr/bin/Xvfb :99 -screen 0 1440x900x24 -nolisten tcp
Restart=always
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/agente-chrome.service <<'EOF'
[Unit]
Description=Agente CRM: Chrome con gli accessi di Alessio
After=agente-schermo.service
Requires=agente-schermo.service
[Service]
User=agente
Environment=DISPLAY=:99 TZ=Europe/Rome LANG=it_IT.UTF-8
ExecStart=/usr/bin/google-chrome --user-data-dir=/home/agente/profilo --remote-debugging-address=127.0.0.1 --remote-debugging-port=9222 --no-first-run --no-default-browser-check --password-store=basic --lang=it-IT --window-size=1440,900 --start-maximized about:blank
Restart=always
RestartSec=10
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/agente-vnc.service <<'EOF'
[Unit]
Description=Agente CRM: vista dello schermo (solo localhost)
After=agente-schermo.service
Requires=agente-schermo.service
[Service]
User=agente
ExecStart=/usr/bin/x11vnc -display :99 -localhost -rfbport 5901 -nopw -forever -shared -quiet
Restart=always
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/agente-novnc.service <<'EOF'
[Unit]
Description=Agente CRM: vista nel browser (solo localhost)
After=agente-vnc.service
[Service]
User=agente
ExecStart=/usr/bin/websockify --web /usr/share/novnc 127.0.0.1:6080 127.0.0.1:5901
Restart=always
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now agente-schermo agente-chrome agente-vnc agente-novnc

# 7. Cron: un giro ogni ora, giorno e notte (di notte solo lavori che leggono: lo decide crm-agenti.sh)
( crontab -u agente -l 2>/dev/null | grep -v 'giro.sh' ; echo '7 * * * * /home/agente/giro.sh' ) | crontab -u agente -

echo "agente installato. Chrome: $(curl -s -m 5 http://127.0.0.1:9222/json/version | grep -o '"Browser": *"[^"]*"' || echo 'non risponde')"
[ -s "$H/.config/claude-token" ] && echo "token di Claude: presente" || echo "token di Claude: MANCA (scripts/agente-server-token.sh dal Mac)"
