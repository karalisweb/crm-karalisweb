-- Squadra di agenti completa (v3.45) — SOLO ADDITIVA e idempotente. Si applica a mano (psql).
-- Referti e cassetta anche per capitoli e membri BNI; dirigenza e copertura BNI.

ALTER TABLE "agent_runs"     ADD COLUMN IF NOT EXISTS "bni_chapter_id" TEXT, ADD COLUMN IF NOT EXISTS "bni_membro_id" TEXT;
ALTER TABLE "agent_runs"     ALTER COLUMN "lead_id" DROP NOT NULL;
ALTER TABLE "agent_runs"     ADD COLUMN IF NOT EXISTS "input" JSONB;
ALTER TABLE "agent_reports"  ADD COLUMN IF NOT EXISTS "bni_chapter_id" TEXT, ADD COLUMN IF NOT EXISTS "bni_membro_id" TEXT;
ALTER TABLE "agent_reports"  ALTER COLUMN "lead_id" DROP NOT NULL;
ALTER TABLE "approval_items" ADD COLUMN IF NOT EXISTS "bni_chapter_id" TEXT, ADD COLUMN IF NOT EXISTS "bni_membro_id" TEXT;
ALTER TABLE "approval_items" ALTER COLUMN "lead_id" DROP NOT NULL;

ALTER TABLE "bni_chapters" ADD COLUMN IF NOT EXISTS "bni_connect_url" TEXT,
  ADD COLUMN IF NOT EXISTS "mapped_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "provincia" TEXT,
  ADD COLUMN IF NOT EXISTS "regione_italiana" TEXT;
ALTER TABLE "bni_membri" ADD COLUMN IF NOT EXISTS "conosciuto_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "leadership_role" TEXT;

CREATE INDEX IF NOT EXISTS "agent_reports_bni_chapter_id_agent_idx" ON "agent_reports"("bni_chapter_id", "agent");
CREATE INDEX IF NOT EXISTS "agent_reports_bni_membro_id_agent_idx" ON "agent_reports"("bni_membro_id", "agent");
CREATE INDEX IF NOT EXISTS "agent_runs_bni_chapter_id_idx" ON "agent_runs"("bni_chapter_id");
CREATE INDEX IF NOT EXISTS "agent_runs_bni_membro_id_idx" ON "agent_runs"("bni_membro_id");
CREATE INDEX IF NOT EXISTS "approval_items_bni_chapter_id_kind_idx" ON "approval_items"("bni_chapter_id", "kind");
CREATE INDEX IF NOT EXISTS "approval_items_bni_membro_id_kind_idx" ON "approval_items"("bni_membro_id", "kind");

DO $$ BEGIN ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_bni_chapter_id_fkey" FOREIGN KEY ("bni_chapter_id") REFERENCES "bni_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_bni_chapter_id_fkey" FOREIGN KEY ("bni_chapter_id") REFERENCES "bni_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_bni_chapter_id_fkey" FOREIGN KEY ("bni_chapter_id") REFERENCES "bni_chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_bni_membro_id_fkey" FOREIGN KEY ("bni_membro_id") REFERENCES "bni_membri"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Il costo di una chiamata è una frazione di centesimo: con un intero si arrotondava a zero
-- e il tetto di spesa non contava nulla. In produzione la colonna contiene solo zeri.
ALTER TABLE "agent_runs" ALTER COLUMN "cost_cents" TYPE DOUBLE PRECISION USING "cost_cents"::double precision;
