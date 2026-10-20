-- Motore 121 (v3.52.0): il flusso BNI-first deciso con Alessio il 2026-10-20.
-- Additiva e idempotente: si può rieseguire. Nessuna colonna nuova su "leads".

-- Il permesso del collega di mestiere, per capitolo (null = non ancora chiesto).
ALTER TABLE "bni_chapters" ADD COLUMN IF NOT EXISTS "permesso" TEXT;
ALTER TABLE "bni_chapters" ADD COLUMN IF NOT EXISTS "permesso_at" TIMESTAMP(3);

-- Passo 3: invito alle newsletter (LinkedIn e Substack) dopo il collegamento.
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "newsletter_at" TIMESTAMP(3);
-- Passo 4: quando l'azienda del membro è stata studiata (il lead è in bni_membri.lead_id).
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "studiato_at" TIMESTAMP(3);

-- Passo 5 e seguito: la presentazione con i punti di contatto e l'imbuto.
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "lead_id" TEXT;
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "punti_contatto" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "forza" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "confermata" BOOLEAN;
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "chiesta_at" TIMESTAMP(3);
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "presentato_at" TIMESTAMP(3);
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "incontro_at" TIMESTAMP(3);
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "proposta_at" TIMESTAMP(3);
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "cliente_at" TIMESTAMP(3);
ALTER TABLE "bni_presentazioni" ADD COLUMN IF NOT EXISTS "esito_note" TEXT;
CREATE INDEX IF NOT EXISTS "bni_presentazioni_lead_id_idx" ON "bni_presentazioni"("lead_id");

-- Contatti da segnalare al membro (non "referenze" finché il bisogno non è verificato).
CREATE TABLE IF NOT EXISTS "bni_segnalazioni" (
  "id" TEXT NOT NULL,
  "membro_id" TEXT NOT NULL,
  "lead_id" TEXT,
  "nome" TEXT NOT NULL,
  "motivo" TEXT,
  "stato" TEXT NOT NULL DEFAULT 'DA_DARE',
  "data_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bni_segnalazioni_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "bni_segnalazioni_membro_id_idx" ON "bni_segnalazioni"("membro_id");
DO $$ BEGIN
  ALTER TABLE "bni_segnalazioni" ADD CONSTRAINT "bni_segnalazioni_membro_id_fkey"
    FOREIGN KEY ("membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
