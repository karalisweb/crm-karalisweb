-- La rete al centro (v3.53.0): cerchia stretta e aziende in lavorazione. Additiva e idempotente.
-- Nessuna colonna nuova su "leads".

-- La cerchia stretta: chi Alessio conosce davvero, oltre ai membri BNI con cui ha fatto un 121 (quelli si
-- leggono da bni_membri). Una riga per persona segnata "lo conosco".
CREATE TABLE IF NOT EXISTS "cerchia" (
  "id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "linkedin_url" TEXT,
  "nota" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cerchia_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "cerchia_nome_idx" ON "cerchia"("nome");
-- Tolta dalla cerchia: non si cancella, si segna.
ALTER TABLE "cerchia" ADD COLUMN IF NOT EXISTS "rimosso_at" TIMESTAMP(3);

-- Le aziende in lavorazione (15 il primo mese, 30 dal secondo) con la loro fase e il ponte.
CREATE TABLE IF NOT EXISTS "lavorazioni" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "fase" TEXT NOT NULL DEFAULT 'MAPPATA',
  "strada" TEXT,
  "decisore" TEXT,
  "ponte_nome" TEXT,
  "ponte_membro_id" TEXT,
  "ponti_provati" JSONB NOT NULL DEFAULT '[]',
  "tentativi" INTEGER NOT NULL DEFAULT 0,
  "chiesta_at" TIMESTAMP(3),
  "promemoria_at" TIMESTAMP(3),
  "scaldata_at" TIMESTAMP(3),
  "presentato_at" TIMESTAMP(3),
  "incontro_at" TIMESTAMP(3),
  "proposta_at" TIMESTAMP(3),
  "cliente_at" TIMESTAMP(3),
  "pausa_fino" TIMESTAMP(3),
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lavorazioni_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "lavorazioni_lead_id_key" ON "lavorazioni"("lead_id");
CREATE INDEX IF NOT EXISTS "lavorazioni_fase_idx" ON "lavorazioni"("fase");
DO $$ BEGIN
  ALTER TABLE "lavorazioni" ADD CONSTRAINT "lavorazioni_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
