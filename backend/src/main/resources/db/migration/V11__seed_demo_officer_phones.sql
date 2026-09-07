-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V11__seed_demo_officer_phones.sql
--  Associate explicit demo phone numbers with demo accounts so SIH evaluators
--  can test the Officer OTP flow and Citizen OTP flow without personal numbers.
-- ─────────────────────────────────────────────────────────────────────────────

-- Set phone numbers for canonical demo accounts:
-- admin:           +919876543210
-- kamrup_official: +919876543211
-- ekh_official:    +919876543212
-- aizawl_officer:  +919876543213
-- citizen_demo:    +919876543214

-- 1. Free any demo phone numbers currently held by conflicting test/transient accounts
--    (e.g., if a tester registered via /api/auth/citizen/register with a demo phone number)
UPDATE app_user
SET phone = NULL
WHERE phone IN (
    '+919876543210', '+919876543211', '+919876543212', '+919876543213', '+919876543214',
    '9876543210', '9876543211', '9876543212', '9876543213', '9876543214'
)
AND username NOT IN ('admin', 'kamrup_official', 'ekh_official', 'aizawl_officer', 'citizen_demo');

-- 2. Clear phones on target canonical demo accounts to prevent circular collisions
UPDATE app_user
SET phone = NULL
WHERE username IN ('admin', 'kamrup_official', 'ekh_official', 'aizawl_officer', 'citizen_demo');

-- 3. Deterministically assign canonical demo numbers
UPDATE app_user SET phone = '+919876543210' WHERE username = 'admin';
UPDATE app_user SET phone = '+919876543211' WHERE username = 'kamrup_official';
UPDATE app_user SET phone = '+919876543212' WHERE username = 'ekh_official';
UPDATE app_user SET phone = '+919876543213' WHERE username = 'aizawl_officer';
UPDATE app_user SET phone = '+919876543214' WHERE username = 'citizen_demo';
