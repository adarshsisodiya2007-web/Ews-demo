-- V9: Extend alert table for responder-managed alerts + add location to citizen_profile

-- 1. Add new status values to alert_status_enum
-- Note: PostgreSQL requires separate ALTER TYPE statements, one per value
DO $$ BEGIN
  ALTER TYPE alert_status_enum ADD VALUE IF NOT EXISTS 'ACTIVE';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE alert_status_enum ADD VALUE IF NOT EXISTS 'RESOLVED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE alert_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Extend alert table with responder-managed alert fields
ALTER TABLE alert ADD COLUMN IF NOT EXISTS title VARCHAR(300);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS alert_type VARCHAR(50) DEFAULT 'LANDSLIDE';
ALTER TABLE alert ADD COLUMN IF NOT EXISTS scope VARCHAR(30) DEFAULT 'EXACT_REGION';
ALTER TABLE alert ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS lat DECIMAL(9,6);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS lng DECIMAL(9,6);
ALTER TABLE alert ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES app_user(id) ON DELETE SET NULL;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS expiry_time TIMESTAMPTZ;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE alert ADD COLUMN IF NOT EXISTS is_responder_created BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add location fields to citizen_profile
ALTER TABLE citizen_profile ADD COLUMN IF NOT EXISTS selected_region_id UUID REFERENCES region(id) ON DELETE SET NULL;
ALTER TABLE citizen_profile ADD COLUMN IF NOT EXISTS selected_location_name VARCHAR(255);
ALTER TABLE citizen_profile ADD COLUMN IF NOT EXISTS selected_district VARCHAR(100);
ALTER TABLE citizen_profile ADD COLUMN IF NOT EXISTS selected_state VARCHAR(100);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_alert_scope ON alert(scope);
CREATE INDEX IF NOT EXISTS idx_alert_is_responder ON alert(is_responder_created);
CREATE INDEX IF NOT EXISTS idx_alert_expiry ON alert(expiry_time);
CREATE INDEX IF NOT EXISTS idx_alert_district ON alert(district);
CREATE INDEX IF NOT EXISTS idx_alert_state ON alert(state);
CREATE INDEX IF NOT EXISTS idx_citizen_profile_region ON citizen_profile(selected_region_id);
CREATE INDEX IF NOT EXISTS idx_citizen_profile_district ON citizen_profile(selected_district);
