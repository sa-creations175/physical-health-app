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

// localStorage marker for the high-water mark of imported workouts. Read on
// startup so we only process workouts that started after the last run; also
// surfaced as "Last synced" in the Apple Watch card.
export const LAST_IMPORT_KEY = 'ph_last_watch_import';

// A cardio workout within this window of an existing cardio log is treated as
// the same activity (the user may have logged it manually, or a previous import
// already filed it).
const CARDIO_DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

// HKWorkoutActivityType identifiers that map to mobility/flexibility.
const MOBILITY_TYPES = new Set([
  'yoga',
  'stretchingCooldown',
  'mindAndBody',
  'pilates',
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

// A bundle row already exists for the day with any logged work.
export async function isDuplicateBundle(date: string): Promise<boolean> {
  const row = await db.bundle_logs.where('date').equals(date).first();
  if (!row) return false;
  return (
    row.pushups +
      row.ab_rolls +
      row.calf_raises +
      (row.mobility_minutes ?? 0) +
      (row.watch_duration_minutes ?? 0) >
    0
  );
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
    await syncedUpdate(db.bundle_logs, existing.id, {
      ...changes,
      source: 'watch',
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

async function importOne(w: HealthWorkout): Promise<void> {
  const start = new Date(w.startDate);
  const date = start.toLocaleDateString('en-CA'); // local YYYY-MM-DD
  const { category, inferredStrengthType } = classifyWatchWorkout(
    w.workoutType,
    w.durationMinutes,
  );

  if (category === 'cardio') {
    if (await isDuplicateCardio(start)) return;
    const typeId = await getOrCreateCardioTypeId(cardioTypeNameFor(w.workoutType));
    await createCardioLog({
      cardio_type_id: typeId,
      duration_minutes: w.durationMinutes,
      intensity: 'moderate',
      started_at: w.startDate,
      distance_miles: null,
      notes: `Auto-imported from Apple Watch · ${w.calories}cal`,
      source: 'watch',
    });
    return;
  }

  if (category === 'mobility') {
    if (await isDuplicateMobility(date)) return;
    await upsertWatchBundle(date, { mobility_minutes: w.durationMinutes });
    return;
  }

  if (category === 'bundle') {
    if (await isDuplicateBundle(date)) return;
    await upsertWatchBundle(date, { watch_duration_minutes: w.durationMinutes });
    return;
  }

  // strength (traditionalStrengthTraining > 30 min): merge into a manual
  // session if one exists that day, else create an incomplete Watch session.
  const match = await findMatchingStrengthSession(date);
  if (match) {
    const changes: Partial<Session> = {
      duration_minutes: w.durationMinutes,
      updated_at: new Date().toISOString(),
    };
    if (!match.notes || match.notes.trim() === '') {
      changes.notes = 'Duration from Apple Watch';
    }
    await syncedUpdate(db.sessions, match.id, changes);
    return;
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
}

// ---- Orchestrator ---------------------------------------------------------

// Called once at startup (after cloud sync) on iOS. Reads the last 7 days of
// Watch workouts, processes only those started after the last import, and bumps
// the high-water mark. Safe to call anywhere — no-ops off iOS / without HealthKit.
export async function importWatchWorkouts(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  if (!(await ensureHealthPermissions())) return;

  const workouts = await getRecentWorkouts();

  const lastRaw = localStorage.getItem(LAST_IMPORT_KEY);
  const last = lastRaw ? new Date(lastRaw) : null;
  const fresh =
    last && !Number.isNaN(last.getTime())
      ? workouts.filter((w) => new Date(w.startDate) > last)
      : workouts; // first run: process the whole window

  for (const w of fresh) {
    try {
      await importOne(w);
    } catch (e) {
      console.error('Watch import error for workout', w.workoutType, e);
    }
  }

  localStorage.setItem(LAST_IMPORT_KEY, new Date().toISOString());
}
