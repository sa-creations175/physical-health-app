import { db } from './database';
import { syncedBulkPut } from './syncedWrite';
import { LOCAL_USER_ID } from '../lib/constants';
import { STARTER_EXERCISES } from './starterExercises';
import type { Exercise } from './types';

// Lifecycle-aware: defers until db.open() resolves, writes through the
// synced-write wrapper so Phase 6 sync queueing fires for seed rows too.
// Per-process guard prevents repeat work within a single page load;
// per-table count check prevents re-seeding across reloads.
let hasRunInThisSession = false;

export async function runSeedersIfNeeded(): Promise<void> {
  if (hasRunInThisSession) return;
  await db.open();
  await seedStarterExercisesIfEmpty();
  hasRunInThisSession = true;
}

async function seedStarterExercisesIfEmpty(): Promise<void> {
  const count = await db.exercises.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  const rows: Exercise[] = STARTER_EXERCISES.map((ex) => ({
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    name: ex.name,
    muscle_group: ex.muscle_group,
    is_compound: ex.is_compound,
    created_at: now,
    last_used_at: null,
  }));

  await syncedBulkPut(db.exercises, rows);
}
