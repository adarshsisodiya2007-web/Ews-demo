-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V6__pg_enum_and_jsonb_casts.sql
--  Implicit cast for PostgreSQL JSONB with VARCHAR
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_cast c 
        JOIN pg_type s ON c.castsource = s.oid 
        JOIN pg_type t ON c.casttarget = t.oid 
        WHERE s.typname = 'varchar' AND t.typname = 'jsonb'
    ) THEN
        CREATE CAST (character varying AS jsonb) WITH INOUT AS IMPLICIT;
    END IF;
END $$;
