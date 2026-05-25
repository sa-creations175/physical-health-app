-- Build 2.9 — Apple Watch workout auto-import.
-- Mirror the Dexie v13 columns on the cloud tables so write-through upserts
-- don't get rejected for unknown columns.
--
-- `source` ('manual' | 'watch' | null) records provenance on the three tables
-- the importer writes to. `watch_duration_minutes` is added to ph_bundle_logs
-- as well (beyond the original spec): every BundleLog now carries that field,
-- and PostgREST rejects an entire upsert if any column is unknown — so without
-- it, ALL bundle_logs cloud writes would start failing silently.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS lets this be re-run safely.

ALTER TABLE ph_cardio_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ph_sessions    ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ph_bundle_logs ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ph_bundle_logs ADD COLUMN IF NOT EXISTS watch_duration_minutes INTEGER;
