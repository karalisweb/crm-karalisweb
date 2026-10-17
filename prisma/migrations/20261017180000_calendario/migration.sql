-- Calendario di Alessio (v3.47) — SOLO ADDITIVA e idempotente. Si applica a mano (psql).
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "calendar_ics_url" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "calendar_synced_at" TIMESTAMP(3);
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "calendar_sync_error" TEXT;
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "calendar_sync_info" TEXT;
