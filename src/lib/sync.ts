import type { Table } from 'dexie';
import { db } from '../db/database';
import { supabase } from './supabase';
import { logSync } from './syncDebug';

// Phase 6 startup sync. Two passes, both best-effort and guarded so they can
// never break local boot or — critically — destroy local data:
//   1. Initial push: the first time the cloud is empty, seed it from local.
//   2. Pull: merge cloud rows into local (upsert by id, NON-destructive).
//
// Local Dexie remains the source of truth the UI reads; this only replicates.

// All 14 stores paired with their ph_ tables. Order is irrelevant (no FK
// constraints in the Supabase schema).
const TABLES: { table: Table<unknown, string>; ph: string }[] = [
  { table: db.sessions, ph: 'ph_sessions' },
  { table: db.exercises, ph: 'ph_exercises' },
  { table: db.session_exercises, ph: 'ph_session_exercises' },
  { table: db.sets, ph: 'ph_sets' },
  { table: db.cardio_types, ph: 'ph_cardio_types' },
  { table: db.cardio_logs, ph: 'ph_cardio_logs' },
  { table: db.nutrition_logs, ph: 'ph_nutrition_logs' },
  { table: db.supplements, ph: 'ph_supplements' },
  { table: db.health_checkins, ph: 'ph_health_checkins' },
  { table: db.goals, ph: 'ph_goals' },
  { table: db.prompts, ph: 'ph_prompts' },
  { table: db.user_preferences, ph: 'ph_user_preferences' },
  { table: db.delivery_days, ph: 'ph_delivery_days' },
  { table: db.bundle_logs, ph: 'ph_bundle_logs' },
];

const INITIAL_PUSH_FLAG = 'ph_cloud_initial_push_done';

// One-time: if the cloud has no sessions yet, push all local rows up so any
// data logged before sync existed lands in the cloud. Skips (without marking
// done) on any error — e.g. the migration hasn't been applied yet — so it
// retries on a later load once the tables exist.
async function initialPushIfEmpty(): Promise<void> {
  // Verbose console.error tracing (temporary debug) — iOS Safari surfaces
  // errors more reliably than logs. Logged before the early returns so a
  // null client / set flag is still visible.
  // Step tracing surfaced in the Settings "Sync debug output" panel.
  logSync('SYNC: starting initial push check');
  logSync('SYNC: supabase client =', supabase ? 'present' : 'NULL');
  if (!supabase) return;

  logSync('SYNC: flag =', localStorage.getItem(INITIAL_PUSH_FLAG));
  if (localStorage.getItem(INITIAL_PUSH_FLAG)) return;

  const { count, error } = await supabase
    .from('ph_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', 'local-user-001');
  logSync('SYNC: ph_sessions count result =', { count, error });
  if (error) return; // tables missing / unreachable — retry next load
  if ((count ?? 0) > 0) {
    // Cloud already populated (another device/origin) — nothing to push.
    localStorage.setItem(INITIAL_PUSH_FLAG, '1');
    return;
  }

  const localSessions = await db.sessions.toArray();
  logSync('SYNC: local sessions count =', localSessions.length);

  let insertError: unknown = null;
  for (const { table, ph } of TABLES) {
    const rows = await table.toArray();
    if (rows.length === 0) continue;
    const res = await supabase.from(ph).insert(rows);
    if (res.error) {
      insertError = res.error;
      break;
    }
  }
  logSync('SYNC: push result =', { error: insertError });
  if (insertError) return; // bail without the flag so the push retries
  localStorage.setItem(INITIAL_PUSH_FLAG, '1');
}

// Merge cloud → local. Upsert by primary key via a RAW Dexie bulkPut (NOT the
// synced* wrapper) so it doesn't echo back to the cloud. Deliberately
// non-destructive: a table is only touched when the cloud returns rows for it,
// and local-only rows are never deleted. (A failed/empty pull can therefore
// never wipe local data.)
// ph_ tables that have no user_id column (children of user-owned rows) — they
// can't be filtered by user_id and rely on their permissive RLS policy.
const PH_NO_USER_ID = new Set(['ph_session_exercises', 'ph_sets']);

async function pullFromCloud(): Promise<void> {
  if (!supabase) return;
  for (const { table, ph } of TABLES) {
    try {
      let query = supabase.from(ph).select('*');
      if (!PH_NO_USER_ID.has(ph)) {
        query = query.eq('user_id', 'local-user-001');
      }
      const { data, error } = await query;
      if (error || !data || data.length === 0) continue;
      await table.bulkPut(data as unknown[]);
    } catch {
      /* per-table failure is isolated; never blocks the rest */
    }
  }
}

// Called once at startup after Dexie is seeded/ready. No-ops without a client.
export async function runCloudSync(): Promise<void> {
  if (!supabase) return;
  try {
    await initialPushIfEmpty();
    await pullFromCloud();
  } catch {
    /* sync is best-effort — startup must never depend on it */
  }
}
