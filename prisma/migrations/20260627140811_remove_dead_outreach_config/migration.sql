-- Rimozione del workflow-engine (0 esecuzioni in produzione) e della configurazione morta.
-- L'unico motore di outreach attivo resta opt-in-mailer; questi oggetti non erano letti da alcun codice.

-- 1) Tabelle del workflow-engine (mai usato a runtime)
DROP TABLE IF EXISTS "workflow_executions";
DROP TABLE IF EXISTS "workflow_steps";

-- 2) Colonne morte nel modello settings
ALTER TABLE "settings"
  DROP COLUMN IF EXISTS "score_threshold",
  DROP COLUMN IF EXISTS "ghost_offer_days",
  DROP COLUMN IF EXISTS "max_call_attempts",
  DROP COLUMN IF EXISTS "follow_up_days_letter",
  DROP COLUMN IF EXISTS "email_subject_first",
  DROP COLUMN IF EXISTS "email_subject_followup",
  DROP COLUMN IF EXISTS "tpl_first_wa",
  DROP COLUMN IF EXISTS "tpl_first_email",
  DROP COLUMN IF EXISTS "tpl_followup1_wa",
  DROP COLUMN IF EXISTS "tpl_followup1_email",
  DROP COLUMN IF EXISTS "tpl_followup2_wa",
  DROP COLUMN IF EXISTS "tpl_followup2_email",
  DROP COLUMN IF EXISTS "tpl_followup3_wa",
  DROP COLUMN IF EXISTS "tpl_followup3_email",
  DROP COLUMN IF EXISTS "workflow_enabled",
  DROP COLUMN IF EXISTS "booking_url",
  DROP COLUMN IF EXISTS "signature_francesca",
  DROP COLUMN IF EXISTS "case_studies_block";
