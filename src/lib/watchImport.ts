// Apple Watch workout auto-import (Build 2.9).
//
// On every app open (iOS only), pull the last 7 days of HealthKit workouts and
// file each into the right app section — cardio logs, the daily bundle, mobility
// minutes, or a strength session — with smart duplicate prevention so re-opening
// the app never double-imports. Everything is best-effort and guarded: a failure
// for one workout is logged and skipped, never propagated to startup.
import { Capacitor } from '@capacitor/core';
import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import {
  ensureHealthPermissions,
  getRecentWorkouts,
  type HealthWorkout,
} from './healthkit';
import { createCardioLog, createCardioType } from './cardioHelpers';
import type { BundleLog, Session } from '../db/types';

// localStorage marker — the timestamp of the last import run. Retained as a
// "Last synced" display value and a coarse perf bound (we never scan further
// back than the lookback window). It is NO LONGER a correctness gate: dedup is
// now identity-based (see below), so a workout that reaches HealthKit *after*
// this marker advanced past its start time is still picked up.
export const LAST_IMPORT_KEY = 'ph_last_watch_import';

// Identity-based dedup. A forward-only timestamp gate silently locked out any
// workout whose start preceded the marker but hadn't actually been imported yet
// (Watch → iPhone HealthKit sync lag, multiple app opens per day). Instead we
// remember a stable identity per processed workout and skip on that, so each
// workout is filed exactly once regardless of when it surfaces or in what order.
const IMPORTED_KEYS_KEY = 'ph_watch_imported_keys';

// Stable per-workout identity. HealthKit start timestamps are unique per
// workout; combining start + type + rounded duration is collision-proof in
// practice and available from every workout row without a source UUID.
export function workoutKey(w: HealthWorkout): string {
  return `${w.startDate}|${w.workoutType}|${w.durationMinutes}`;
}

function loadImportedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(IMPORTED_KEYS_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

// Persist the imported-key set, pruning anything older than the scan window so
// localStorage doesn't grow without bound — keys outside the window are never
// consulted again anyway.
function saveImportedKeys(keys: Set<string>, windowStartMs: number): void {
  const pruned = [...keys].filter((k) => {
    const t = Date.parse(k.slice(0, k.indexOf('|')));
    return Number.isNaN(t) || t >= windowStartMs;
  });
  try {
    localStorage.setItem(IMPORTED_KEYS_KEY, JSON.stringify(pruned));
  } catch {
    /* storage full / unavailable — dedup degrades to the per-category checks */
  }
}

// The workouts that still need filing: those whose identity isn't already in the
// processed set. Pure + exported so the dedup decision is unit-testable without
// HealthKit. This REPLACES the old `startDate > marker` gate.
export function selectWorkoutsToProcess(
  workouts: HealthWorkout[],
  importedKeys: Set<string>,
): HealthWorkout[] {
  return workouts.filter((w) => !importedKeys.has(workoutKey(w)));
}

// A cardio workout within this window of an existing cardio log is treated as
// the same activity (the user may have logged it manually, or a previous import
// already filed it).
const CARDIO_DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

// HKWorkoutActivityType identifiers that map to mobility/flexibility. These are
// the exact strings the capacitor-health plugin emits (HealthKit raw → string).
// NB: 'stretchingCooldown' is NOT one of them — Apple's stretch/cooldown types
// surface as 'flexibility' (62) and 'cooldown' (80), which is why Watch mobility
// previously never populated the mobility row.
const MOBILITY_TYPES = new Set([
  'yoga',
  'flexibility',
  'cooldown',
  'mindAndBody',
  'pilates',
  'preparationAndRecovery',
  'taiChi',
  'barre',
]);

export type WatchCategory = 'strength' | 'bundle' | 'cardio' | 'mobility';

export interface WatchClassification {
  category: WatchCategory;
  inferredStrengthType?: 'upper' | 'lower' | 'full_body';
}

// Decide which app section a Watch workout belongs to. Strength type is a
// static default here ('full_body'); the orchestrator refines it from a
// matching manual session when one exists on the same day.
export function classifyWatchWorkout(
  type: string,
  durationMinutes: number,
): WatchClassification {
  if (type === 'traditionalStrengthTraining') {
    return durationMinutes > 30
      ? { category: 'strength', inferredStrengthType: 'full_body' }
      : { category: 'bundle' };
  }
  if (type === 'functionalStrengthTraining') return { category: 'bundle' };
  if (MOBILITY_TYPES.has(type)) return { category: 'mobility' };
  return { category: 'cardio' };
}

// ---- Duplicate detection -------------------------------------------------

// A cardio log within ±30 min of this start already covers the workout.
export async function isDuplicateCardio(startDate: Date): Promise<boolean> {
  const logs = await db.cardio_logs
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .toArray();
  const t = startDate.getTime();
  return logs.some(
    (l) => Math.abs(new Date(l.started_at).getTime() - t) < CARDIO_DUPLICATE_WINDOW_MS,
  );
}

// A Watch strength *duration* has already been imported for this day. Only the
// Watch-sourced field counts — manual pushups/ab-rolls/calf-raises/mobility are
// independent things the user logs by hand, and must NOT block the Watch
// session's duration from landing (that was the silent-drop bug: a manually
// logged bundle made every short Watch strength session look like a duplicate).
export async function isDuplicateBundle(date: string): Promise<boolean> {
  const row = await db.bundle_logs.where('date').equals(date).first();
  return !!row && (row.watch_duration_minutes ?? 0) > 0;
}

// Mobility minutes already logged for the day.
export async function isDuplicateMobility(date: string): Promise<boolean> {
  const row = await db.bundle_logs.where('date').equals(date).first();
  return !!row && (row.mobility_minutes ?? 0) > 0;
}

// A completed (feel_rating set) strength session on the same day — used to
// inherit its type and to merge the Watch duration into it. null if none.
export async function findMatchingStrengthSession(
  date: string,
): Promise<Session | null> {
  const sessions = await db.sessions.where('date').equals(date).toArray();
  const match = sessions.find(
    (s) =>
      s.feel_rating !== null &&
      (s.type === 'upper' || s.type === 'lower' || s.type === 'full_body'),
  );
  return match ?? null;
}

// An already-imported incomplete Watch strength session for the day, if any.
// Used to keep a re-scan from creating duplicate auto-sessions.
async function findWatchStrengthSession(date: string): Promise<Session | null> {
  const sessions = await db.sessions.where('date').equals(date).toArray();
  const match = sessions.find(
    (s) =>
      s.source === 'watch' &&
      (s.type === 'upper' || s.type === 'lower' || s.type === 'full_body'),
  );
  return match ?? null;
}

// ---- Cardio type name mapping --------------------------------------------

const CARDIO_NAME_MAP: Record<string, string> = {
  stairClimbing: 'Stair Climbing',
  running: 'Run',
  cycling: 'Bike',
  walking: 'Walk',
  hiking: 'Hike',
  swimming: 'Swim',
  elliptical: 'Elliptical',
  rowing: 'Row',
  dancing: 'Dance',
  dance: 'Dance',
  cardioDance: 'Dance',
  socialDance: 'Dance',
  jumpRope: 'Jump Rope',
};

function titleCase(type: string): string {
  return type
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase boundaries
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case each word
}

function cardioTypeNameFor(type: string): string {
  return CARDIO_NAME_MAP[type] ?? titleCase(type);
}

// Reuse an existing cardio_type by (case-insensitive) name, else create one.
async function getOrCreateCardioTypeId(name: string): Promise<string> {
  const all = await db.cardio_types.toArray();
  const existing = all.find(
    (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing) return existing.id;
  return createCardioType(name);
}

// Upsert the day's bundle row with Watch-sourced fields, marking provenance.
async function upsertWatchBundle(
  date: string,
  changes: Partial<BundleLog>,
): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.bundle_logs.where('date').equals(date).first();
  if (existing) {
    // Don't clobber a manually-logged row's provenance: if the user already
    // tapped reps/mobility that day, mark the merged row 'merged' (manual work
    // + Watch duration) rather than overwriting it to 'watch'.
    const hasManual =
      existing.pushups +
        existing.ab_rolls +
        existing.calf_raises +
        (existing.mobility_minutes ?? 0) >
      0;
    await syncedUpdate(db.bundle_logs, existing.id, {
      ...changes,
      source: hasManual ? 'merged' : 'watch',
      updated_at: now,
    });
    return;
  }
  const row: BundleLog = {
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
  await syncedAdd(db.bundle_logs, row);
}

// ---- Per-workout filing ---------------------------------------------------

// Result of filing one workout — surfaced by the debug log so we can see
// what each workout classified as and whether it landed or was skipped.
interface ImportResult {
  category: WatchCategory;
  action: 'imported' | 'skipped';
  detail: string;
}

async function importOne(w: HealthWorkout): Promise<ImportResult> {
  const start = new Date(w.startDate);
  const date = start.toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const { category, inferredStrengthType } = classifyWatchWorkout(
    w.workoutType,
    w.durationMinutes,
  );

  if (category === 'cardio') {
    if (await isDuplicateCardio(start)) {
      return { category, action: 'skipped', detail: 'duplicate cardio within 30 min' };
    }
    const typeName = cardioTypeNameFor(w.workoutType);
    const typeId = await getOrCreateCardioTypeId(typeName);
    await createCardioLog({
      cardio_type_id: typeId,
      duration_minutes: w.durationMinutes,
      intensity: 'moderate',
      started_at: w.startDate,
      distance_miles: null,
      notes: `Auto-imported from Apple Watch · ${w.calories}cal`,
      source: 'watch',
    });
    return { category, action: 'imported', detail: `cardio_log "${typeName}"` };
  }

  if (category === 'mobility') {
    if (await isDuplicateMobility(date)) {
      return { category, action: 'skipped', detail: 'mobility already logged that day' };
    }
    await upsertWatchBundle(date, { mobility_minutes: w.durationMinutes });
    return { category, action: 'imported', detail: `mobility_minutes=${w.durationMinutes}` };
  }

  if (category === 'bundle') {
    if (await isDuplicateBundle(date)) {
      return { category, action: 'skipped', detail: 'bundle already has data that day' };
    }
    await upsertWatchBundle(date, { watch_duration_minutes: w.durationMinutes });
    return {
      category,
      action: 'imported',
      detail: `watch_duration_minutes=${w.durationMinutes}`,
    };
  }

  // strength (traditionalStrengthTraining > 30 min): merge into a manual
  // session if one exists that day, else create an incomplete Watch session.
  // Re-scan safety: if a previous import already created an incomplete Watch
  // session for this day, don't create a second one (the matching-session path
  // below only finds *completed* manual sessions, so it wouldn't catch this).
  const existingWatch = await findWatchStrengthSession(date);
  if (existingWatch) {
    return {
      category,
      action: 'skipped',
      detail: 'Watch strength session already imported that day',
    };
  }

  const match = await findMatchingStrengthSession(date);
  if (match) {
    const changes: Partial<Session> = {
      duration_minutes: w.durationMinutes,
      // 'merged' (not 'watch') — the exercises/sets are the user's manual work;
      // only the duration came from the Watch. Preserves the distinction while
      // still flagging the row as Watch-augmented in History.
      source: 'merged',
      updated_at: new Date().toISOString(),
    };
    if (!match.notes || match.notes.trim() === '') {
      changes.notes = 'Duration from Apple Watch';
    }
    await syncedUpdate(db.sessions, match.id, changes);
    return { category, action: 'imported', detail: `merged into ${match.type} session` };
  }

  const now = new Date().toISOString();
  const session: Session = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    type: inferredStrengthType ?? 'full_body',
    date,
    duration_minutes: w.durationMinutes,
    notes: 'Auto-imported from Apple Watch · no exercises logged',
    feel_rating: null, // incomplete — hidden from dashboard counts, shown in History
    source: 'watch',
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.sessions, session);
  return {
    category,
    action: 'imported',
    detail: `created ${session.type} session (incomplete)`,
  };
}

// ---- Orchestrator ---------------------------------------------------------

// Called once at startup (after cloud sync) on iOS. Scans a rolling window of
// HealthKit workouts (≥ 24h — default 7 days) and files each one that hasn't
// been processed before, keyed by identity rather than a timestamp gate, so
// same-day stragglers that arrive after a prior run are still caught. Safe to
// call anywhere — no-ops off iOS / without HealthKit.
export async function importWatchWorkouts(daysBack = 7): Promise<number> {
  if (Capacitor.getPlatform() !== 'ios') {
    return 0;
  }
  if (!(await ensureHealthPermissions())) {
    return 0;
  }

  // Always look back at least 24h so a workout that synced from the Watch after
  // an earlier same-day open is still in range.
  const lookbackDays = Math.max(1, daysBack);
  const workouts = await getRecentWorkouts(lookbackDays);
  const windowStartMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const importedKeys = loadImportedKeys();
  const pending = selectWorkoutsToProcess(workouts, importedKeys);

  let importedCount = 0;
  for (const w of pending) {
    try {
      const { action } = await importOne(w);
      // Mark processed whether it was imported or skipped as a same-day/category
      // duplicate — both mean "handled, don't revisit". Only a thrown error
      // leaves the key unset so a transient failure retries next launch. (On a
      // cold start with an empty key set, the per-category dedup in importOne is
      // the safety net that prevents re-importing already-filed workouts.)
      importedKeys.add(workoutKey(w));
      if (action === 'imported') importedCount += 1;
    } catch (e) {
      console.error('Watch import error for workout', w.workoutType, e);
    }
  }

  saveImportedKeys(importedKeys, windowStartMs);
  localStorage.setItem(LAST_IMPORT_KEY, new Date().toISOString());
  return importedCount;
}
