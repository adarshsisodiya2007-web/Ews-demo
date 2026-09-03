-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V2__seed_regions.sql
--  SYNTHETIC DATA — Real administrative boundaries approximated from GADM/OSM.
--  3 NER districts: Kamrup (Assam), East Khasi Hills (Meghalaya), Aizawl (Mizoram)
--  ~10 regions per district (villages + road segments)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ASSAM — Kamrup Metropolitan District ─────────────────────────────────────
-- Guwahati region: approx 26.09–26.22°N, 91.65–91.85°E
-- Mix of urban villages, peri-urban zones, and NH-37 road segments

INSERT INTO region (id, name, district, state, region_type, road_status,
    centroid, geometry) VALUES

('a1000000-0000-0000-0000-000000000001',
 'Jalukbari', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.6950, 26.1445), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.6850 26.1350, 91.7050 26.1350, 91.7050 26.1550,
   91.6850 26.1550, 91.6850 26.1350)))'), 4326)),

('a1000000-0000-0000-0000-000000000002',
 'Azara', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.7050, 26.1120), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.6900 26.1000, 91.7200 26.1000, 91.7200 26.1240,
   91.6900 26.1240, 91.6900 26.1000)))'), 4326)),

('a1000000-0000-0000-0000-000000000003',
 'Khanapara', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.7800, 26.1050), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7650 26.0920, 91.7950 26.0920, 91.7950 26.1180,
   91.7650 26.1180, 91.7650 26.0920)))'), 4326)),

('a1000000-0000-0000-0000-000000000004',
 'Basistha', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.7920, 26.0870), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7800 26.0750, 91.8040 26.0750, 91.8040 26.0990,
   91.7800 26.0990, 91.7800 26.0750)))'), 4326)),

('a1000000-0000-0000-0000-000000000005',
 'Kahikuchi', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.7340, 26.1680), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7200 26.1560, 91.7480 26.1560, 91.7480 26.1800,
   91.7200 26.1800, 91.7200 26.1560)))'), 4326)),

('a1000000-0000-0000-0000-000000000006',
 'NH-27 Km 12–24 (Guwahati–Shillong Road)', 'Kamrup Metropolitan', 'Assam',
 'ROAD_SEGMENT', 'OPEN',
 ST_SetSRID(ST_MakePoint(91.8300, 26.0600), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.8100 26.0480, 91.8500 26.0480, 91.8500 26.0720,
   91.8100 26.0720, 91.8100 26.0480)))'), 4326)),

('a1000000-0000-0000-0000-000000000007',
 'Rani', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.6640, 26.1350), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.6500 26.1220, 91.6780 26.1220, 91.6780 26.1480,
   91.6500 26.1480, 91.6500 26.1220)))'), 4326)),

('a1000000-0000-0000-0000-000000000008',
 'Mirza', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.5600, 26.1500), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.5440 26.1360, 91.5760 26.1360, 91.5760 26.1640,
   91.5440 26.1640, 91.5440 26.1360)))'), 4326)),

('a1000000-0000-0000-0000-000000000009',
 'Chandrapur', 'Kamrup Metropolitan', 'Assam', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.8120, 26.1900), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7980 26.1760, 91.8260 26.1760, 91.8260 26.2040,
   91.7980 26.2040, 91.7980 26.1760)))'), 4326)),

('a1000000-0000-0000-0000-000000000010',
 'NH-27 Km 25–38 (Jorabat–Nongpoh)', 'Kamrup Metropolitan', 'Assam',
 'ROAD_SEGMENT', 'AT_RISK',
 ST_SetSRID(ST_MakePoint(91.8720, 26.0200), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.8520 26.0050, 91.8920 26.0050, 91.8920 26.0350,
   91.8520 26.0350, 91.8520 26.0050)))'), 4326));

-- ── MEGHALAYA — East Khasi Hills District ────────────────────────────────────
-- Shillong + surroundings: approx 25.50–25.65°N, 91.80–91.95°E
-- Hill terrain, high rainfall, significant landslide history

INSERT INTO region (id, name, district, state, region_type, road_status,
    centroid, geometry) VALUES

('b2000000-0000-0000-0000-000000000001',
 'Laitumkhrah', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.8933, 25.5788), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.8800 25.5660, 91.9066 25.5660, 91.9066 25.5916,
   91.8800 25.5916, 91.8800 25.5660)))'), 4326)),

('b2000000-0000-0000-0000-000000000002',
 'Mawlai', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.9100, 25.5970), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.8960 25.5840, 91.9240 25.5840, 91.9240 25.6100,
   91.8960 25.6100, 91.8960 25.5840)))'), 4326)),

('b2000000-0000-0000-0000-000000000003',
 'Nongthymmai', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.9280, 25.5680), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.9140 25.5540, 91.9420 25.5540, 91.9420 25.5820,
   91.9140 25.5820, 91.9140 25.5540)))'), 4326)),

('b2000000-0000-0000-0000-000000000004',
 'Mawsynram Road Corridor (NH-106)', 'East Khasi Hills', 'Meghalaya',
 'ROAD_SEGMENT', 'AT_RISK',
 ST_SetSRID(ST_MakePoint(91.7200, 25.3900), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7000 25.3700, 91.7400 25.3700, 91.7400 25.4100,
   91.7000 25.4100, 91.7000 25.3700)))'), 4326)),

