import { db } from '../db/database';
import {
  syncedAdd,
  syncedUpdate,
  syncedDelete,
} from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { todayISODate, addDaysISO } from './dateHelpers';
import type { DeliveryDay } from '../db/types';

// Return the seven delivery_days rows of the week starting at
// `startOfWeek` (Sunday, YYYY-MM-DD), keyed by date string. Dates with
// no row are absent from the map — the caller renders those as the
// unmarked grey state. Querying with .anyOf the exact seven dates
// keeps this O(1) lookups instead of a table scan.
export async function getDeliveryWeek(
  startOfWeek: string,
): Promise<Map<string, DeliveryDay>> {
  const dates = currentWeekISODatesFrom(startOfWeek);
  const rows = await db.delivery_days
    .where('date').anyOf(dates)
    .toArray();
  return new Map(rows.map((r) => [r.date, r]));
}

function currentWeekISODatesFrom(startOfWeek: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) out.push(addDaysISO(startOfWeek, i));
  return out;
}

// Three-state cycle for a tap on a weekly-grid square. Order: unmarked
// → clean → ordered → unmarked. Every transition writes through the
// synced* wrappers so Phase 6 sync drops in cleanly.
export async function toggleDeliveryDay(date: string): Promise<void> {
  const existing = await db.delivery_days
    .where('date').equals(date)
    .first();

  if (!existing) {
    const now = new Date().toISOString();
    const row: DeliveryDay = {
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      date,
      status: 'clean',
      created_at: now,
      updated_at: now,
    };
    await syncedAdd(db.delivery_days, row);
    return;
  }

  if (existing.status === 'clean') {
    await syncedUpdate(db.delivery_days, existing.id, {
      status: 'ordered',
      updated_at: new Date().toISOString(),
    });
    return;
  }

  // status === 'ordered' → wipe back to unmarked (delete the row).
  await syncedDelete(db.delivery_days, existing.id);
}

export interface DeliveryStreakSummary {
  currentStreak: number;
  longestStreak: number;
}

// Current streak = number of consecutive 'clean' days ending today (or
// today-1 if today is unmarked — see below). 'ordered' breaks the
// streak; a date with no row also breaks the streak, EXCEPT for today
// itself: an unmarked today is a "haven't logged yet" state, not a
// failure, so the streak starts counting from yesterday in that case.
// Same forgiveness rule the workout streak uses.
//
// Longest streak scans every row, sorts by date, and finds the longest
// run of 'clean' days where each step is exactly +1 day from the prior.
// An 'ordered' row resets the run.
export async function computeDeliveryStreak(): Promise<DeliveryStreakSummary> {
  const rows = await db.delivery_days.toArray();
  const byDate = new Map(rows.map((r) => [r.date, r]));

  // -- current streak (walk backward from today) --
  let cursor = todayISODate();
  if (!byDate.has(cursor)) cursor = addDaysISO(cursor, -1);

  let currentStreak = 0;
  while (true) {
    const row = byDate.get(cursor);
    if (!row || row.status !== 'clean') break;
    currentStreak++;
    cursor = addDaysISO(cursor, -1);
  }

  // -- longest streak (sort + run-length scan) --
  const cleanDates = rows
    .filter((r) => r.status === 'clean')
    .map((r) => r.date)
    .sort();

  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of cleanDates) {
    if (prev !== null && addDaysISO(prev, 1) === date) {
      run++;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prev = date;
  }

  // A live streak can also be the longest — make sure we surface that
  // even if today's run hasn't been "closed" by an ordered row.
  if (currentStreak > longestStreak) longestStreak = currentStreak;

  return { currentStreak, longestStreak };
}
