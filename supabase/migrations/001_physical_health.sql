-- Physical Health App — Phase 6 cloud sync schema.
-- 14 tables, all prefixed `ph_` to coexist with the music/finance tables in
-- the shared Supabase project (this migration is purely additive — it never
-- touches existing tables). Columns mirror the Dexie v12 schema exactly.
--
-- Type notes:
--   * String fields → TEXT (incl. ISO date strings like `date`).
--   * Timestamps → TIMESTAMPTZ.
--   * Counts → INTEGER; measured/decimal values (weight, distance, target_value)
--     → NUMERIC.
--   * Real arrays (supplements_taken) → JSONB.
--   * Fields Dexie stores as *serialized JSON strings*
--     (dashboard_section_order/_config, bundle_mobility_youtube_links) → TEXT,
--     so the write-through layer can round-trip the row verbatim with no
--     parse/stringify step.
--
-- RLS: enabled on every table. Phase 6 is single-user (LOCAL_USER_ID =
-- 'local-user-001'); policies scope to that id. ph_session_exercises and
-- ph_sets have no user_id column (children of user-owned rows), so they get a
-- permissive policy for now. Both USING and WITH CHECK are set so the anon key
-- can read AND insert/update under RLS.
--
-- Only `id` is NOT NULL (the primary key); other columns are nullable so a
-- partial upsert from syncedUpdate can't fail on a missing column.

-- ph_sessions ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  type             TEXT,
  date             TEXT,
  duration_minutes INTEGER,
  notes            TEXT,
  feel_rating      TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
ALTER TABLE ph_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_sessions
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_exercises --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_exercises (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  name         TEXT,
  muscle_group TEXT,
  is_compound  BOOLEAN,
  created_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
ALTER TABLE ph_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_exercises
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_session_exercises (no user_id — child of ph_sessions) -------------------
CREATE TABLE IF NOT EXISTS ph_session_exercises (
  id          TEXT PRIMARY KEY,
  session_id  TEXT,
  exercise_id TEXT,
  order_index INTEGER,
  notes       TEXT
);
ALTER TABLE ph_session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_session_exercises
  FOR ALL USING (true) WITH CHECK (true);

-- ph_sets (no user_id — child of ph_session_exercises) ----------------------
CREATE TABLE IF NOT EXISTS ph_sets (
  id                  TEXT PRIMARY KEY,
  session_exercise_id TEXT,
  set_number          INTEGER,
  weight              NUMERIC,
  reps                INTEGER,
  duration_seconds    INTEGER,
  set_type            TEXT,
  completed           BOOLEAN,
  created_at          TIMESTAMPTZ
);
ALTER TABLE ph_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_sets
  FOR ALL USING (true) WITH CHECK (true);

-- ph_cardio_types -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_cardio_types (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  name         TEXT,
  created_at   TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
ALTER TABLE ph_cardio_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_cardio_types
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_cardio_logs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_cardio_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  session_id       TEXT,
  cardio_type_id   TEXT,
  duration_minutes INTEGER,
  intensity        TEXT,
  started_at       TIMESTAMPTZ,
  distance_miles   NUMERIC,
  notes            TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
ALTER TABLE ph_cardio_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_cardio_logs
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_nutrition_logs ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_nutrition_logs (
  id                TEXT PRIMARY KEY,
  user_id           TEXT,
  date              TEXT,
  protein_grams     INTEGER,
  water_glasses     INTEGER,
  veg_servings      INTEGER,
  supplements_taken JSONB,
  updated_at        TIMESTAMPTZ
);
ALTER TABLE ph_nutrition_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_nutrition_logs
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_supplements ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_supplements (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  name       TEXT,
  active     BOOLEAN,
  created_at TIMESTAMPTZ
);
ALTER TABLE ph_supplements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_supplements
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_health_checkins --------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_health_checkins (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  type             TEXT,
  custom_label     TEXT,
  last_visit_date  TEXT,
  frequency_months INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
ALTER TABLE ph_health_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_health_checkins
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_goals ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_goals (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  pillar          TEXT,
  title           TEXT,
  aspiration_text TEXT,
  metric          TEXT,
  target_value    NUMERIC,
  target_date     TEXT,
  parent_goal_id  TEXT,
  created_at      TIMESTAMPTZ
);
ALTER TABLE ph_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_goals
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_prompts ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_prompts (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT,
  type                 TEXT,
  priority             TEXT,
  fired_at             TIMESTAMPTZ,
  dismissed_at         TIMESTAMPTZ,
  re_prompt_after_days INTEGER
);
ALTER TABLE ph_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_prompts
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_user_preferences (single row per user) ---------------------------------
CREATE TABLE IF NOT EXISTS ph_user_preferences (
  id                            TEXT PRIMARY KEY,
  user_id                       TEXT,
  lifting_target_lower          INTEGER,
  lifting_target_upper          INTEGER,
  lifting_target_full_body      INTEGER,
  cardio_target_weekly          INTEGER,
  cardio_threshold_minutes      INTEGER,
  protein_grams_daily           INTEGER,
  water_glasses_daily           INTEGER,
  veg_servings_daily            INTEGER,
  bundle_pushup_target          INTEGER,
  bundle_abroll_target          INTEGER,
  bundle_calfraise_target       INTEGER,
  bundle_pushup_increment       INTEGER,
  bundle_abroll_increment       INTEGER,
  bundle_calfraise_increment    INTEGER,
  bundle_mobility_target        INTEGER,
  bundle_mobility_min_minutes   INTEGER,
  bundle_mobility_youtube_links TEXT,
  bundle_target                 INTEGER,
  dashboard_section_order       TEXT,
  dashboard_section_config      TEXT,
  created_at                    TIMESTAMPTZ,
  updated_at                    TIMESTAMPTZ
);
ALTER TABLE ph_user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_user_preferences
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_delivery_days ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_delivery_days (
  id         TEXT PRIMARY KEY,
  user_id    TEXT,
  date       TEXT,
  status     TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
ALTER TABLE ph_delivery_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_delivery_days
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- ph_bundle_logs ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ph_bundle_logs (
  id               TEXT PRIMARY KEY,
  user_id          TEXT,
  date             TEXT,
  pushups          INTEGER,
  ab_rolls         INTEGER,
  calf_raises      INTEGER,
  mobility_minutes INTEGER,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ
);
ALTER TABLE ph_bundle_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_bundle_logs
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');
