// HealthKit wrapper (iOS-only, via @capacitor + capacitor-health).
//
// The Apple Watch dashboard card calls getHealthSnapshot() to show live
// HealthKit data. Everything here is defensive: on the web build (Vite
// dev, Vercel PWA) there is no native Health bridge, so every entry point
// returns null/false rather than throwing. Live data only appears inside
// the Capacitor iOS app once the user has granted Health access.
//
// Plugin reality (capacitor-health@8.1.2): queryAggregated supports only
// 'steps' | 'active-calories' | 'mindfulness', and queryWorkouts returns
// completed workouts. There is no resting-heart-rate query, so the card's
// third tile is a "workouts this week" count instead of resting HR.
import { Capacitor } from '@capacitor/core';
import { Health, type HealthPermission } from 'capacitor-health';
import { startOfWeekISODate, currentWeekISODates } from './dateHelpers';

// Active calories burned per day for the current week (Sun..Sat, 7 values),
// for the Fitness page's calorie-breakdown bars. Same HealthKit source as the
// Fitness Score's weekly average, just bucketed by day instead of summed.
// Returns null off iOS / without HealthKit; days with no sample read 0.
export async function getCaloriesByDay(): Promise<number[] | null> {
  if (!(await ensureHealthPermissions())) return null;
  const weekDates = currentWeekISODates();
  const startISO = new Date(weekDates[0] + 'T00:00:00').toISOString();
  try {
    const { aggregatedData } = await Health.queryAggregated({
      startDate: startISO,
      endDate: new Date().toISOString(),
      dataType: 'active-calories',
      bucket: 'day',
    });
    const byDate = new Map<string, number>();
    for (const sample of aggregatedData) {
      const key = new Date(sample.startDate).toLocaleDateString('en-CA');
      byDate.set(key, (byDate.get(key) ?? 0) + (sample.value || 0));
    }
    return weekDates.map((d) => Math.round(byDate.get(d) ?? 0));
  } catch (e) {
    console.error('HK error at getCaloriesByDay:', e);
    return null;
  }
}

// Per-day averages for steps + active calories over the current week so far,
// for the Home Fitness Score. Returns null off iOS / without HealthKit so the
// score gracefully drops those marks rather than scoring them 0. `daysElapsed`
// is the week's elapsed-day count (Sun..today) — the divisor for the average.
export async function getWeeklyHealthAverages(
  daysElapsed: number,
): Promise<{ caloriesAvg: number; stepsAvg: number } | null> {
  if (!(await ensureHealthPermissions())) return null;
  const weekStartISO = new Date(
    startOfWeekISODate() + 'T00:00:00',
  ).toISOString();
  const [steps, calories] = await Promise.all([
    sumAggregated('steps', weekStartISO),
    sumAggregated('active-calories', weekStartISO),
  ]);
  const divisor = Math.max(1, daysElapsed);
  return {
    stepsAvg: Math.round(steps / divisor),
    caloriesAvg: Math.round(calories / divisor),
  };
}

// Rolling N-day (default 90) average of daily active calories, the activity
// half of the personalized TDEE (BMR + this). Returns the average over the days
// that actually have samples plus how many days of data backed it, so the macro
// calculator can note "using only N days of history". null off iOS / without
// HealthKit, where there's no Watch data to read.
export async function getActiveCaloriesDailyAverage(
  daysBack = 90,
): Promise<{ avgPerDay: number; daysOfData: number } | null> {
  if (!(await ensureHealthPermissions())) return null;
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  try {
    const { aggregatedData } = await Health.queryAggregated({
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
      dataType: 'active-calories',
      bucket: 'day',
    });
    const byDate = new Map<string, number>();
    for (const sample of aggregatedData) {
      const key = new Date(sample.startDate).toLocaleDateString('en-CA');
      byDate.set(key, (byDate.get(key) ?? 0) + (sample.value || 0));
    }
    const days = [...byDate.values()].filter((v) => v > 0);
    if (days.length === 0) return { avgPerDay: 0, daysOfData: 0 };
    const total = days.reduce((sum, v) => sum + v, 0);
    return {
      avgPerDay: Math.round(total / days.length),
      daysOfData: days.length,
    };
  } catch (e) {
    console.error('HK error at getActiveCaloriesDailyAverage:', e);
    return null;
  }
}

