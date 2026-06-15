-- Build 3.0 / Phase 3a — nutrition system foundation (body profile + macros).
-- Mirrors the Dexie v16 schema: three new stores plus one new column on
-- ph_nutrition_logs. Purely additive; all columns nullable except the primary
-- key so partial upserts from syncedUpdate never fail. RLS scoped to the
-- single Phase-6 user, matching every other ph_ table.

-- New column on the existing nutrition log: daily water in 1000ml bottles.
-- (The full meal_entries reshape lands in Phase 3b.)
ALTER TABLE ph_nutrition_logs
  ADD COLUMN IF NOT EXISTS water_bottles_logged INTEGER;

-- ph_body_stats -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_body_stats (
  id             TEXT PRIMARY KEY,
  user_id        TEXT,
  recorded_at    TIMESTAMPTZ,
  weight_lbs     NUMERIC,
  height_inches  NUMERIC,
  age            INTEGER,
  biological_sex TEXT
);
ALTER TABLE ph_body_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_body_stats
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_body_measurements ------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_body_measurements (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  recorded_at   TIMESTAMPTZ,
  neck_inches   NUMERIC,
  waist_inches  NUMERIC,
  hips_inches   NUMERIC,
  bf_percentage NUMERIC,
  source        TEXT,
  notes         TEXT
);
ALTER TABLE ph_body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_body_measurements
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_nutrition_seasons ------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_nutrition_seasons (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  season_type           TEXT,
  goal_answers          TEXT,
  daily_calories_target INTEGER,
  protein_target_g      INTEGER,
  carbs_target_g        INTEGER,
  fat_target_g          INTEGER,
  fiber_guideline_g     INTEGER,
  sodium_guideline_mg   INTEGER,
  sugar_guideline_g     INTEGER,
  water_target_bottles  INTEGER,
  created_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ
);
ALTER TABLE ph_nutrition_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_nutrition_seasons
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');
