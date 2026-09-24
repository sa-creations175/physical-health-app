// Heart-rate import from HealthKit. Mirrors the Apple Watch workout import:
// iOS only, runs at app open, fully guarded, safe to repeat.
//
// Duplicate protection: each workout's row id is the Watch import's own
// workout identity (start time, type, rounded minutes), so re-reading a
// workout updates its row instead of adding another. Nothing is deleted.
import { Capacitor } from '@capacitor/core';
import { db } from '../db/database';
import { syncedBulkPut } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { ensureHealthPermissions, getWorkoutsWithHeartRate } from './healthkit';
import { summarizeReadings } from './heartRate';
import { workoutKey } from './watchImport';
import type { WorkoutHeartRate } from '../db/types';

export const LAST_HEART_IMPORT_KEY = 'ph_last_heart_import';
const BACKFILL_FLAG = 'ph_heart_backfill_v1';
export const HEART_BACKFILL_DAYS = 90;
const ROUTINE_DAYS = 7;

const SAME: (keyof WorkoutHeartRate)[] = [
  'date',
  'workout_end',
  'workout_type',
  'duration_minutes',
  'source_name',
  'sample_count',
  'avg_bpm',
  'seconds_by_bpm',
];

// Import heart rate for the Watch workouts of the last `daysBack` days.
// Returns how many workout rows were written (new or changed).
export async function importHeartRate(daysBack = ROUTINE_DAYS): Promise<number> {
  if (Capacitor.getPlatform() !== 'ios') return 0;
  if (!(await ensureHealthPermissions())) return 0;
  const workouts = await getWorkoutsWithHeartRate(daysBack);
  if (workouts.length === 0) return 0;

  const now = new Date().toISOString();
  const rows: WorkoutHeartRate[] = workouts.map((w) => {
    const summary = summarizeReadings(w.heartRate, w.endDate);
    return {
      id: `hr-${workoutKey(w)}`,
      user_id: LOCAL_USER_ID,
      date: new Date(w.startDate).toLocaleDateString('en-CA'),
      workout_start: new Date(w.startDate).toISOString(),
      workout_end: new Date(w.endDate).toISOString(),
      workout_type: w.workoutType,
      duration_minutes: w.durationMinutes,
      source_name: w.sourceName,
      sample_count: summary.sampleCount,
      avg_bpm: summary.avgBpm,
      seconds_by_bpm: JSON.stringify(summary.secondsByBpm),
      updated_at: now,
    };
  });
  const existing = new Map(
    (await db.workout_heart_rates.bulkGet(rows.map((r) => r.id)))
      .filter((r): r is WorkoutHeartRate => !!r)
      .map((r) => [r.id, r]),
  );
  const changed = rows.filter((r) => {
    const prev = existing.get(r.id);
    return !prev || SAME.some((k) => prev[k] !== r[k]);
  });
  if (changed.length > 0) await syncedBulkPut(db.workout_heart_rates, changed);
  try {
    localStorage.setItem(LAST_HEART_IMPORT_KEY, now);
  } catch {
    /* informational only */
  }
  return changed.length;
}

// Called once at startup: 90 days the first time, then the last week. The
// backfill is marked done only once it has read something.
export async function importHeartRateIfAvailable(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    if (localStorage.getItem(BACKFILL_FLAG) === null) {
      await importHeartRate(HEART_BACKFILL_DAYS);
      if (localStorage.getItem(LAST_HEART_IMPORT_KEY) !== null) {
        localStorage.setItem(BACKFILL_FLAG, new Date().toISOString());
      }
      return;
    }
    await importHeartRate(ROUTINE_DAYS);
  } catch (e) {
    console.error('Heart-rate import failed:', e);
  }
}
