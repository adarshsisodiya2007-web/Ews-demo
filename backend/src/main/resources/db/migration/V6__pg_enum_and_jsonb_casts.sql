-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V6__pg_enum_and_jsonb_casts.sql
--  PostgreSQL JSONB serialization is handled explicitly in Spring Boot / Hibernate
--  via @JdbcTypeCode(SqlTypes.JSON) on RiskScore.contributingFactors.
--  Implicit system-level cast is removed for managed PostgreSQL (Render, RDS, Neon) compatibility.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT 1;
