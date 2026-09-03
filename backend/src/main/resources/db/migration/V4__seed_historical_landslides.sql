-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V4__seed_historical_landslides.sql
--  Historical landslide records for the 3 demo districts.
--  Sources: GSI Bhooskhalan DB / NDMA / news archives / SYNTHETIC.
--  These records directly feed the history_component of the risk scoring engine.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO historical_landslide (region_id, event_date, severity, casualties, source, notes) VALUES

-- ── Kamrup Metropolitan, Assam ────────────────────────────────────────────────
('a1000000-0000-0000-0000-000000000004', '2022-06-17', 'MODERATE', 2,  'NEWS',      'Basistha slope failure — retaining wall collapse after 3 days continuous rain'),
('a1000000-0000-0000-0000-000000000006', '2021-07-04', 'MODERATE', 0,  'NDMA',      'NH-27 embankment slip, road closed 6 hours'),
('a1000000-0000-0000-0000-000000000010', '2023-08-12', 'MAJOR',    4,  'GSI',       'NH-27 Jorabat ghat debris slide, vehicles trapped'),
('a1000000-0000-0000-0000-000000000010', '2020-06-28', 'MODERATE', 1,  'NEWS',      'Nongpoh approach road slip'),
('a1000000-0000-0000-0000-000000000007', '2022-09-03', 'MINOR',    0,  'SYNTHETIC', 'SYNTHETIC — small slope creep, Rani forest edge'),
('a1000000-0000-0000-0000-000000000003', '2024-07-22', 'MODERATE', 0,  'NEWS',      'Khanapara hillside — compound wall collapse after 160mm rain in 24h'),

-- ── East Khasi Hills, Meghalaya ───────────────────────────────────────────────
-- High historical frequency — one of India''s most landslide-prone districts
('b2000000-0000-0000-0000-000000000004', '2022-06-15', 'CATASTROPHIC', 7, 'GSI',    'Mawsynram corridor massive debris avalanche — 7 fatalities, road cut 18 days'),
('b2000000-0000-0000-0000-000000000004', '2021-06-03', 'MAJOR',    3,  'NDMA',      'NH-106 landslip, 3 casualties, 2km road damaged'),
('b2000000-0000-0000-0000-000000000004', '2019-08-21', 'MODERATE', 0,  'GSI',       'Seasonal slope failure, Mawsynram road closed'),
('b2000000-0000-0000-0000-000000000005', '2023-07-09', 'MAJOR',    2,  'NEWS',      'Cherrapunji (Sohra) slope failure — extreme 380mm/72h rainfall event'),
('b2000000-0000-0000-0000-000000000005', '2020-07-17', 'MODERATE', 0,  'GSI',       'Sohra debris flow after sustained monsoon, agricultural land damaged'),
('b2000000-0000-0000-0000-000000000001', '2024-08-05', 'MODERATE', 1,  'NEWS',      'Laitumkhrah retaining wall failure — 1 casualty, 3 houses damaged'),
('b2000000-0000-0000-0000-000000000003', '2023-06-22', 'MODERATE', 2,  'NEWS',      'Nongthymmai ridge slope failure — 2 casualties, landslide blocked Shillong ring road'),
('b2000000-0000-0000-0000-000000000008', '2022-07-11', 'MINOR',    0,  'SYNTHETIC', 'SYNTHETIC — Shillong Peak area rockfall, tourist trail closed'),
('b2000000-0000-0000-0000-000000000009', '2021-08-14', 'MAJOR',    1,  'NDMA',      'NH-6 Shillong–Silchar cut-slope failure, 18h road closure'),
('b2000000-0000-0000-0000-000000000002', '2024-07-30', 'MODERATE', 0,  'NEWS',      'Mawlai landslide — 15 households evacuated, 2 walls collapsed'),

