-- Body goals (Dexie v20). One row per goal the person owns: weekly counts
-- (Lower Body 2 a week) and daily averages (steps a day). Home and Fitness read
-- every target from here. Purely additive; all columns nullable except the key.
-- Apply in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS ph_body_goals (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  name        TEXT,
  metric      TEXT,
  target      NUMERIC,
  unit        TEXT,
  period      TEXT,
  active      BOOLEAN,
  order_index INTEGER,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
);
ALTER TABLE ph_body_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_body_goals
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- Tables created in the SQL editor don't inherit the anon grants (see 006).
GRANT SELECT, INSERT, UPDATE, DELETE ON ph_body_goals TO anon, authenticated;
