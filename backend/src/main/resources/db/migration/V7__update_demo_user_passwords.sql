-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V7__update_demo_user_passwords.sql
--  Update demo users with valid BCrypt hash for "demo1234" (cost 10)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE app_user
SET password_hash = '$2a$10$QN.gRLCkyPLoikrkCUtD/eoXT.M.Vg81QL5G.zZ18mr36gEaTR.Ti'
WHERE username IN ('admin', 'kamrup_official', 'ekh_official', 'aizawl_officer');
