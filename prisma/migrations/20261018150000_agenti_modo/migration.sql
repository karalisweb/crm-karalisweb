-- Ogni agente dell'analisi: automatico o a mano (scelta di Alessio). Additiva e idempotente.
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "agenti_modo" JSONB NOT NULL DEFAULT '{}';
