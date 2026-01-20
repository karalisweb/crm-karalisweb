
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'NO_WEBSITE', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('NEW', 'TO_CALL', 'CALLED', 'INTERESTED', 'AUDIT_SENT', 'MEETING', 'PROPOSAL', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CALL', 'NOTE', 'EMAIL_SENT', 'MEETING', 'PROPOSAL_SENT', 'STAGE_CHANGE');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('ANSWERED', 'NO_ANSWER', 'BUSY', 'NOT_INTERESTED', 'CALLBACK', 'INTERESTED');

-- CreateEnum
CREATE TYPE "SearchStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommercialTag" AS ENUM ('ADS_ATTIVE_CONTROLLO_ASSENTE', 'TRAFFICO_SENZA_DIREZIONE', 'STRUTTURA_OK_NON_PRIORITIZZATA', 'NON_TARGET');

-- CreateEnum
CREATE TYPE "Objection" AS ENUM ('BUDGET', 'TIMING', 'ALREADY_HAVE', 'NOT_INTERESTED', 'NEED_TO_THINK', 'DECISION_MAKER', 'BAD_EXPERIENCE', 'NO_NEED', 'OTHER');

-- CreateEnum
CREATE TYPE "NextStepType" AS ENUM ('CALLBACK', 'SEND_INFO', 'MEETING', 'PROPOSAL', 'WAIT', 'CLOSE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "category" TEXT,
    "google_rating" DECIMAL(2,1),
    "google_reviews_count" INTEGER,
    "google_maps_url" TEXT,
    "place_id" TEXT,
    "audit_status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "audit_completed_at" TIMESTAMP(3),
    "opportunity_score" INTEGER,
    "audit_data" JSONB,
    "talking_points" TEXT[],
    "commercial_tag" "CommercialTag",
    "commercial_tag_reason" TEXT,
    "commercial_signals" JSONB,
    "commercial_priority" INTEGER,
    "is_callable" BOOLEAN NOT NULL DEFAULT false,
    "pipeline_stage" "PipelineStage" NOT NULL DEFAULT 'NEW',
    "lost_reason" TEXT,
    "last_call_outcome" "CallOutcome",
    "last_call_notes" TEXT,
    "main_objection" "Objection",
    "objection_notes" TEXT,
    "next_step_type" "NextStepType",
    "next_step_notes" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "next_followup_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "source" TEXT NOT NULL DEFAULT 'google_maps',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "search_id" TEXT,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "outcome" "CallOutcome",
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" TEXT NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "searches" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "apify_run_id" TEXT,
    "status" "SearchStatus" NOT NULL DEFAULT 'PENDING',
    "leads_found" INTEGER NOT NULL DEFAULT 0,
    "leads_with_website" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_categories" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏢',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_place_id_key" ON "leads"("place_id");

-- CreateIndex
CREATE INDEX "idx_leads_score" ON "leads"("opportunity_score" DESC);

-- CreateIndex
CREATE INDEX "idx_leads_stage" ON "leads"("pipeline_stage");

-- CreateIndex
CREATE INDEX "idx_leads_audit_status" ON "leads"("audit_status");

-- CreateIndex
CREATE INDEX "idx_leads_commercial_tag" ON "leads"("commercial_tag");

-- CreateIndex
CREATE INDEX "idx_leads_commercial_priority" ON "leads"("commercial_priority");

-- CreateIndex
CREATE INDEX "idx_leads_callable" ON "leads"("is_callable");

-- CreateIndex
CREATE INDEX "idx_activities_lead" ON "activities"("lead_id");

-- CreateIndex
CREATE INDEX "idx_tasks_due" ON "tasks"("due_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "search_categories_label_key" ON "search_categories"("label");

-- CreateIndex
CREATE UNIQUE INDEX "search_locations_name_key" ON "search_locations"("name");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_search_id_fkey" FOREIGN KEY ("search_id") REFERENCES "searches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

