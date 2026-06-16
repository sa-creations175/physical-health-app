-- Phase 3a follow-up — macro-style selector on season setup.
-- Mirrors the Dexie v18 column so write-through upserts of a season row aren't
-- rejected for an unknown column. Defaults 'balanced' so existing rows backfill
-- to the prior implicit split.

ALTER TABLE ph_nutrition_seasons
  ADD COLUMN IF NOT EXISTS macro_style TEXT NOT NULL DEFAULT 'balanced';
