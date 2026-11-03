-- Vendita: la fila configurabile (v3.93) — SOLO ADDITIVA e idempotente. Si applica a mano (psql).
-- ADD VALUE non può stare in una transazione insieme ad altro: va lanciato da solo (psql in autocommit lo fa).

ALTER TYPE "TrattativaStadio" ADD VALUE IF NOT EXISTS 'RICHIESTA_INFO' BEFORE 'CALL_FISSATA';

ALTER TABLE "trattative" ADD COLUMN IF NOT EXISTS "passo" TEXT;
ALTER TABLE "trattative" ADD COLUMN IF NOT EXISTS "passo_dal" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "vendita_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "passi" JSONB NOT NULL,
    "origini" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendita_config_pkey" PRIMARY KEY ("id")
);