// What the dashboard card renders. Steps/calories are "today so far";
// workoutsThisWeek counts completed workouts since Sunday; recentWorkouts
// is the trailing 7-day list (newest first).
export interface HealthWorkout {
  startDate: string;
  endDate: string;
  workoutType: string;
  durationMinutes: number;
  calories: number;
  sourceName: string;
}

export interface HealthSnapshot {
  steps: number;
  activeCalories: number;
  workoutsThisWeek: number;
  recentWorkouts: HealthWorkout[];
}

// Read scopes we actually use. NSHealthShareUsageDescription covers these;
// we don't request write scopes because nothing here writes to Health yet.
const READ_PERMISSIONS: HealthPermission[] = [
  'READ_STEPS',
  'READ_ACTIVE_CALORIES',
  'READ_WORKOUTS',
];

// True only inside the native iOS app with the Health store reachable.
// Anything else (web, Android-without-Health) is treated as unavailable.
export async function isHealthKitAvailable(): Promise<boolean> {
  if (Capacitor.getPlatform() !== 'ios') return false;
  try {
    const { available } = await Health.isHealthAvailable();
    return available;
  } catch (e) {
    console.error('HK error at isHealthKitAvailable:', e);
    return false;
  }
}

// Idempotent on iOS: the plugin no-ops if the user has already decided.
// Returns false if Health is unavailable or the request itself throws.
export async function ensureHealthPermissions(): Promise<boolean> {
  if (!(await isHealthKitAvailable())) return false;
  try {
    await Health.requestHealthPermissions({ permissions: READ_PERMISSIONS });
    return true;
  } catch (e) {
    console.error('HK error at ensureHealthPermissions:', e);
    return false;
  }
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Sum a single aggregated metric for [start, now]. iOS denial or an empty
// store surfaces as 0 rather than an exception, so one missing metric never
// takes down the others.
async function sumAggregated(
  dataType: 'steps' | 'active-calories',
  startISO: string,
): Promise<number> {
  try {
    const { aggregatedData } = await Health.queryAggregated({
      startDate: startISO,
      endDate: new Date().toISOString(),
      dataType,
      bucket: 'day',
    });
    return Math.round(
      aggregatedData.reduce((total, sample) => total + (sample.value || 0), 0),
    );
  } catch (e) {
    console.error(`HK error at sumAggregated(${dataType}):`, e);
    return 0;
  }
}

// Completed workouts from the last `daysBack` days (default 7), newest first.
// Exported for the Apple Watch auto-importer (watchImport.ts). Assumes
// permissions were already ensured by the caller (getHealthSnapshot /
// importWatchWorkouts both do).
export async function getRecentWorkouts(daysBack = 7): Promise<HealthWorkout[]> {
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  try {
    const { workouts } = await Health.queryWorkouts({
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
      includeHeartRate: false,
      includeRoute: false,
      includeSteps: false,
    });
    return workouts
      .map((w) => ({
        startDate: w.startDate,
        endDate: w.endDate,
        workoutType: w.workoutType,
        durationMinutes: Math.round((w.duration || 0) / 60),
        calories: Math.round(w.calories || 0),
        sourceName: w.sourceName,
      }))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  } catch (e) {
    console.error('HK error at getRecentWorkouts:', e);
    return [];
  }
}

// The single call the dashboard makes. Returns null when there is no
// HealthKit to read (web/non-iOS, unavailable, or permission flow refused),
// which the card renders as "not connected". On success it returns a
// best-effort snapshot — individual metrics degrade to 0/[] independently.
export async function getHealthSnapshot(): Promise<HealthSnapshot | null> {
  if (!(await ensureHealthPermissions())) return null;

  const todayStart = startOfTodayISO();
  const weekStartISO = startOfWeekISODate(); // YYYY-MM-DD, local Sunday

  const [steps, activeCalories, recentWorkouts] = await Promise.all([
    sumAggregated('steps', todayStart),
    sumAggregated('active-calories', todayStart),
    getRecentWorkouts(),
  ]);

  const workoutsThisWeek = recentWorkouts.filter(
    (w) => w.startDate.slice(0, 10) >= weekStartISO,
  ).length;

  return { steps, activeCalories, workoutsThisWeek, recentWorkouts };
}
