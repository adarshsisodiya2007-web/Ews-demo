-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V3__seed_terrain.sql
--  SYNTHETIC DATA — Terrain profiles approximated from SRTM DEM data.
--  Slope angles and elevations are plausible for each district's geography.
--  Clearly labeled as synthetic for demo purposes.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO terrain_profile (region_id, slope_angle_deg, elevation_m, land_use, soil_type, notes) VALUES

-- ── Kamrup Metropolitan, Assam ────────────────────────────────────────────────
-- Relatively lower slopes — foothills of Meghalaya plateau, river valley terrain
('a1000000-0000-0000-0000-000000000001', 12.5, 54,  'SETTLEMENT', 'Alluvial silty clay',
 'SYNTHETIC — Jalukbari: moderate slope, Brahmaputra floodplain edge'),

('a1000000-0000-0000-0000-000000000002', 8.2,  48,  'SETTLEMENT', 'Sandy-loam alluvial',
 'SYNTHETIC — Azara: near airport, low slope, susceptible to waterlogging'),

('a1000000-0000-0000-0000-000000000003', 15.8, 62,  'MIXED',       'Lateritic red soil',
 'SYNTHETIC — Khanapara: transitional zone, moderate slope'),

('a1000000-0000-0000-0000-000000000004', 19.4, 75,  'SETTLEMENT', 'Clayey loam',
 'SYNTHETIC — Basistha: begins foothills, higher slope than valley floor'),

('a1000000-0000-0000-0000-000000000005', 7.1,  42,  'AGRICULTURE', 'Alluvial clay',
 'SYNTHETIC — Kahikuchi: flat flood-prone agricultural land'),

('a1000000-0000-0000-0000-000000000006', 22.0, 110, 'BARE',        'Rocky laterite',
 'SYNTHETIC — NH-27 cut slope, road embankment; active cut-slope risk'),

('a1000000-0000-0000-0000-000000000007', 16.3, 68,  'FOREST',      'Sandy-clay loam',
 'SYNTHETIC — Rani: forested hill fringe, moderate slope'),

('a1000000-0000-0000-0000-000000000008', 9.5,  55,  'AGRICULTURE', 'Alluvial silt',
 'SYNTHETIC — Mirza: paddy fields, low slope, seasonal waterlogging'),

('a1000000-0000-0000-0000-000000000009', 11.8, 58,  'SETTLEMENT', 'Clayey alluvial',
 'SYNTHETIC — Chandrapur: river terrace, moderate risk'),

('a1000000-0000-0000-0000-000000000010', 31.5, 185, 'BARE',        'Weathered shale',
 'SYNTHETIC — NH-27 Jorabat–Nongpoh: steep ghat section, historically unstable'),

-- ── East Khasi Hills, Meghalaya ───────────────────────────────────────────────
-- High slopes — plateau edge, world''s wettest geography, significant history
('b2000000-0000-0000-0000-000000000001', 28.4, 1496, 'SETTLEMENT', 'Clayey laterite',
 'SYNTHETIC — Laitumkhrah, Shillong: hill city, dense settlement on steep ground'),

('b2000000-0000-0000-0000-000000000002', 24.7, 1528, 'SETTLEMENT', 'Clayey laterite',
 'SYNTHETIC — Mawlai: hilltop suburb, periodic slope failures'),

('b2000000-0000-0000-0000-000000000003', 33.1, 1480, 'SETTLEMENT', 'Saturated clay',
 'SYNTHETIC — Nongthymmai: steep ridge, saturates quickly under Cherrapunji rainfall'),

('b2000000-0000-0000-0000-000000000004', 38.6, 1120, 'BARE',       'Weathered granite-gneiss',
 'SYNTHETIC — Mawsynram road: extreme rainfall zone, frequent debris slides'),

('b2000000-0000-0000-0000-000000000005', 35.2, 1484, 'MIXED',      'Sandy clayey laterite',
 'SYNTHETIC — Cherrapunji: wettest place on Earth; intense erosion'),

('b2000000-0000-0000-0000-000000000006', 18.9, 1080, 'MIXED',      'Sandy loam over gneiss',
 'SYNTHETIC — Umiam: reservoir area, moderate slope'),

('b2000000-0000-0000-0000-000000000007', 29.8, 1250, 'FOREST',     'Clayey red laterite',
 'SYNTHETIC — Mawkyrwat: forested slope, intact canopy provides partial stability'),

('b2000000-0000-0000-0000-000000000008', 40.1, 1965, 'BARE',       'Rocky outcrop',
 'SYNTHETIC — Shillong Peak: highest local point, near-vertical cliff sections'),

('b2000000-0000-0000-0000-000000000009', 26.5, 890,  'BARE',       'Fractured gneiss',
 'SYNTHETIC — NH-6 Shillong–Silchar: road cuts through fractured rock'),

('b2000000-0000-0000-0000-000000000010', 21.3, 1180, 'AGRICULTURE','Sandy loam',
 'SYNTHETIC — Mairang: agricultural slopes, moderate stability'),

-- ── Aizawl, Mizoram ──────────────────────────────────────────────────────────
-- Steep urban ridges — city built on knife-edge topography, notoriously high risk
('c3000000-0000-0000-0000-000000000001', 34.8, 1132, 'SETTLEMENT', 'Compressed laterite',
 'SYNTHETIC — Bawngkawn: central Aizawl, dense urban settlement on steep ridge'),

('c3000000-0000-0000-0000-000000000002', 37.2, 1095, 'SETTLEMENT', 'Residual lateritic clay',
 'SYNTHETIC — Durtlang: northern ridge, rapid urbanisation, cut slopes'),

('c3000000-0000-0000-0000-000000000003', 31.6, 980,  'MIXED',      'Sandy clayey laterite',
 'SYNTHETIC — Zemabawk: southern fringe, mixed land use'),

('c3000000-0000-0000-0000-000000000004', 42.3, 1210, 'SETTLEMENT', 'Saturated clay over shale',
 'SYNTHETIC — Chaltlang: steepest residential zone in Aizawl, highest risk'),

('c3000000-0000-0000-0000-000000000005', 28.9, 875,  'SETTLEMENT', 'Lateritic red clay',
 'SYNTHETIC — Luangmual: hillside settlement, periodic debris flows'),

('c3000000-0000-0000-0000-000000000006', 44.7, 1050, 'BARE',       'Loose shale fragments',
 'SYNTHETIC — NH-306: active road cut, persistent instability; currently BLOCKED'),

('c3000000-0000-0000-0000-000000000007', 29.4, 1155, 'SETTLEMENT', 'Residual clay',
 'SYNTHETIC — Ramhlun: mixed zone, sports complex area'),

('c3000000-0000-0000-0000-000000000008', 36.5, 1200, 'SETTLEMENT', 'Saturated laterite',
 'SYNTHETIC — Khatla: dense hillside, government quarter area, high exposure'),

('c3000000-0000-0000-0000-000000000009', 38.8, 1320, 'FOREST',     'Humus-rich clay over rock',
 'SYNTHETIC — Thuampui: forested northern slope, some natural stability'),

('c3000000-0000-0000-0000-000000000010', 39.1, 920,  'BARE',       'Loose shale and laterite',
 'SYNTHETIC — NH-306 Km 16–30: another high-risk cut section, AT_RISK status');
