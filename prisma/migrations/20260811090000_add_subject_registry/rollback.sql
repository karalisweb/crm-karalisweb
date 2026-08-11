-- ROLLBACK di 20260811090000_add_subject_registry
-- Scritto PRIMA dell'esecuzione, come impone la regola 0.8 del piano.
--
-- Sicuro: la migrazione è puramente additiva e nessuna applicazione scrive
-- su queste tabelle in Fase 1. Annullarla non tocca alcun dato preesistente.
-- L'unica perdita è il registro dei soggetti, che è interamente rigenerabile
-- rieseguendo l'importazione (scripts/subject-registry/import.mjs).

BEGIN;

ALTER TABLE IF EXISTS "reconciliation_candidates" DROP CONSTRAINT IF EXISTS "reconciliation_candidates_right_subject_id_fkey";
ALTER TABLE IF EXISTS "reconciliation_candidates" DROP CONSTRAINT IF EXISTS "reconciliation_candidates_left_subject_id_fkey";
ALTER TABLE IF EXISTS "subject_identities" DROP CONSTRAINT IF EXISTS "subject_identities_subject_id_fkey";

DROP TABLE IF EXISTS "reconciliation_candidates";
DROP TABLE IF EXISTS "subject_identities";
DROP TABLE IF EXISTS "subjects";

DROP TYPE IF EXISTS "ReconciliationStatus";
DROP TYPE IF EXISTS "SubjectSource";

COMMIT;
