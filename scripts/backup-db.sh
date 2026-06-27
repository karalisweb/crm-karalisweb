#!/bin/bash
# backup-db.sh — Backup PostgreSQL con rotazione (mantiene ultimi 30)
#
# È il "paracadute" anti perdita-dati: viene eseguito da deploy.sh (step 7)
# PRIMA di `prisma db push --accept-data-loss`, che è potenzialmente distruttivo.
#
# Uso:
#   ./scripts/backup-db.sh
#   0 3 * * * cd /opt/sales-app && ./scripts/backup-db.sh    # crontab
#
# DATABASE_URL:
#   Se NON è già esportata nell'ambiente, viene letta automaticamente dal file
#   .env (la stessa fonte che usa Prisma via prisma.config → import "dotenv/config").
#   Questo era il bug originale: lanciato via `ssh ... "bash scripts/backup-db.sh"`
#   la shell non-interattiva NON fa il source del .env (a differenza di Prisma),
#   quindi DATABASE_URL risultava vuota e il backup veniva saltato.
#
# Strategia di dump (robusta "dentro/fuori dal container Docker"):
#   1. pg_dump sul HOST verso la connection string (default). Richiede che la
#      major di pg_dump sul host sia >= a quella del server Postgres.
#   2. Fallback: `docker exec` dentro il container Postgres (es. sales-db,
#      IP 172.18.0.2) — garantisce SEMPRE una versione di pg_dump allineata al
#      server, anche dopo un upgrade major di Postgres in cui il pg_dump del
#      host non sarebbe più compatibile.
#
# Override via env (utili per test): BACKUP_DIR, ENV_FILE, MAX_BACKUPS.

set -euo pipefail

# ── Percorsi ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$APP_ROOT/backups}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/.env}"
MAX_BACKUPS="${MAX_BACKUPS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sales_crm_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# ── 1. DATABASE_URL: dall'ambiente, altrimenti dal .env ──────────────────────
if [ -z "${DATABASE_URL:-}" ] && [ -f "$ENV_FILE" ]; then
  # Estraiamo la riga (NON facciamo `source`: il .env può contenere valori non
  # shell-safe). Prendiamo l'ULTIMA occorrenza — semantica di shell source e
  # difesa contro eventuali righe DATABASE_URL= duplicate — togliendo eventuale
  # prefisso `export `, virgolette di contorno ed eventuale CR (\r) di Windows.
  _line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENV_FILE" | tail -n1 || true)
  if [ -n "$_line" ]; then
    _line="${_line#*DATABASE_URL=}"
    _line="${_line%$'\r'}"
    case "$_line" in
      \"*\") _line="${_line#\"}"; _line="${_line%\"}";;
      \'*\') _line="${_line#\'}"; _line="${_line%\'}";;
    esac
    DATABASE_URL="$_line"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[BACKUP] Errore: DATABASE_URL non trovata (né nell'ambiente né in $ENV_FILE)"
  exit 1
fi

# ── 2. Parsing connection string ─────────────────────────────────────────────
# Formato: postgresql://user:password@host:port/dbname?params
_rest="${DATABASE_URL#*://}"
_creds="${_rest%@*}"          # user:password  (split sull'ULTIMA @)
_hostpart="${_rest##*@}"      # host:port/dbname?params

DB_USER="${_creds%%:*}"
case "$_creds" in *:*) DB_PASS="${_creds#*:}";; *) DB_PASS="";; esac

_hostport="${_hostpart%%/*}"
DB_HOST="${_hostport%%:*}"
case "$_hostport" in *:*) DB_PORT="${_hostport##*:}";; *) DB_PORT="5432";; esac

case "$_hostpart" in
  */*) _path="${_hostpart#*/}"; DB_NAME="${_path%%\?*}";;
  *)   DB_NAME="";;
esac
DB_PORT="${DB_PORT:-5432}"

if [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ] || [ -z "$DB_USER" ]; then
  echo "[BACKUP] Errore: DATABASE_URL non parsabile (host/db/user mancanti)"
  exit 1
fi

