-- Squadra di agenti (v3.44) — SOLO ADDITIVA e idempotente.
-- Si applica a mano (psql) prima del deploy: il DB di produzione contiene tabelle che
-- lo schema attuale non conosce (module_entitlements, colonne di projects_core) e un
-- `prisma db push --accept-data-loss` le cancellerebbe.

DO $$ BEGIN CREATE TYPE "AgentRunStatus" AS ENUM ('IN_CODA', 'IN_CORSO', 'FATTO', 'FALLITO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AgentConfidence" AS ENUM ('ALTA', 'MEDIA', 'BASSA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ApprovalStatus" AS ENUM ('IN_ATTESA', 'APPROVATO', 'SCARTATO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "agent_runs" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'IN_CODA',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "cost_cents" INTEGER NOT NULL DEFAULT 0,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "agent_reports" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "run_id" TEXT,
    "summary" TEXT NOT NULL,
    "findings" JSONB NOT NULL,
    "levers" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "confidence" "AgentConfidence" NOT NULL DEFAULT 'MEDIA',
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agent_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "approval_items" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'IN_ATTESA',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "decided_by" TEXT,
    CONSTRAINT "approval_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agent_runs_status_queued_at_idx" ON "agent_runs"("status", "queued_at");
CREATE INDEX IF NOT EXISTS "agent_runs_lead_id_agent_idx" ON "agent_runs"("lead_id", "agent");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_reports_run_id_key" ON "agent_reports"("run_id");
CREATE INDEX IF NOT EXISTS "agent_reports_lead_id_agent_collected_at_idx" ON "agent_reports"("lead_id", "agent", "collected_at");
CREATE INDEX IF NOT EXISTS "approval_items_status_created_at_idx" ON "approval_items"("status", "created_at");
CREATE INDEX IF NOT EXISTS "approval_items_lead_id_kind_idx" ON "approval_items"("lead_id", "kind");

DO $$ BEGIN ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "agent_reports" ADD CONSTRAINT "agent_reports_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "approval_items" ADD CONSTRAINT "approval_items_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
