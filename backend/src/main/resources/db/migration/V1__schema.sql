-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — EWS-NER Database Schema
--  V1__schema.sql — Full DDL with PostGIS geometry columns
--  Flyway migration: runs once on first startup
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable PostGIS extension (requires postgis image)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUM TYPES ───────────────────────────────────────────────────────────────

CREATE TYPE region_type_enum     AS ENUM ('VILLAGE', 'ROAD_SEGMENT');
CREATE TYPE road_status_enum     AS ENUM ('OPEN', 'BLOCKED', 'AT_RISK');
CREATE TYPE land_use_enum        AS ENUM ('FOREST', 'AGRICULTURE', 'BARE', 'SETTLEMENT', 'MIXED');
CREATE TYPE severity_enum        AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
CREATE TYPE event_severity_enum  AS ENUM ('MINOR', 'MODERATE', 'MAJOR', 'CATASTROPHIC');
CREATE TYPE score_source_enum    AS ENUM ('RULE_BASED', 'ML_ENHANCED', 'BLENDED');
CREATE TYPE reporter_type_enum   AS ENUM ('CITIZEN', 'FIELD_OFFICER');
CREATE TYPE report_category_enum AS ENUM ('CRACK', 'SLOPE_MOVEMENT', 'BLOCKED_ROAD', 'FLOODING', 'OTHER');
CREATE TYPE report_status_enum   AS ENUM ('PENDING', 'VERIFIED', 'RESOLVED', 'DISMISSED');
CREATE TYPE alert_channel_enum   AS ENUM ('SMS', 'APP', 'WEB', 'CAP_FEED');
CREATE TYPE alert_status_enum    AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE user_role_enum       AS ENUM ('ADMIN', 'DISTRICT_OFFICIAL', 'FIELD_OFFICER', 'CITIZEN');

