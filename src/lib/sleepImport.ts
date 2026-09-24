// Sleep import from HealthKit. Mirrors the Apple Watch workout import: iOS
// only, runs at app open after the workout import, fully guarded so a failure
// never touches startup, and safe to repeat.
//
// Duplicate protection: every night has a fixed identity, its morning date
// (row id `night-YYYY-MM-DD`), so re-reading a night updates that row instead
// of adding another. Nights are recomputed from the raw samples each time, so
// a night the Watch was still syncing on the last open gets filled in on the
// next. A night that reads as empty (no permission, no data) never overwrites
// or deletes a row already stored.
import { Capacitor } from '@capacitor/core';
import { db } from '../db/database';
import { syncedBulkPut } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { ensureHealthPermissions, getSleepSamples } from './healthkit';
import { computeNights } from './sleepNights';
import { addDaysISO, todayISODate } from './dateHelpers';
import type { SleepNight } from '../db/types';

// When the sleep import last ran ("last synced").
export const LAST_SLEEP_IMPORT_KEY = 'ph_last_sleep_import';

// First run reads 90 days of history; later runs re-read the last week.
const BACKFILL_FLAG = 'ph_sleep_backfill_v1';
export const SLEEP_BACKFILL_DAYS = 90;
const ROUTINE_DAYS = 7;

const SAME_FIELDS: (keyof SleepNight)[] = [
  'asleep_minutes',
  'core_minutes',
  'deep_minutes',
  'rem_minutes',
  'unspecified_minutes',
  'awake_minutes',
  'in_bed_minutes',
  'sleep_start',
  'sleep_end',
  'nap_minutes',
  'source_name',
  'source_bundle_id',
];

// Import `daysBack` nights up to and including last night. Returns how many
// nights were written (new or changed).
export async function importSleep(daysBack = ROUTINE_DAYS): Promise<number> {
  if (Capacitor.getPlatform() !== 'ios') return 0;
  if (!(await ensureHealthPermissions())) return 0;

  const today = todayISODate();
  const dates = Array.from({ length: daysBack + 1 }, (_, i) => addDaysISO(today, -daysBack + i));
  // Samples from 6 PM the evening before the first night, through now.
  const from = new Date(addDaysISO(dates[0], -1) + 'T00:00:00');
  from.setHours(18, 0, 0, 0);
  const samples = await getSleepSamples(from.toISOString(), new Date().toISOString());
  if (samples.length === 0) return 0;

  const existing = new Map(
    (await db.sleep_nights.where('date').between(dates[0], today, true, true).toArray()).map((n) => [
      n.id,
      n,
    ]),
  );
  const now = new Date().toISOString();
  const changed: SleepNight[] = [];
  for (const n of computeNights(samples, dates)) {
    const prev = existing.get(n.id);
    if (prev && SAME_FIELDS.every((k) => prev[k] === n[k as keyof typeof n])) continue;
    changed.push({ ...n, user_id: LOCAL_USER_ID, updated_at: now });
  }
  if (changed.length > 0) await syncedBulkPut(db.sleep_nights, changed);
  try {
    localStorage.setItem(LAST_SLEEP_IMPORT_KEY, now);
  } catch {
    /* storage unavailable: the marker is informational only */
  }
  return changed.length;
}

// Called once at startup. The first time, 90 days of history; after that the
// last week. The backfill flag is only set once the backfill actually read
// something, so a first run without permission retries next launch.
export async function importSleepIfAvailable(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    if (localStorage.getItem(BACKFILL_FLAG) === null) {
      await importSleep(SLEEP_BACKFILL_DAYS);
      if (localStorage.getItem(LAST_SLEEP_IMPORT_KEY) !== null) {
        localStorage.setItem(BACKFILL_FLAG, new Date().toISOString());
      }
      return;
    }
    await importSleep(ROUTINE_DAYS);
  } catch (e) {
    console.error('Sleep import failed:', e);
  }
}
