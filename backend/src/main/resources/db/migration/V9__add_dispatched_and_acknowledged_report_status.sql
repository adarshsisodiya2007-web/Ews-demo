-- flyway:executeInTransaction=false
-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V9__add_dispatched_and_acknowledged_report_status.sql
--  Add ACKNOWLEDGED and DISPATCHED to report_status_enum for field responder workflow
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE report_status_enum ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED' AFTER 'PENDING';
ALTER TYPE report_status_enum ADD VALUE IF NOT EXISTS 'DISPATCHED' AFTER 'ACKNOWLEDGED';
