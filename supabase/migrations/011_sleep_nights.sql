-- Sleep nights read from HealthKit (Dexie v21). One row per morning; a night
-- belongs to the morning it ends. Written only by the app's sleep import.
-- Purely additive; all columns nullable except the key. Apply in the Supabase
-- SQL editor.

CREATE TABLE IF NOT EXISTS ph_sleep_nights (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT,
  date                DATE,
  asleep_minutes      INTEGER,
  core_minutes        INTEGER,
  deep_minutes        INTEGER,
  rem_minutes         INTEGER,
  unspecified_minutes INTEGER,
  awake_minutes       INTEGER,
  in_bed_minutes      INTEGER,
  sleep_start         TIMESTAMPTZ,
  sleep_end           TIMESTAMPTZ,
  nap_minutes         INTEGER,
  source_name         TEXT,
  source_bundle_id    TEXT,
  updated_at          TIMESTAMPTZ
);
ALTER TABLE ph_sleep_nights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_sleep_nights
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- Tables created in the SQL editor don't inherit the anon grants (see 006).
GRANT SELECT, INSERT, UPDATE, DELETE ON ph_sleep_nights TO anon, authenticated;
