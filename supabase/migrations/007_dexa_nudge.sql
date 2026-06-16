-- Phase 3a follow-up — one-time DEXA-scan nudge on the Nutrition tab.
-- Mirrors the Dexie v17 column so write-through upserts of the user_preferences
-- row aren't rejected for an unknown column. Defaults false so existing rows
-- backfill to "not yet dismissed".

ALTER TABLE ph_user_preferences
  ADD COLUMN IF NOT EXISTS dexa_nudge_dismissed BOOLEAN NOT NULL DEFAULT false;