# Decodifica percent-encoding (solo %XX) per i valori passati a `docker exec`.
_urldecode() { printf '%b' "${1//%/\\x}"; }

echo "[BACKUP] Avvio backup: $FILENAME"
echo "[BACKUP] Target: ${DB_HOST}:${DB_PORT}/${DB_NAME} (user: ${DB_USER})"

TMPFILE="$BACKUP_DIR/.${FILENAME}.partial"
ERRLOG=$(mktemp)
cleanup() { rm -f "$TMPFILE" "$ERRLOG" 2>/dev/null || true; }
trap cleanup EXIT

# Un dump valido: gzip integro E contiene l'intestazione di pg_dump (così un
# gzip "vuoto" da un pg_dump fallito non passa per buono). Il `|| true` evita
# che il SIGPIPE di gzip (head chiude la pipe) inneschi set -e/pipefail.
valid_dump() {
  gzip -t "$TMPFILE" 2>/dev/null || return 1
  local head
  head=$(gzip -dc "$TMPFILE" 2>/dev/null | head -c 4096) || true
  printf '%s' "$head" | grep -q 'PostgreSQL database dump'
}

# Trova il container Postgres per il fallback docker: prima per IP corrispondente
# all'host della DATABASE_URL, poi per immagine *postgres*.
find_pg_container() {
  command -v docker >/dev/null 2>&1 || return 1
  local cid img
  for cid in $(docker ps -q 2>/dev/null); do
    if docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{"\n"}}{{end}}' "$cid" 2>/dev/null \
         | grep -qx "$DB_HOST"; then
      echo "$cid"; return 0
    fi
  done
  for cid in $(docker ps -q 2>/dev/null); do
    img=$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || true)
    case "$img" in *postgres*) echo "$cid"; return 0;; esac
  done
  return 1
}

# ── 3. Dump: prima host pg_dump, poi fallback docker exec ────────────────────
DUMP_OK=false
METHOD=""

if command -v pg_dump >/dev/null 2>&1; then
  if pg_dump "$DATABASE_URL" 2>"$ERRLOG" | gzip > "$TMPFILE" && valid_dump; then
    DUMP_OK=true; METHOD="host pg_dump"
  else
    echo "[BACKUP] host pg_dump non riuscito, provo via docker… ($(tail -n1 "$ERRLOG" 2>/dev/null))"
  fi
fi

if [ "$DUMP_OK" = false ]; then
  if CID=$(find_pg_container); then
    CNAME=$(docker inspect -f '{{.Name}}' "$CID" 2>/dev/null | sed 's#^/##' || echo "$CID")
    if docker exec -e PGPASSWORD="$(_urldecode "$DB_PASS")" "$CID" \
         pg_dump -h 127.0.0.1 -p "$DB_PORT" -U "$(_urldecode "$DB_USER")" -d "$(_urldecode "$DB_NAME")" \
         2>"$ERRLOG" | gzip > "$TMPFILE" && valid_dump; then
      DUMP_OK=true; METHOD="docker exec ($CNAME)"
    fi
  fi
fi

if [ "$DUMP_OK" != true ]; then
  echo "[BACKUP] Errore: dump fallito (host pg_dump e docker exec)."
  echo "[BACKUP] Dettagli: $(tail -n3 "$ERRLOG" 2>/dev/null)"
  exit 1
fi

# ── 4. Promozione atomica del file ───────────────────────────────────────────
mv -f "$TMPFILE" "$BACKUP_DIR/$FILENAME"
SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[BACKUP] Completato: $FILENAME ($SIZE) via $METHOD"

# ── 5. Rotazione: mantieni gli ultimi $MAX_BACKUPS ───────────────────────────
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sales_crm_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
  ls -1t "$BACKUP_DIR"/sales_crm_*.sql.gz | tail -n "$EXCESS" | xargs rm -f
  echo "[BACKUP] Rimossi $EXCESS backup vecchi (mantenuti ultimi $MAX_BACKUPS)"
fi

echo "[BACKUP] Done. Backup attivi: $(ls -1 "$BACKUP_DIR"/sales_crm_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')"
