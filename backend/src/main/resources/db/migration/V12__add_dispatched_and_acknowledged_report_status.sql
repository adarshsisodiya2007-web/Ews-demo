-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V12__add_dispatched_and_acknowledged_report_status.sql
--  Add ACKNOWLEDGED and DISPATCHED to report_status_enum for field responder workflow
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE report_status_enum ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE report_status_enum ADD VALUE IF NOT EXISTS 'DISPATCHED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

