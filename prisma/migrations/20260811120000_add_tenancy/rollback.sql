-- ROLLBACK di 20260811120000_add_tenancy
-- Scritto PRIMA dell'esecuzione (regola 0.8 del piano).
--
-- Sicuro: la migrazione e additiva. La sola colonna aggiunta a una tabella
-- esistente e subjects.company_id, nullable: eliminarla non tocca altri dati.
-- Le cinque tabelle nuove sono vuote finche non si esegue il seed della
-- tenancy, e il loro contenuto e comunque ricostruibile.

BEGIN;

ALTER TABLE IF EXISTS "memberships"    DROP CONSTRAINT IF EXISTS "memberships_user_id_fkey";
ALTER TABLE IF EXISTS "licences"       DROP CONSTRAINT IF EXISTS "licences_company_id_fkey";
ALTER TABLE IF EXISTS "projects_core"  DROP CONSTRAINT IF EXISTS "projects_core_company_id_fkey";
ALTER TABLE IF EXISTS "companies"      DROP CONSTRAINT IF EXISTS "companies_organization_id_fkey";
ALTER TABLE IF EXISTS "subjects"       DROP CONSTRAINT IF EXISTS "subjects_company_id_fkey";

DROP INDEX IF EXISTS "idx_subjects_company";
ALTER TABLE IF EXISTS "subjects" DROP COLUMN IF EXISTS "company_id";

DROP TABLE IF EXISTS "memberships";
DROP TABLE IF EXISTS "licences";
DROP TABLE IF EXISTS "projects_core";
DROP TABLE IF EXISTS "companies";
DROP TABLE IF EXISTS "organizations";

DROP TYPE IF EXISTS "ScopeType";
DROP TYPE IF EXISTS "MembershipRole";
DROP TYPE IF EXISTS "TenantStatus";

COMMIT;
