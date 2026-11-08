#!/usr/bin/env bash
# Lettura del DB di produzione, SOLO LETTURA (Alessio, 2026-11-08: "perché non puoi leggere quello che hai fatto?").
# Uso:  ./scripts/leggi-prod.sh "select count(*) from lavorazioni"
#       ./scripts/leggi-prod.sh < query.sql
# La sessione è read-only lato Postgres (default_transaction_read_only=on): INSERT/UPDATE/DELETE/DDL falliscono.
set -euo pipefail

VPS_HOST="root@185.192.97.108"
SSH_OPTS="-o ControlMaster=auto -o ControlPath=$HOME/.ssh/cm-crm-%r@%h:%p -o ControlPersist=15m -o ConnectTimeout=15"

if [ $# -gt 0 ]; then SQL="$1"; else SQL="$(cat)"; fi
[ -n "$SQL" ] || { echo "Uso: $0 \"select ...\"" >&2; exit 1; }

# Il testo SQL passa da stdin (niente quoting nella riga di comando remota).
# shellcheck disable=SC2086
printf '%s\n' "$SQL" | ssh $SSH_OPTS "$VPS_HOST" \
  'docker exec -i -e PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=60000" sales-db sh -c "psql -U \$POSTGRES_USER -d \$POSTGRES_DB -v ON_ERROR_STOP=1 -X -q -P pager=off -F \" | \" -A"'
