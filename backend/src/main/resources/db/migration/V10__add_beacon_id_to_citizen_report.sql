-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V10__add_beacon_id_to_citizen_report.sql
--  Add beacon_id column to citizen_report for unified beacon identity sync
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE citizen_report ADD COLUMN IF NOT EXISTS beacon_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_citizen_report_beacon_id 
    ON citizen_report (beacon_id) 
    WHERE beacon_id IS NOT NULL;