-- ── TABLE: region ─────────────────────────────────────────────────────────────
-- Represents a village polygon or road segment buffer.
-- PostGIS geometry enables spatial queries (point-in-polygon, nearest neighbor).
CREATE TABLE region (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    district    VARCHAR(100) NOT NULL,
    state       VARCHAR(100) NOT NULL,
    -- PostGIS geometry: EPSG:4326 (WGS84 lat/lng)
    geometry    GEOMETRY(MultiPolygon, 4326),
    -- Centroid for fast distance queries without polygon intersection
    centroid    GEOMETRY(Point, 4326),
    region_type region_type_enum NOT NULL DEFAULT 'VILLAGE',
    road_status road_status_enum,           -- NULL for VILLAGE type
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for fast heatmap and point-in-polygon queries
CREATE INDEX idx_region_geometry  ON region USING GIST (geometry);
CREATE INDEX idx_region_centroid  ON region USING GIST (centroid);
CREATE INDEX idx_region_district  ON region (district);
CREATE INDEX idx_region_state     ON region (state);

-- ── TABLE: sensor_reading ─────────────────────────────────────────────────────
-- SYNTHETIC DATA — simulates rainfall, soil moisture readings for NER regions.
-- In production: replace source='SYNTHETIC' rows with live IMD/AWS telemetry.
CREATE TABLE sensor_reading (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id         UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    rainfall_mm_24h   DECIMAL(7,2) NOT NULL DEFAULT 0,
    rainfall_mm_72h   DECIMAL(7,2) NOT NULL DEFAULT 0,
    soil_moisture_pct DECIMAL(5,2) NOT NULL DEFAULT 0,   -- 0–100%
    temperature_c     DECIMAL(5,2),
    source            VARCHAR(50) NOT NULL DEFAULT 'SYNTHETIC',
    recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sensor_region_time ON sensor_reading (region_id, recorded_at DESC);
CREATE INDEX idx_sensor_recorded_at ON sensor_reading (recorded_at DESC);

-- ── TABLE: terrain_profile ────────────────────────────────────────────────────
-- Static terrain data per region (slope, elevation, land use, soil type).
-- SYNTHETIC DATA — approximated from SRTM DEM; clearly labeled.
CREATE TABLE terrain_profile (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id       UUID NOT NULL UNIQUE REFERENCES region(id) ON DELETE CASCADE,
    slope_angle_deg DECIMAL(5,2) NOT NULL DEFAULT 0,  -- degrees, 0–90
    elevation_m     INTEGER NOT NULL DEFAULT 0,
    land_use        land_use_enum NOT NULL DEFAULT 'MIXED',
    soil_type       VARCHAR(100),                      -- e.g. 'Clayey', 'Sandy-loam'
    notes           TEXT
);

CREATE INDEX idx_terrain_region ON terrain_profile (region_id);

-- ── TABLE: historical_landslide ───────────────────────────────────────────────
-- Historical landslide events per region.
-- Sources: GSI Bhooskhalan database / NDMA records / news archives / SYNTHETIC.
CREATE TABLE historical_landslide (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id   UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    event_date  DATE NOT NULL,
    severity    event_severity_enum NOT NULL,
    casualties  INTEGER,                   -- nullable; often unknown
    source      VARCHAR(100) NOT NULL DEFAULT 'SYNTHETIC',
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_historical_region      ON historical_landslide (region_id);
CREATE INDEX idx_historical_event_date  ON historical_landslide (event_date DESC);

-- ── TABLE: risk_score ─────────────────────────────────────────────────────────
-- Computed risk score per region. Recomputed on each sensor update or report.
-- contributing_factors: JSONB breakdown (see RiskScoringEngine.java for schema).
CREATE TABLE risk_score (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id             UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    computed_score        DECIMAL(5,2) NOT NULL,        -- 0.00 – 100.00
    severity_level        severity_enum NOT NULL DEFAULT 'LOW',
    contributing_factors  JSONB NOT NULL DEFAULT '{}',
    ml_score              DECIMAL(5,2),                 -- nullable; Phase 2 ML microservice
    score_source          score_source_enum NOT NULL DEFAULT 'RULE_BASED',
    computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one current score per region (latest by computed_at)
CREATE INDEX idx_risk_region_time ON risk_score (region_id, computed_at DESC);
CREATE INDEX idx_risk_severity    ON risk_score (severity_level);
-- GIN index for JSONB querying of contributing factors
CREATE INDEX idx_risk_factors_gin ON risk_score USING GIN (contributing_factors);

-- ── TABLE: citizen_report ─────────────────────────────────────────────────────
-- Geo-tagged citizen/field-officer reports: cracks, slope movement, road blockages.
-- This is the two-way return path missing from SACHET's one-way broadcast.
-- synced_at is non-null only for reports that arrived via offline PWA sync.
CREATE TABLE citizen_report (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_type reporter_type_enum NOT NULL DEFAULT 'CITIZEN',
    reporter_id   UUID,                                              -- nullable (anonymous); FK added below after app_user is created
    geo_lat       DECIMAL(9,6) NOT NULL,
    geo_lng       DECIMAL(9,6) NOT NULL,
    region_id     UUID REFERENCES region(id) ON DELETE SET NULL,     -- resolved via PostGIS
    category      report_category_enum NOT NULL DEFAULT 'OTHER',
    description   TEXT,
    photo_url     VARCHAR(500),                                       -- MinIO object path
    status        report_status_enum NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at     TIMESTAMPTZ                                        -- non-null = offline sync
);

CREATE INDEX idx_report_region      ON citizen_report (region_id);
CREATE INDEX idx_report_status      ON citizen_report (status);
CREATE INDEX idx_report_created_at  ON citizen_report (created_at DESC);
CREATE INDEX idx_report_location    ON citizen_report (geo_lat, geo_lng);

-- ── TABLE: alert ─────────────────────────────────────────────────────────────
-- Generated alerts when risk_score crosses a severity threshold.
-- Includes both English and Assamese message variants.
-- cap_xml: CAP 1.2 XML payload — ready to hand to SACHET as Alert-Generating Agency input.
CREATE TABLE alert (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id             UUID NOT NULL REFERENCES region(id) ON DELETE CASCADE,
    severity              severity_enum NOT NULL,
    message_en            TEXT NOT NULL,
    message_as            TEXT,                   -- Assamese Unicode (অসমীয়া)
    channel               alert_channel_enum NOT NULL DEFAULT 'APP',
    contributing_summary  TEXT,                   -- Shortened explainability (≤160 chars, SMS-safe)
    cap_xml               TEXT,                   -- CAP 1.2 XML (Phase 2 stub)
    sent_at               TIMESTAMPTZ,
    status                alert_status_enum NOT NULL DEFAULT 'PENDING',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_region     ON alert (region_id);
CREATE INDEX idx_alert_severity   ON alert (severity);
CREATE INDEX idx_alert_status     ON alert (status);
CREATE INDEX idx_alert_created_at ON alert (created_at DESC);

-- ── TABLE: app_user ────────────────────────────────────────────────────────────
-- Platform users: 4 roles with different dashboard access levels.
-- Citizens: report form + public risk map only.
-- District Officials: full command-center dashboard + road status editing + alert history.
CREATE TABLE app_user (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,         -- BCrypt
    role            user_role_enum NOT NULL DEFAULT 'CITIZEN',
    district        VARCHAR(100),                  -- scopes official/officer to their jurisdiction
    language_pref   VARCHAR(10) NOT NULL DEFAULT 'en',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email    ON app_user (email);
CREATE INDEX idx_user_role     ON app_user (role);
CREATE INDEX idx_user_district ON app_user (district);

-- ── Fix forward reference: citizen_report.reporter_id → app_user ─────────────
-- (app_user was defined after citizen_report above — constraint added here)
ALTER TABLE citizen_report
    ADD CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id)
    REFERENCES app_user(id) ON DELETE SET NULL;
