-- Collegamento LinkedIn dei membri BNI (v3.47) — SOLO ADDITIVA e idempotente.
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "linkedin_stato" TEXT;
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "linkedin_stato_at" TIMESTAMP(3);
