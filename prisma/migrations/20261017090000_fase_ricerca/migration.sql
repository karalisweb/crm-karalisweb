-- Fase 1 Ricerca (v3.47) — SOLO ADDITIVA e idempotente. Si applica a mano (psql).

-- AlterTable
ALTER TABLE "bni_chapters" ADD COLUMN IF NOT EXISTS "sede" TEXT;

-- AlterTable
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "cosa_fa" TEXT,
ADD COLUMN IF NOT EXISTS "indicato_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "indicato_da" TEXT,
ADD COLUMN IF NOT EXISTS "lead_id" TEXT,
ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT,
ADD COLUMN IF NOT EXISTS "prossimo_passo" TEXT,
ADD COLUMN IF NOT EXISTS "prossimo_passo_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "referenze_puo_dare" TEXT,
ADD COLUMN IF NOT EXISTS "rete_letta_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "one_to_ones" ADD COLUMN IF NOT EXISTS "formato" TEXT,
ADD COLUMN IF NOT EXISTS "promesse" TEXT,
ADD COLUMN IF NOT EXISTS "riassunto" TEXT,
ADD COLUMN IF NOT EXISTS "trascrizione" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "casi_studio" (
    "id" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "pdf_nome" TEXT NOT NULL,
    "pdf" BYTEA,
    "testo" TEXT,
    "storia" TEXT,
    "settore" TEXT,
    "azienda_nome" TEXT,
    "azienda_sito" TEXT,
    "persona_nome" TEXT,
    "persona_ruolo" TEXT,
    "persona_linkedin" TEXT,
    "termini" JSONB NOT NULL DEFAULT '[]',
    "stato" TEXT NOT NULL DEFAULT 'DA_CONFERMARE',
    "valido_fino" TIMESTAMP(3),
    "cost_cents" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "confermato_at" TIMESTAMP(3),

    CONSTRAINT "casi_studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "chiavi_ricerca" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valore" TEXT NOT NULL,
    "termini" JSONB NOT NULL DEFAULT '[]',
    "caso_studio_id" TEXT,
    "bni_membro_id" TEXT,
    "attiva" BOOLEAN NOT NULL DEFAULT true,
    "scade_at" TIMESTAMP(3),
    "zona_indice" INTEGER NOT NULL DEFAULT 0,
    "usi" INTEGER NOT NULL DEFAULT 0,
    "trovati" INTEGER NOT NULL DEFAULT 0,
    "ultimo_uso_at" TIMESTAMP(3),
    "esaurita_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chiavi_ricerca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "persone" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ruolo" TEXT,
    "azienda_nome" TEXT,
    "linkedin_url" TEXT,
    "localita" TEXT,
    "lead_id" TEXT,
    "bni_membro_id" TEXT,
    "contatto_in_comune" TEXT,
    "chiave_id" TEXT,
    "fonte" TEXT NOT NULL DEFAULT 'linkedin',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ritrovamenti" (
    "id" TEXT NOT NULL,
    "chiave_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "persona_id" TEXT,
    "canale" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ritrovamenti_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bni_presentazioni" (
    "id" TEXT NOT NULL,
    "membro_id" TEXT NOT NULL,
    "persona_id" TEXT,
    "nome" TEXT NOT NULL,
    "ruolo" TEXT,
    "linkedin_url" TEXT,
    "perche" TEXT,
    "stato" TEXT NOT NULL DEFAULT 'DA_CHIEDERE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bni_presentazioni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chiavi_ricerca_attiva_ultimo_uso_at_idx" ON "chiavi_ricerca"("attiva", "ultimo_uso_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "persone_linkedin_url_key" ON "persone"("linkedin_url");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "persone_lead_id_idx" ON "persone"("lead_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "persone_bni_membro_id_idx" ON "persone"("bni_membro_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ritrovamenti_chiave_id_idx" ON "ritrovamenti"("chiave_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ritrovamenti_lead_id_idx" ON "ritrovamenti"("lead_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bni_presentazioni_membro_id_idx" ON "bni_presentazioni"("membro_id");

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "bni_membri" ADD CONSTRAINT "bni_membri_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "chiavi_ricerca" ADD CONSTRAINT "chiavi_ricerca_caso_studio_id_fkey" FOREIGN KEY ("caso_studio_id") REFERENCES "casi_studio"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "chiavi_ricerca" ADD CONSTRAINT "chiavi_ricerca_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "persone" ADD CONSTRAINT "persone_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "persone" ADD CONSTRAINT "persone_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "persone" ADD CONSTRAINT "persone_chiave_id_fkey" FOREIGN KEY ("chiave_id") REFERENCES "chiavi_ricerca"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ritrovamenti" ADD CONSTRAINT "ritrovamenti_chiave_id_fkey" FOREIGN KEY ("chiave_id") REFERENCES "chiavi_ricerca"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ritrovamenti" ADD CONSTRAINT "ritrovamenti_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "ritrovamenti" ADD CONSTRAINT "ritrovamenti_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persone"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "bni_presentazioni" ADD CONSTRAINT "bni_presentazioni_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "bni_presentazioni" ADD CONSTRAINT "bni_presentazioni_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persone"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


