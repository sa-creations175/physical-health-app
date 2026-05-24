import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import {
  todayISODate,
  startOfWeekISODate,
  addDaysISO,
} from './dateHelpers';
import type { BundleLog, UserPreferences } from '../db/types';

// Which BundleLog numeric fields a tap can write. Kept as a union (not just
// `string`) so callers can't typo a field name into upsertBundleLog.
// `mobility_minutes` is included (Build 2.6) and written the same way.
export type BundleField =
  | 'pushups'
  | 'ab_rolls'
  | 'calf_raises'
  | 'mobility_minutes';

export type DayIntensity = 'none' | 'low' | 'medium' | 'full';

export interface BundleStreakSummary {
  currentStreak: number;
  longestStreak: number;
}

export interface BundleTotals {
  pushups: number;
  ab_rolls: number;
  calf_raises: number;
  // Days this week where mobility_minutes met the qualifying threshold —
  // surfaced separately as "Mobility: X / N days".
  mobilityQualifyingDays: number;
}

// A saved follow-along mobility link, stored as JSON in
// user_preferences.bundle_mobility_youtube_links.
export interface MobilityLink {
  id: string;
  label: string;
  url: string;
}

// Defensive parse of the links JSON — bad/old data yields an empty list
// rather than throwing on render.
export function parseMobilityLinks(raw: string | undefined | null): MobilityLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is MobilityLink =>
        l &&
        typeof l.id === 'string' &&
        typeof l.label === 'string' &&
        typeof l.url === 'string',
    );
  } catch {
    return [];
  }
}

// One row per user per day; null when today hasn't been logged yet.
export async function getTodayBundleLog(): Promise<BundleLog | null> {
  const row = await db.bundle_logs.where('date').equals(todayISODate()).first();
  return row ?? null;
}

// The seven rows (Sun→Sat) of the week starting at `startOfWeek`. Dates
// with no row are simply absent from the array — the caller renders those
// as the unlogged grey square. `.anyOf` the exact seven dates keeps this
// to indexed lookups instead of a table scan.
export async function getBundleWeek(startOfWeek: string): Promise<BundleLog[]> {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(startOfWeek, i));
  return db.bundle_logs.where('date').anyOf(dates).toArray();
}

// Create-or-update the row for `date`, setting exactly one rep-field and
// leaving the other two untouched. Value floors at 0 (a − tap past zero is
// a no-op floor, not a negative count). Every write goes through the
// synced* wrappers so Phase 6 sync drops in cleanly.
export async function upsertBundleLog(
  date: string,
  field: BundleField,
  value: number,
): Promise<void> {
  const clamped = Math.max(0, Math.round(value));
  const now = new Date().toISOString();
  const existing = await db.bundle_logs.where('date').equals(date).first();

  if (existing) {
    await syncedUpdate(db.bundle_logs, existing.id, {
      [field]: clamped,
      updated_at: now,
    } as Partial<BundleLog>);
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
    [field]: clamped,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.bundle_logs, row);
}

// Any reps of anything — or any mobility minutes — make the day qualifying.
// The components are tracked independently, not as a bundle requirement. A
// row that exists but reads 0/0/0/null is NOT qualifying.
export function isDayQualifying(log: BundleLog): boolean {
  return (
    log.pushups + log.ab_rolls + log.calf_raises + (log.mobility_minutes ?? 0) > 0
  );
}

