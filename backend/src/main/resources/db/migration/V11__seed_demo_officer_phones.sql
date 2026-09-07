-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V11__seed_demo_officer_phones.sql
--  Associate explicit demo phone numbers with demo accounts so SIH evaluators
--  can test the Officer OTP flow and Citizen OTP flow without personal numbers.
-- ─────────────────────────────────────────────────────────────────────────────

-- Set phone numbers for demo officer accounts:
-- admin:           +919876543210
-- kamrup_official: +919876543211
-- ekh_official:    +919876543212
-- aizawl_officer:  +919876543213
-- citizen_demo:    +919876543214

UPDATE app_user SET phone = '+919876543210' WHERE username = 'admin';
UPDATE app_user SET phone = '+919876543211' WHERE username = 'kamrup_official';
UPDATE app_user SET phone = '+919876543212' WHERE username = 'ekh_official';
UPDATE app_user SET phone = '+919876543213' WHERE username = 'aizawl_officer';
UPDATE app_user SET phone = '+919876543214' WHERE username = 'citizen_demo';
