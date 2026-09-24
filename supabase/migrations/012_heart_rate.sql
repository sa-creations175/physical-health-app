-- Heart rate during Apple Watch workouts, for Active minutes (Dexie v22).
-- One row per Watch workout, keyed by the same identity the Watch import uses.
-- seconds_by_bpm is a JSON object of whole bpm -> seconds at that bpm, so the
-- line (64% of max) can change without re-reading HealthKit. Written only by
-- the app's heart-rate import. Also adds the "heart rate was up" mark to
-- sessions and cardio logs, and a measured max heart rate to preferences.
-- Purely additive; all columns nullable except the key. Apply in the Supabase
-- SQL editor.

CREATE TABLE IF NOT EXISTS ph_workout_heart_rates (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  date             DATE,
  workout_start    TIMESTAMPTZ,
  workout_end      TIMESTAMPTZ,
  workout_type     TEXT,
  duration_minutes INTEGER,
  source_name      TEXT,
  sample_count     INTEGER,
  avg_bpm          INTEGER,
  seconds_by_bpm   TEXT,
  updated_at       TIMESTAMPTZ
);
ALTER TABLE ph_workout_heart_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_workout_heart_rates
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- Tables created in the SQL editor don't inherit the anon grants (see 006).
GRANT SELECT, INSERT, UPDATE, DELETE ON ph_workout_heart_rates TO anon, authenticated;

ALTER TABLE ph_sessions         ADD COLUMN IF NOT EXISTS hr_was_up       BOOLEAN;
ALTER TABLE ph_cardio_logs      ADD COLUMN IF NOT EXISTS hr_was_up       BOOLEAN;
ALTER TABLE ph_user_preferences ADD COLUMN IF NOT EXISTS measured_max_hr INTEGER;
