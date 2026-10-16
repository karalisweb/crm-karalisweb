-- Pipeline di vendita (v3.46) — SOLO ADDITIVA e idempotente. Si applica a mano (psql).

DO $$ BEGIN CREATE TYPE "TrattativaStadio" AS ENUM ('CALL_FISSATA', 'CALL_FATTA', 'FOLLOW_UP', 'LETTERA_INVIATA', 'RECALL', 'INCARICO', 'EXIT', 'NURTURING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "agent_reports" ADD COLUMN IF NOT EXISTS     "trattativa_id" TEXT;

ALTER TABLE "agent_runs" ADD COLUMN IF NOT EXISTS     "trattativa_id" TEXT;

ALTER TABLE "approval_items" ADD COLUMN IF NOT EXISTS     "trattativa_id" TEXT;

CREATE TABLE IF NOT EXISTS "trattative" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "origine" TEXT NOT NULL,
    "stadio" "TrattativaStadio" NOT NULL DEFAULT 'CALL_FISSATA',
    "lead_id" TEXT,
    "bni_membro_id" TEXT,
    "opportunita_id" TEXT,
    "referente" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "call_at" TIMESTAMP(3),
    "trascrizione" TEXT,
    "valore_euro" INTEGER,
    "prossimo_passo" TEXT,
    "prossima_data" TIMESTAMP(3),
    "recall_fatti" INTEGER NOT NULL DEFAULT 0,
    "motivo_uscita" TEXT,
    "ultimo_nurturing_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "chiusa_at" TIMESTAMP(3),

    CONSTRAINT "trattative_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trattativa_eventi" (
    "id" TEXT NOT NULL,
    "trattativa_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "testo" TEXT,
    "da" TEXT,
    "a" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "trattativa_eventi_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trattative_stadio_prossima_data_idx" ON "trattative"("stadio", "prossima_data");

CREATE INDEX IF NOT EXISTS "trattative_lead_id_idx" ON "trattative"("lead_id");

CREATE INDEX IF NOT EXISTS "trattativa_eventi_trattativa_id_created_at_idx" ON "trattativa_eventi"("trattativa_id", "created_at");

CREATE INDEX IF NOT EXISTS "agent_reports_trattativa_id_idx" ON "agent_reports"("trattativa_id");

CREATE INDEX IF NOT EXISTS "agent_runs_trattativa_id_idx" ON "agent_runs"("trattativa_id");

CREATE INDEX IF NOT EXISTS "approval_items_trattativa_id_idx" ON "approval_items"("trattativa_id");

DO $$ BEGIN ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_trattativa_id_fkey" FOREIGN KEY ("trattativa_id") REFERENCES "trattative"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_trattativa_id_fkey" FOREIGN KEY ("trattativa_id") REFERENCES "trattative"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_trattativa_id_fkey" FOREIGN KEY ("trattativa_id") REFERENCES "trattative"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "trattative" ADD CONSTRAINT "trattative_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "trattative" ADD CONSTRAINT "trattative_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "trattative" ADD CONSTRAINT "trattative_opportunita_id_fkey" FOREIGN KEY ("opportunita_id") REFERENCES "opportunita"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "trattativa_eventi" ADD CONSTRAINT "trattativa_eventi_trattativa_id_fkey" FOREIGN KEY ("trattativa_id") REFERENCES "trattative"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