// Visual intensity of a logged day, used to color the weekly grid:
//   none   — nothing logged
//   low    — 1–49% of the combined daily target
//   medium — 50%+ of the combined target, but not all three hit
//   full   — every one of the three individual daily targets met
// "full" is reserved for hitting all three targets individually, because
// independent tracking means a day could overshoot the combined total
// while skipping an exercise entirely — that's a strong day, but not a
// complete one, so it caps at medium.
export function getDayIntensity(
  log: BundleLog,
  prefs: UserPreferences,
): DayIntensity {
  const minMobility = prefs.bundle_mobility_min_minutes;
  // Mobility credit is capped at its target: a qualifying session (>= the
  // minute threshold) earns full credit for that component, and raw minutes
  // (e.g. a 60-min session) can't blow up the percentage.
  const mobilityCredit = Math.min(log.mobility_minutes ?? 0, minMobility);
  const done =
    log.pushups + log.ab_rolls + log.calf_raises + mobilityCredit;
  if (done <= 0) return 'none';

  // "full" stays gated on the three rep targets (mobility feeds the
  // percentage bands, not the all-targets-hit definition).
  const allThreeHit =
    log.pushups >= prefs.bundle_pushup_target &&
    log.ab_rolls >= prefs.bundle_abroll_target &&
    log.calf_raises >= prefs.bundle_calfraise_target;
  if (allThreeHit) return 'full';

  const combinedTarget =
    prefs.bundle_pushup_target +
    prefs.bundle_abroll_target +
    prefs.bundle_calfraise_target +
    minMobility;
  // Guard divide-by-zero if every target was somehow set to 0 — any work at
  // all then reads as the lowest non-none band rather than NaN.
  if (combinedTarget <= 0) return 'low';

  const pct = (done / combinedTarget) * 100;
  return pct >= 50 ? 'medium' : 'low';
}

// Sum each exercise across the week's rows, plus a count of mobility-
// qualifying days (mobility_minutes >= the threshold). Missing days
// contribute 0. The mobility day-count is surfaced separately on the card
// ("Mobility: X / N days") rather than as a progress bar.
export function getWeeklyTotals(
  weekLogs: BundleLog[],
  mobilityMinMinutes: number,
): BundleTotals {
  return weekLogs.reduce<BundleTotals>(
    (acc, log) => ({
      pushups: acc.pushups + log.pushups,
      ab_rolls: acc.ab_rolls + log.ab_rolls,
      calf_raises: acc.calf_raises + log.calf_raises,
      mobilityQualifyingDays:
        acc.mobilityQualifyingDays +
        ((log.mobility_minutes ?? 0) >= mobilityMinMinutes ? 1 : 0),
    }),
    { pushups: 0, ab_rolls: 0, calf_raises: 0, mobilityQualifyingDays: 0 },
  );
}

// Local-week start (Sunday, YYYY-MM-DD) for a stored ISO date string.
// Builds the Date at local midnight so DST-edge dates land in the right
// week rather than slipping a day under UTC parsing.
function weekStartOf(isoDate: string): string {
  return startOfWeekISODate(new Date(isoDate + 'T00:00:00'));
}

// Consecutive weeks (Sun→Sat) with ≥ 4 qualifying days.
//
// The week containing today is treated as still-open: it never breaks the
// current streak and never counts toward it until it closes (rolls into the
// past), so both the current walk and the longest scan operate only on
// fully-closed weeks. Counting starts at last week and walks backward.
//
// A week with no rows has 0 qualifying days, which is < 4 — so gaps break a
// run naturally, and the backward walk terminates without needing an
// explicit floor.
export function computeBundleStreak(
  allLogs: BundleLog[],
): BundleStreakSummary {
  if (allLogs.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // weekStart → count of qualifying days in that week.
  const qualByWeek = new Map<string, number>();
  let earliestWeek: string | null = null;
  for (const log of allLogs) {
    if (!isDayQualifying(log)) continue;
    const wk = weekStartOf(log.date);
    qualByWeek.set(wk, (qualByWeek.get(wk) ?? 0) + 1);
    if (earliestWeek === null || wk < earliestWeek) earliestWeek = wk;
  }
  if (earliestWeek === null) return { currentStreak: 0, longestStreak: 0 };

  const currentWeek = startOfWeekISODate();
  const lastClosedWeek = addDaysISO(currentWeek, -7);

  // -- current streak: walk backward from last closed week --
  let currentStreak = 0;
  let cursor = lastClosedWeek;
  while (cursor >= earliestWeek) {
    if ((qualByWeek.get(cursor) ?? 0) >= 4) {
      currentStreak++;
      cursor = addDaysISO(cursor, -7);
    } else {
      break;
    }
  }

  // -- longest streak: walk every closed week forward, run-length scan --
  let longestStreak = 0;
  let run = 0;
  for (
    let wk = earliestWeek;
    wk <= lastClosedWeek;
    wk = addDaysISO(wk, 7)
  ) {
    if ((qualByWeek.get(wk) ?? 0) >= 4) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  return { currentStreak, longestStreak };
}
