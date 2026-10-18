-- Fase 2: nicchia prima del settore; la provincia del cliente esclusa per la nicchia. Additiva e idempotente.
ALTER TABLE "casi_studio" ADD COLUMN IF NOT EXISTS "provincia" TEXT;
ALTER TABLE "casi_studio" ADD COLUMN IF NOT EXISTS "termini_settore" JSONB NOT NULL DEFAULT '[]';
