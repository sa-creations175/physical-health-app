import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Phase 6 cloud sync. The client is created only when both env vars are
// present (they're set in Vercel). Locally / in any env without them, this is
// null and the sync layer no-ops — so the app stays fully functional
// local-first.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// createClient throws synchronously on a malformed URL (e.g. a placeholder in
// .env.production). That throw happens at module-load time, before React
// mounts, which would white-screen the entire app. Guard it: a bad/missing
// cred set falls back to null and sync simply no-ops — boot is never at risk.
function makeClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey);
  } catch (e) {
    console.error('Supabase client init failed (check VITE_SUPABASE_URL):', e);
    return null;
  }
}

export const supabase: SupabaseClient | null = makeClient();

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
