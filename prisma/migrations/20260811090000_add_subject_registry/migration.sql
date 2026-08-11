-- CreateEnum
CREATE TYPE "SubjectSource" AS ENUM ('crm_lead', 'crm_opportunita', 'crm_bnimembro', 'gads_account', 'seoi_client', 'hub_project');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('PENDING', 'MERGED', 'REJECTED');

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "google_place_id" TEXT,
    "primary_domain" TEXT,
    "vat_number" TEXT,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_identities" (
    "id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "source" "SubjectSource" NOT NULL,
    "external_id" TEXT NOT NULL,
    "payload" JSONB,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_candidates" (
    "id" TEXT NOT NULL,
    "left_subject_id" TEXT NOT NULL,
    "right_subject_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "evidence" JSONB,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "decided_at" TIMESTAMP(3),
    "decided_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_google_place_id_key" ON "subjects"("google_place_id");

-- CreateIndex
CREATE INDEX "idx_subjects_domain" ON "subjects"("primary_domain");

-- CreateIndex
CREATE INDEX "idx_subjects_name" ON "subjects"("display_name");

-- CreateIndex
CREATE INDEX "idx_identity_subject" ON "subject_identities"("subject_id");

-- CreateIndex
CREATE INDEX "idx_identity_source" ON "subject_identities"("source");

-- CreateIndex
CREATE UNIQUE INDEX "subject_identities_source_external_id_key" ON "subject_identities"("source", "external_id");

-- CreateIndex
CREATE INDEX "idx_recon_status" ON "reconciliation_candidates"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_candidates_left_subject_id_right_subject_id_key" ON "reconciliation_candidates"("left_subject_id", "right_subject_id");

-- AddForeignKey
ALTER TABLE "subject_identities" ADD CONSTRAINT "subject_identities_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_candidates" ADD CONSTRAINT "reconciliation_candidates_left_subject_id_fkey" FOREIGN KEY ("left_subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_candidates" ADD CONSTRAINT "reconciliation_candidates_right_subject_id_fkey" FOREIGN KEY ("right_subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

