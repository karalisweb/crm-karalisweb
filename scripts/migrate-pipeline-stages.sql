-- ============================================================
-- MIGRAZIONE DATABASE: Nuova Pipeline Video Outreach
-- ============================================================
-- PostgreSQL non permette di usare ALTER TYPE ADD VALUE
-- nella stessa transazione. Approccio: convertiamo via TEXT.
--
-- BACKUP PRIMA DI ESEGUIRE:
--   pg_dump -U alessio sales_app > backup_pre_migration.sql
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Converti colonna pipeline_stage da enum a TEXT
-- ============================================================
ALTER TABLE leads ALTER COLUMN pipeline_stage DROP DEFAULT;
ALTER TABLE leads ALTER COLUMN pipeline_stage TYPE TEXT USING pipeline_stage::TEXT;

-- ============================================================
-- STEP 2: Mappa vecchi stage → nuovi stage (su colonna TEXT)
-- ============================================================
UPDATE leads SET pipeline_stage = 'NUOVO'            WHERE pipeline_stage = 'NEW';
UPDATE leads SET pipeline_stage = 'DA_QUALIFICARE'   WHERE pipeline_stage = 'DA_CHIAMARE';
UPDATE leads SET pipeline_stage = 'DA_QUALIFICARE'   WHERE pipeline_stage = 'DA_VERIFICARE';
UPDATE leads SET pipeline_stage = 'DA_QUALIFICARE'   WHERE pipeline_stage = 'RICHIAMARE';
UPDATE leads SET pipeline_stage = 'PERSO'            WHERE pipeline_stage = 'NON_RISPONDE';
UPDATE leads SET pipeline_stage = 'PERSO'            WHERE pipeline_stage = 'NON_PRESENTATO';
UPDATE leads SET pipeline_stage = 'PROPOSTA_INVIATA' WHERE pipeline_stage = 'OFFERTA_INVIATA';
-- NON_TARGET, SENZA_SITO, CALL_FISSATA, VINTO, PERSO restano invariati

-- ============================================================
-- STEP 3: Droppa il vecchio enum e crea il nuovo
-- ============================================================
DROP TYPE "PipelineStage";

CREATE TYPE "PipelineStage" AS ENUM (
  'NUOVO',
  'DA_QUALIFICARE',
  'QUALIFICATO',
  'VIDEO_DA_FARE',
  'VIDEO_INVIATO',
  'LETTERA_INVIATA',
  'FOLLOW_UP_LINKEDIN',
  'RISPOSTO',
  'CALL_FISSATA',
  'IN_CONVERSAZIONE',
  'PROPOSTA_INVIATA',
  'VINTO',
  'PERSO',
  'DA_RICHIAMARE_6M',
  'RICICLATO',
  'NON_TARGET',
  'SENZA_SITO'
);

-- ============================================================
-- STEP 4: Converti colonna TEXT → nuovo enum + ripristina default
-- ============================================================
ALTER TABLE leads
  ALTER COLUMN pipeline_stage TYPE "PipelineStage"
  USING pipeline_stage::"PipelineStage";

ALTER TABLE leads
  ALTER COLUMN pipeline_stage SET DEFAULT 'NUOVO'::"PipelineStage";

-- ============================================================
-- STEP 5: Aggiungi nuovi valori a ActivityType (via TEXT swap)
-- ============================================================
-- Salva dati
ALTER TABLE activities ALTER COLUMN type TYPE TEXT USING type::TEXT;

-- Droppa e ricrea
DROP TYPE "ActivityType";

CREATE TYPE "ActivityType" AS ENUM (
  'CALL',
  'NOTE',
  'EMAIL_SENT',
  'MEETING',
  'PROPOSAL_SENT',
  'STAGE_CHANGE',
  'VIDEO_SENT',
  'LETTER_SENT',
  'LINKEDIN_SENT',
  'RESPONSE_RECEIVED',
  'VIDEO_VIEWED',
  'QUALIFICATION'
);

ALTER TABLE activities
  ALTER COLUMN type TYPE "ActivityType"
  USING type::"ActivityType";

-- ============================================================
-- STEP 6: Aggiungi nuove colonne a leads
-- ============================================================

-- Video outreach
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_script_data JSONB;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_sent_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS video_viewed_at TIMESTAMP;

-- Follow-up
ALTER TABLE leads ADD COLUMN IF NOT EXISTS letter_sent_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS linkedin_sent_at TIMESTAMP;

-- Risposta prospect
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS responded_via TEXT;

-- Qualificazione Daniela
ALTER TABLE leads ADD COLUMN IF NOT EXISTS daniela_notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMP;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS qualified_by TEXT;

-- Recontact
ALTER TABLE leads ADD COLUMN IF NOT EXISTS recontact_at TIMESTAMP;

-- Indici
CREATE INDEX IF NOT EXISTS idx_leads_recontact ON leads (recontact_at);
CREATE INDEX IF NOT EXISTS idx_leads_video_sent ON leads (video_sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_qualified ON leads (qualified_at);
CREATE INDEX IF NOT EXISTS idx_leads_letter_sent ON leads (letter_sent_at);
CREATE INDEX IF NOT EXISTS idx_leads_linkedin_sent ON leads (linkedin_sent_at);

-- ============================================================
-- STEP 7: Aggiorna tabella settings
-- ============================================================
ALTER TABLE settings DROP COLUMN IF EXISTS daily_call_limit;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_days_video INT DEFAULT 7;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS follow_up_days_letter INT DEFAULT 7;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS recontact_months INT DEFAULT 6;

-- ============================================================
-- VERIFICA
-- ============================================================
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM leads
  WHERE pipeline_stage::TEXT IN ('NEW', 'DA_CHIAMARE', 'DA_VERIFICARE', 'RICHIAMARE', 'NON_RISPONDE', 'NON_PRESENTATO', 'OFFERTA_INVIATA');

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'ERRORE: % righe hanno ancora vecchi stage!', bad_count;
  END IF;

  RAISE NOTICE 'OK: Migrazione completata, nessun vecchio stage rimasto.';
END$$;

COMMIT;

-- Mostra risultato
SELECT pipeline_stage, COUNT(*) as count
FROM leads
GROUP BY pipeline_stage
ORDER BY count DESC;
