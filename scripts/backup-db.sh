#!/bin/bash
# backup-db.sh — Backup PostgreSQL con rotazione (mantiene ultimi 30)
#
# Uso:
#   ./scripts/backup-db.sh
#   0 3 * * * cd /opt/sales-app && ./scripts/backup-db.sh  # crontab
#
# Variabili d'ambiente richieste:
#   DATABASE_URL — connection string PostgreSQL

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/sales-app/backups}"
MAX_BACKUPS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sales_crm_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Estrai host/db/user dalla DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
  echo "[BACKUP] Errore: DATABASE_URL non configurata"
  exit 1
fi

echo "[BACKUP] Avvio backup: $FILENAME"

# pg_dump con compressione gzip
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[BACKUP] Completato: $FILENAME ($SIZE)"

# Rotazione: elimina i backup più vecchi
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/sales_crm_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
  EXCESS=$((BACKUP_COUNT - MAX_BACKUPS))
  ls -1t "$BACKUP_DIR"/sales_crm_*.sql.gz | tail -n "$EXCESS" | xargs rm -f
  echo "[BACKUP] Rimossi $EXCESS backup vecchi (mantenuti ultimi $MAX_BACKUPS)"
fi

echo "[BACKUP] Done. Backup attivi: $(ls -1 "$BACKUP_DIR"/sales_crm_*.sql.gz | wc -l)"
