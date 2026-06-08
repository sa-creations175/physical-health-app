// Per-pillar / per-day detail surface (June 5 design, note 4+9). Tapping a
// day-dot on a Fitness pillar opens a small surface scoped to THAT pillar on
// THAT day — view what was logged (incl. Watch imports), add/edit, and the
// manual-reclassify escape hatch for a misfiled Watch workout.
import { db } from '../db/database';
import { LOCAL_USER_ID } from './constants';
import { syncedAdd, syncedUpdate, syncedDelete } from '../db/syncedWrite';
import { createCardioLog, createCardioType } from './cardioHelpers';
import { discardSession } from './strengthHelpers';
import type { BundleLog, Session } from '../db/types';

export type DetailPillar =
  | 'bundle'
  | 'cardio'
  | 'lower'
  | 'upper'
  | 'full_body'
  | 'mobility';

export const PILLAR_LABEL: Record<DetailPillar, string> = {
  bundle: 'Daily Bundle',
  cardio: 'Cardio',
  lower: 'Lower Body',
  upper: 'Upper Body',
  full_body: 'Full Body',
  mobility: 'Mobility',
};

// Reuse a cardio type by (case-insensitive) name, else create it.
async function cardioTypeIdFor(name: string): Promise<string> {
  const all = await db.cardio_types.toArray();
  const existing = all.find(
    (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  return existing ? existing.id : createCardioType(name);
}

// Upsert the day's bundle row with the given fields (creating a watch-sourced
// row if none exists). Used by reclassify when the target is bundle/mobility.
async function upsertBundleFields(
  date: string,
  changes: Partial<BundleLog>,
): Promise<void> {
  const now = new Date().toISOString();
  const row = await db.bundle_logs.where('date').equals(date).first();
  if (row) {
    const patch: Partial<BundleLog> = { ...changes, updated_at: now };
    await syncedUpdate(db.bundle_logs, row.id, patch);
    return;
  }
  const newRow: BundleLog = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    date,
    pushups: 0,
    ab_rolls: 0,
    calf_raises: 0,
    mobility_minutes: null,
    watch_duration_minutes: null,
    source: 'watch',
    created_at: now,
    updated_at: now,
    ...changes,
  };
  await syncedAdd(db.bundle_logs, newRow);
}

// File `minutes` of activity into a pillar on a date (reclassify target).
// Strength pillars create an incomplete, Watch-sourced session.
export async function addToPillar(
  target: DetailPillar,
  date: string,
  minutes: number,
): Promise<void> {
  const note = 'Reclassified from Apple Watch';
  if (target === 'cardio') {
    const typeId = await cardioTypeIdFor('Workout');
    await createCardioLog({
      cardio_type_id: typeId,
      duration_minutes: minutes,
      intensity: 'moderate',
      started_at: `${date}T12:00:00`,
      distance_miles: null,
      notes: note,
      source: 'watch',
    });
    return;
  }
  if (target === 'bundle') {
    await upsertBundleFields(date, { watch_duration_minutes: minutes, source: 'watch' });
    return;
  }
  if (target === 'mobility') {
    await upsertBundleFields(date, { mobility_minutes: minutes, source: 'watch' });
    return;
  }
  // lower / upper / full_body
  const now = new Date().toISOString();
  const session: Session = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    type: target,
    date,
    duration_minutes: minutes,
    notes: note,
    feel_rating: null,
    source: 'watch',
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.sessions, session);
}

// Where a misfiled Watch item currently lives, so reclassify can remove it.
export interface ReclassifySource {
  kind: 'cardio' | 'session' | 'bundleWatch';
  id: string; // cardio_logs / sessions row id, or the bundle_logs row id
  date: string;
  minutes: number;
}

// Move a Watch-sourced item from its current pillar to `target`: remove the
// source record, then re-add the same minutes under the target pillar. All
// writes are sync-aware so the change reaches Supabase.
export async function reclassifyTo(
  source: ReclassifySource,
  target: DetailPillar,
): Promise<void> {
  if (source.kind === 'cardio') {
    await syncedDelete(db.cardio_logs, source.id);
  } else if (source.kind === 'session') {
    await discardSession(source.id); // cascades sets → links → session
  } else {
    // bundleWatch — clear only the Watch duration; keep any manual reps.
    await syncedUpdate(db.bundle_logs, source.id, {
      watch_duration_minutes: null,
      updated_at: new Date().toISOString(),
    });
  }
  await addToPillar(target, source.date, source.minutes);
}
