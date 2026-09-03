-- ─────────────────────────────────────────────────────────────────────────────
--  SIH 26001 — V8__citizen_profile_and_otp.sql
--  Add phone column to app_user, make password/email nullable for OTP citizens,
--  create citizen_profile and phone_otp tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extend app_user for citizen phone-based authentication
ALTER TABLE app_user ALTER COLUMN email DROP NOT NULL;
ALTER TABLE app_user ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_app_user_phone ON app_user(phone);

-- 2. Create citizen_profile table
CREATE TABLE IF NOT EXISTS citizen_profile (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL UNIQUE REFERENCES app_user(id) ON DELETE CASCADE,
    full_name                VARCHAR(150) NOT NULL,
    gender                   VARCHAR(50),
    age_group                VARCHAR(50),
    preferred_language       VARCHAR(10) NOT NULL DEFAULT 'en',
    blood_group              VARCHAR(10),
    emergency_contact_name   VARCHAR(150),
    emergency_contact_phone  VARCHAR(20),
    accessibility_needs      TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizen_profile_user_id ON citizen_profile(user_id);

-- 3. Create phone_otp table for secure OTP verification
CREATE TABLE IF NOT EXISTS phone_otp (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone       VARCHAR(20) NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    attempts    INT NOT NULL DEFAULT 0,
    verified    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone ON phone_otp(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires ON phone_otp(expires_at);

-- Ensure citizen_demo password hash matches demo1234
UPDATE app_user SET password_hash = '$2a$10$QN.gRLCkyPLoikrkCUtD/eoXT.M.Vg81QL5G.zZ18mr36gEaTR.Ti' WHERE username = 'citizen_demo';