('b2000000-0000-0000-0000-000000000005',
 'Cherrapunji (Sohra)', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.7347, 25.2978), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.7160 25.2780, 91.7534 25.2780, 91.7534 25.3176,
   91.7160 25.3176, 91.7160 25.2780)))'), 4326)),

('b2000000-0000-0000-0000-000000000006',
 'Umiam (Barapani)', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.9200, 25.6800), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.9060 25.6660, 91.9340 25.6660, 91.9340 25.6940,
   91.9060 25.6940, 91.9060 25.6660)))'), 4326)),

('b2000000-0000-0000-0000-000000000007',
 'Mawkyrwat', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.6400, 25.4100), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.6200 25.3900, 91.6600 25.3900, 91.6600 25.4300,
   91.6200 25.4300, 91.6200 25.3900)))'), 4326)),

('b2000000-0000-0000-0000-000000000008',
 'Shillong Peak Area', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.8780, 25.5650), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.8640 25.5510, 91.8920 25.5510, 91.8920 25.5790,
   91.8640 25.5790, 91.8640 25.5510)))'), 4326)),

('b2000000-0000-0000-0000-000000000009',
 'NH-6 Km 42–58 (Shillong–Silchar)', 'East Khasi Hills', 'Meghalaya',
 'ROAD_SEGMENT', 'OPEN',
 ST_SetSRID(ST_MakePoint(92.0100, 25.4800), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.9900 25.4600, 92.0300 25.4600, 92.0300 25.5000,
   91.9900 25.5000, 91.9900 25.4600)))'), 4326)),

('b2000000-0000-0000-0000-000000000010',
 'Mairang', 'East Khasi Hills', 'Meghalaya', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(91.6600, 25.5600), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   91.6440 25.5440, 91.6760 25.5440, 91.6760 25.5760,
   91.6440 25.5760, 91.6440 25.5440)))'), 4326));

-- ── MIZORAM — Aizawl District ─────────────────────────────────────────────────
-- Aizawl city built on steep ridges: approx 23.68–23.78°N, 92.68–92.78°E
-- Notorious for infrastructure landslides — steep slopes, dense settlement

INSERT INTO region (id, name, district, state, region_type, road_status,
    centroid, geometry) VALUES

('c3000000-0000-0000-0000-000000000001',
 'Bawngkawn', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7176, 23.7271), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7036 23.7131, 92.7316 23.7131, 92.7316 23.7411,
   92.7036 23.7411, 92.7036 23.7131)))'), 4326)),

('c3000000-0000-0000-0000-000000000002',
 'Durtlang', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7050, 23.7500), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.6900 23.7360, 92.7200 23.7360, 92.7200 23.7640,
   92.6900 23.7640, 92.6900 23.7360)))'), 4326)),

('c3000000-0000-0000-0000-000000000003',
 'Zemabawk', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7400, 23.7100), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7260 23.6960, 92.7540 23.6960, 92.7540 23.7240,
   92.7260 23.7240, 92.7260 23.6960)))'), 4326)),

('c3000000-0000-0000-0000-000000000004',
 'Chaltlang', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.6980, 23.7380), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.6840 23.7240, 92.7120 23.7240, 92.7120 23.7520,
   92.6840 23.7520, 92.6840 23.7240)))'), 4326)),

('c3000000-0000-0000-0000-000000000005',
 'Luangmual', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7600, 23.7200), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7460 23.7060, 92.7740 23.7060, 92.7740 23.7340,
   92.7460 23.7340, 92.7460 23.7060)))'), 4326)),

('c3000000-0000-0000-0000-000000000006',
 'NH-306 Km 1–15 (Aizawl–Champhai)', 'Aizawl', 'Mizoram',
 'ROAD_SEGMENT', 'BLOCKED',
 ST_SetSRID(ST_MakePoint(92.7800, 23.7000), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7640 23.6840, 92.7960 23.6840, 92.7960 23.7160,
   92.7640 23.7160, 92.7640 23.6840)))'), 4326)),

('c3000000-0000-0000-0000-000000000007',
 'Ramhlun', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7120, 23.7600), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.6980 23.7460, 92.7260 23.7460, 92.7260 23.7740,
   92.6980 23.7740, 92.6980 23.7460)))'), 4326)),

('c3000000-0000-0000-0000-000000000008',
 'Khatla', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.7250, 23.7320), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7110 23.7180, 92.7390 23.7180, 92.7390 23.7460,
   92.7110 23.7460, 92.7110 23.7180)))'), 4326)),

('c3000000-0000-0000-0000-000000000009',
 'Thuampui', 'Aizawl', 'Mizoram', 'VILLAGE', NULL,
 ST_SetSRID(ST_MakePoint(92.6850, 23.7700), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.6710 23.7560, 92.6990 23.7560, 92.6990 23.7840,
   92.6710 23.7840, 92.6710 23.7560)))'), 4326)),

('c3000000-0000-0000-0000-000000000010',
 'NH-306 Km 16–30 (Aibawk–Tlangnuam)', 'Aizawl', 'Mizoram',
 'ROAD_SEGMENT', 'AT_RISK',
 ST_SetSRID(ST_MakePoint(92.8100, 23.6800), 4326),
 ST_SetSRID(ST_GeomFromText('MULTIPOLYGON(((
   92.7940 23.6640, 92.8260 23.6640, 92.8260 23.6960,
   92.7940 23.6960, 92.7940 23.6640)))'), 4326));
