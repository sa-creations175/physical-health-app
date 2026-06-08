-- Build 2.11 — Fitness Score on Home.
-- Mirror the Dexie v14 columns on the cloud so write-through upserts of the
-- user_preferences row aren't rejected for unknown columns. PostgREST rejects
-- the whole upsert if any column is unknown, so these must exist before the
-- app pushes a prefs row carrying them.
--
-- Three daily-average targets the Fitness Score reads live. Steps + calories
-- were previously hardcoded in the Apple Watch card (10000 / 600); exercise
-- minutes is new (30). Defaults set so any existing row backfills sensibly.

ALTER TABLE ph_user_preferences
  ADD COLUMN IF NOT EXISTS daily_steps_target INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE ph_user_preferences
  ADD COLUMN IF NOT EXISTS daily_calories_target INTEGER NOT NULL DEFAULT 600;
ALTER TABLE ph_user_preferences
  ADD COLUMN IF NOT EXISTS daily_exercise_minutes_target INTEGER NOT NULL DEFAULT 30;