-- ── Aizawl, Mizoram ──────────────────────────────────────────────────────────
-- Among India''s most landslide-affected cities — steep ridge construction
('c3000000-0000-0000-0000-000000000004', '2023-06-30', 'CATASTROPHIC', 11, 'GSI',   'Chaltlang catastrophic slide — 11 fatalities, 20 houses destroyed; triggered by 185mm/24h rainfall'),
('c3000000-0000-0000-0000-000000000004', '2021-07-18', 'MAJOR',    4,  'NDMA',      'Chaltlang slope collapse — 4 dead, 8 injured, 150 displaced'),
('c3000000-0000-0000-0000-000000000004', '2019-06-24', 'MODERATE', 2,  'NEWS',      'Chaltlang retaining wall failure, 2 casualties'),
('c3000000-0000-0000-0000-000000000006', '2024-05-28', 'MAJOR',    0,  'GSI',       'NH-306 massive road cut failure — currently still classified BLOCKED'),
('c3000000-0000-0000-0000-000000000006', '2022-07-02', 'MODERATE', 0,  'NDMA',      'NH-306 Km 8 slope slip, emergency repairs 4 days'),
('c3000000-0000-0000-0000-000000000006', '2020-08-09', 'MODERATE', 0,  'NEWS',      'NH-306 debris flow, road closed 3 days'),
('c3000000-0000-0000-0000-000000000001', '2024-07-14', 'MAJOR',    2,  'NEWS',      'Bawngkawn residential slope — 2 casualties, apartment block evacuated'),
('c3000000-0000-0000-0000-000000000002', '2023-08-01', 'MODERATE', 0,  'NEWS',      'Durtlang road slip, 1 day disruption'),
('c3000000-0000-0000-0000-000000000008', '2022-06-19', 'MODERATE', 1,  'NEWS',      'Khatla hillside collapse — 1 casualty, government quarters'),
('c3000000-0000-0000-0000-000000000008', '2020-07-05', 'MINOR',    0,  'SYNTHETIC', 'SYNTHETIC — Khatla minor slope creep'),
('c3000000-0000-0000-0000-000000000005', '2023-07-25', 'MODERATE', 0,  'NEWS',      'Luangmual debris flow — road cut failure near market'),
('c3000000-0000-0000-0000-000000000010', '2024-06-10', 'MAJOR',    1,  'NDMA',      'NH-306 Km 22 slope failure, 1 casualty, stretch AT_RISK'),
('c3000000-0000-0000-0000-000000000010', '2021-07-30', 'MODERATE', 0,  'GSI',       'NH-306 Tlangnuam area debris slide'),
('c3000000-0000-0000-0000-000000000003', '2022-08-15', 'MINOR',    0,  'SYNTHETIC', 'SYNTHETIC — Zemabawk minor slope movement, no casualties');

-- ── Seed demo users (BCrypt hash = "demo1234" for all) ───────────────────────
-- BCrypt cost 10, password = "demo1234"
INSERT INTO app_user (id, username, email, password_hash, role, district, language_pref) VALUES
('d0000000-0000-0000-0000-000000000001', 'admin',
 'admin@ews-ner.gov.in',
 '$2a$10$N.zmdr9zkoa5KHRzCREk0uXKNXcGKCYSQmh6NHE9b5k3bSmMOmkAS',
 'ADMIN', NULL, 'en'),

('d0000000-0000-0000-0000-000000000002', 'kamrup_official',
 'official.kamrup@assam.gov.in',
 '$2a$10$N.zmdr9zkoa5KHRzCREk0uXKNXcGKCYSQmh6NHE9b5k3bSmMOmkAS',
 'DISTRICT_OFFICIAL', 'Kamrup Metropolitan', 'en'),

('d0000000-0000-0000-0000-000000000003', 'ekh_official',
 'official.ekh@meghalaya.gov.in',
 '$2a$10$N.zmdr9zkoa5KHRzCREk0uXKNXcGKCYSQmh6NHE9b5k3bSmMOmkAS',
 'DISTRICT_OFFICIAL', 'East Khasi Hills', 'en'),

('d0000000-0000-0000-0000-000000000004', 'aizawl_officer',
 'officer.aizawl@mizoram.gov.in',
 '$2a$10$N.zmdr9zkoa5KHRzCREk0uXKNXcGKCYSQmh6NHE9b5k3bSmMOmkAS',
 'FIELD_OFFICER', 'Aizawl', 'en'),

('d0000000-0000-0000-0000-000000000005', 'citizen_demo',
 'citizen@example.com',
 '$2a$10$N.zmdr9zkoa5KHRzCREk0uXKNXcGKCYSQmh6NHE9b5k3bSmMOmkAS',
 'CITIZEN', NULL, 'as');
