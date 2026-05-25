import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Phase 6 cloud sync. The client is created only when both env vars are
// present (they're set in Vercel). Locally / in any env without them, this is
// null and the sync layer no-ops — so the app stays fully functional
// local-first and `createClient(undefined, …)` never throws at module load.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

// Single source of truth: Dexie store name → Supabase table. All ph_-prefixed
// to coexist with the music/finance tables. Used by both the write-through
// layer (syncedWrite) and the startup sync (sync.ts).
export const STORE_TO_PH: Record<string, string> = {
  sessions: 'ph_sessions',
  exercises: 'ph_exercises',
  session_exercises: 'ph_session_exercises',
  sets: 'ph_sets',
  cardio_types: 'ph_cardio_types',
  cardio_logs: 'ph_cardio_logs',
  nutrition_logs: 'ph_nutrition_logs',
  supplements: 'ph_supplements',
  health_checkins: 'ph_health_checkins',
  goals: 'ph_goals',
  prompts: 'ph_prompts',
  user_preferences: 'ph_user_preferences',
  delivery_days: 'ph_delivery_days',
  bundle_logs: 'ph_bundle_logs',
};
