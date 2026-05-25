-- Phase 6 RLS fix. The original "user access" policy
--   FOR ALL USING (user_id = 'local-user-001') WITH CHECK (user_id = 'local-user-001')
-- was rejecting queries. Replace every ph_ table's policy with a fully
-- permissive one for now — single user, no auth yet. Idempotent: DROP ... IF
-- EXISTS lets this be re-run safely.

DROP POLICY IF EXISTS "user access" ON ph_sessions;
CREATE POLICY "allow all" ON ph_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_exercises;
CREATE POLICY "allow all" ON ph_exercises FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_session_exercises;
CREATE POLICY "allow all" ON ph_session_exercises FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_sets;
CREATE POLICY "allow all" ON ph_sets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_cardio_types;
CREATE POLICY "allow all" ON ph_cardio_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_cardio_logs;
CREATE POLICY "allow all" ON ph_cardio_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_nutrition_logs;
CREATE POLICY "allow all" ON ph_nutrition_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_supplements;
CREATE POLICY "allow all" ON ph_supplements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_health_checkins;
CREATE POLICY "allow all" ON ph_health_checkins FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_goals;
CREATE POLICY "allow all" ON ph_goals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_prompts;
CREATE POLICY "allow all" ON ph_prompts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_user_preferences;
CREATE POLICY "allow all" ON ph_user_preferences FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_delivery_days;
CREATE POLICY "allow all" ON ph_delivery_days FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "user access" ON ph_bundle_logs;
CREATE POLICY "allow all" ON ph_bundle_logs FOR ALL USING (true) WITH CHECK (true);
