import { db } from './database';
import { syncedBulkPut, syncedBulkDelete } from './syncedWrite';
import { LOCAL_USER_ID } from '../lib/constants';
import { STARTER_EXERCISES } from './starterExercises';
import type { Exercise } from './types';

// Single in-flight promise so concurrent callers (StrictMode dev double-mount,
// multiple tabs, any other re-entry) await the same execution rather than
// each running a fresh count check before either write commits. The earlier
// boolean-flag-set-after-completion pattern lost the race and let both calls
// pass the empty-table check, double-seeding the library.
let inflight: Promise<void> | null = null;

export async function runSeedersIfNeeded(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    await db.open();
    await dedupeExercisesByName();
    await seedStarterExercisesIfEmpty();
  })();
  return inflight;
}

async function dedupeExercisesByName(): Promise<void> {
  // Heals data after a previously double-seeded run. For each duplicate group,
  // prefer the row referenced by a logged session_exercise (so we don't
  // orphan logged sets); fall back to the oldest by created_at.
  const [all, links] = await Promise.all([
    db.exercises.toArray(),
    db.session_exercises.toArray(),
  ]);
  const referencedIds = new Set(links.map((l) => l.exercise_id));

  const byName = new Map<string, Exercise[]>();
  for (const ex of all) {
    let group = byName.get(ex.name);
    if (!group) {
      group = [];
      byName.set(ex.name, group);
    }
    group.push(ex);
  }

  const toDelete: string[] = [];
  for (const group of byName.values()) {
    if (group.length === 1) continue;
    const referenced = group.filter((e) => referencedIds.has(e.id));
    const candidates = referenced.length > 0 ? referenced : group.slice();
    candidates.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const keep = candidates[0];
    for (const ex of group) {
      if (ex.id !== keep.id) toDelete.push(ex.id);
    }
  }

  if (toDelete.length > 0) {
    await syncedBulkDelete(db.exercises, toDelete);
  }
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
