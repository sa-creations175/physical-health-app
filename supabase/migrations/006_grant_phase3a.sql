-- Build 3.0 / Phase 3a — grant table privileges on the new nutrition tables.
--
-- Migration 005 created ph_body_stats / ph_body_measurements /
-- ph_nutrition_seasons with RLS enabled and per-user policies, but tables
-- created via the SQL editor do NOT inherit the anon/authenticated table-level
-- GRANTs that the project's existing ph_ tables have. Without these grants,
-- every anon-key request — the app's write-through (INSERT/UPDATE) and the
-- startup pull (SELECT) — fails with `42501 permission denied for table`
-- BEFORE row-level security is even evaluated. The result: nothing ever
-- reached the cloud, so a clean Capacitor rebuild (which wipes IndexedDB) had
-- nothing to restore and the user's setup was lost.
--
-- RLS still governs which ROWS are visible/writable on top of these grants;
-- the grants only restore table-level access for the anon/authenticated roles.
-- Idempotent — safe to re-run.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ph_body_stats, ph_body_measurements, ph_nutrition_seasons
  TO anon, authenticated;
