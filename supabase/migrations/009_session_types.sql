-- Session types and instances (Dexie v19).
-- A strength session TYPE owns a standing exercise list (ph_session_plans);
-- a session INSTANCE copies it. Mirrors the new Dexie columns so write-through
-- upserts aren't rejected for unknown columns. Purely additive; every column
-- nullable. Apply in the Supabase SQL editor.

-- Session completion flag (the session screen no longer asks for a feel rating).
ALTER TABLE ph_sessions
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Instance metadata on each exercise in a session.
ALTER TABLE ph_session_exercises
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS replaced_exercise_id TEXT,
  ADD COLUMN IF NOT EXISTS finished_order INTEGER,
  ADD COLUMN IF NOT EXISTS nudge_resolved BOOLEAN;

-- "Repeat a set with one tap" setting.
ALTER TABLE ph_user_preferences
  ADD COLUMN IF NOT EXISTS one_tap_repeat BOOLEAN NOT NULL DEFAULT TRUE;

-- One standing list per strength type.
CREATE TABLE IF NOT EXISTS ph_session_plans (
  id           TEXT PRIMARY KEY,
  user_id      TEXT,
  type         TEXT,
  exercise_ids JSONB,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
);
ALTER TABLE ph_session_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user access" ON ph_session_plans
  FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001');

-- Tables created in the SQL editor don't inherit the anon grants (see 006).
GRANT SELECT, INSERT, UPDATE, DELETE ON ph_session_plans TO anon, authenticated;
