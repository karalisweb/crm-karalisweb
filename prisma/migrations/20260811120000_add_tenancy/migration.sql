-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_OPERATOR', 'ORG_OWNER', 'COMPANY_OWNER', 'COMPANY_MEMBER', 'PROJECT_MEMBER', 'GUEST_LINK');

-- CreateEnum
CREATE TYPE "ScopeType" AS ENUM ('GLOBAL', 'ORGANIZATION', 'COMPANY', 'PROJECT', 'RESOURCE');

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "company_id" TEXT;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "vat_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects_core" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "value_proposition" TEXT,
    "tone_of_voice" TEXT,
    "reference_contact" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_core_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licences" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'standard',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_projects" INTEGER NOT NULL DEFAULT 2,
    "max_users" INTEGER NOT NULL DEFAULT 3,
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "scope_type" "ScopeType" NOT NULL,
    "scope_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "idx_companies_org" ON "companies"("organization_id");

-- CreateIndex
CREATE INDEX "idx_projects_company" ON "projects_core"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_core_company_id_slug_key" ON "projects_core"("company_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "licences_company_id_key" ON "licences"("company_id");

-- CreateIndex
CREATE INDEX "idx_membership_user" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "idx_membership_scope" ON "memberships"("scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_role_scope_type_scope_id_key" ON "memberships"("user_id", "role", "scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "idx_subjects_company" ON "subjects"("company_id");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects_core" ADD CONSTRAINT "projects_core_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licences" ADD CONSTRAINT "licences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

