-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V5__offline_idempotency_and_responder.sql
--  Add client_report_id column and unique index for offline sync idempotency
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS client_report_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_citizen_report_client_id 
    ON citizen_report (client_report_id) 
    WHERE client_report_id IS NOT NULL;
