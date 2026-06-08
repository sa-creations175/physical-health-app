// Fitness Score for Home (June 5 design). An honest weekly scorecard, not a
// flattering single grade. Everything reads LIVE from user_preferences — fills
// and the dial reason about fractions against live targets, never raw counts or
// hardcoded targets, so changing a threshold in Settings updates the score.
import { db } from './../db/database';
import { LOCAL_USER_ID } from './constants';
import { getUserPreferences } from './userPreferences';
import { getLiftingSummary, getCardioSummary } from './dashboardQueries';
import { getBundleWeek, getWeeklyTotals, isDayQualifying } from './bundleHelpers';
import {
  startOfWeekISODate,
  currentWeekISODates,
  todayISODate,
} from './dateHelpers';
import { getWeeklyHealthAverages } from './healthkit';
import { PILLAR_COLORS, fillFraction } from './pillarColors';

// Non-pillar marks (calories / steps / exercise minutes) share a neutral slate
// so the five pillar colors stay distinctive in the bar list.
const NEUTRAL_MARK = '#5a7a6e';

export type MarkKey =
  | 'bundle'
  | 'cardio'
  | 'lower'
  | 'upper'
  | 'mobility'
  | 'exercise'
  | 'calories'
  | 'steps';

export interface ScoreMark {
  key: MarkKey;
  label: string;
  color: string;
  actual: number;
  target: number;
  fraction: number; // clamped 0..1 (0 when target 0 or no data)
  participates: boolean; // counts toward the dial
  perDay: boolean; // daily-average mark vs weekly-count mark
}

export interface FitnessScore {
  dialPct: number; // 0..100, average of participating marks' clamped fractions
  marks: ScoreMark[];
  daysElapsed: number; // Sun..today inclusive, 1..7 — for early-week softening
  strip: {
    calories: number | null; // avg/day, null when HealthKit unavailable
    exerciseMinutes: number; // avg/day (app-logged)
    steps: number | null; // avg/day, null when HealthKit unavailable
  };
}

export async function getFitnessScore(): Promise<FitnessScore> {
  const prefs = await getUserPreferences();
  const weekStart = startOfWeekISODate();
  const weekDates = currentWeekISODates();
  const weekEnd = weekDates[6];
  const today = todayISODate();
  const daysElapsed = weekDates.filter((d) => d <= today).length || 1;

  // --- Weekly-count marks (Dexie; available web + iOS) ---
  const [lower, upper, cardio, bundleWeek] = await Promise.all([
    getLiftingSummary('lower'),
    getLiftingSummary('upper'),
    getCardioSummary(prefs.cardio_threshold_minutes),
    getBundleWeek(weekStart),
  ]);
  const bundleQualDays = bundleWeek.filter(isDayQualifying).length;
  const mobTotals = getWeeklyTotals(bundleWeek, prefs.bundle_mobility_min_minutes);

  // --- Exercise minutes/day (app-logged: cardio + sessions + watch + mobility) ---
  const [cardioLogs, sessions] = await Promise.all([
    db.cardio_logs.where('user_id').equals(LOCAL_USER_ID).toArray(),
    db.sessions.toArray(),
  ]);
  let exerciseMinutes = 0;
  for (const l of cardioLogs) {
    if (new Date(l.started_at).toLocaleDateString('en-CA') >= weekStart) {
      exerciseMinutes += l.duration_minutes;
    }
  }
  for (const s of sessions) {
    if (s.date >= weekStart && s.date <= weekEnd) {
      exerciseMinutes += s.duration_minutes ?? 0;
    }
  }
  for (const b of bundleWeek) {
    exerciseMinutes += (b.watch_duration_minutes ?? 0) + (b.mobility_minutes ?? 0);
  }
  const exerciseAvg = Math.round(exerciseMinutes / daysElapsed);

  // --- Calories + steps/day (HealthKit; iOS only, null elsewhere) ---
  const hk = await getWeeklyHealthAverages(daysElapsed);

  const marks: ScoreMark[] = [
    mark('bundle', 'Bundle', PILLAR_COLORS.bundle.fill, bundleQualDays, prefs.bundle_target, false),
    mark('cardio', 'Cardio', PILLAR_COLORS.cardio.fill, cardio.qualifyingCount, prefs.cardio_target_weekly, false),
    mark('lower', 'Lower', PILLAR_COLORS.lower.fill, lower?.thisWeekCount ?? 0, prefs.lifting_target_lower, false),
    mark('upper', 'Upper', PILLAR_COLORS.upper.fill, upper?.thisWeekCount ?? 0, prefs.lifting_target_upper, false),
    mark('mobility', 'Mobility', PILLAR_COLORS.mobility.fill, mobTotals.mobilityQualifyingDays, prefs.bundle_mobility_target, false),
    mark('exercise', 'Exercise min', NEUTRAL_MARK, exerciseAvg, prefs.daily_exercise_minutes_target, true),
    // Calories + steps participate only when HealthKit data exists.
    markWithData('calories', 'Calories', NEUTRAL_MARK, hk?.caloriesAvg ?? 0, prefs.daily_calories_target, hk !== null),
    markWithData('steps', 'Steps', NEUTRAL_MARK, hk?.stepsAvg ?? 0, prefs.daily_steps_target, hk !== null),
  ];

  const participating = marks.filter((m) => m.participates);
  const dialPct = participating.length
    ? Math.round(
        (participating.reduce((sum, m) => sum + m.fraction, 0) /
          participating.length) *
          100,
      )
    : 0;

  return {
    dialPct,
    marks,
    daysElapsed,
    strip: {
      calories: hk?.caloriesAvg ?? null,
      exerciseMinutes: exerciseAvg,
      steps: hk?.stepsAvg ?? null,
    },
  };
}

function mark(
  key: MarkKey,
  label: string,
  color: string,
  actual: number,
  target: number,
  perDay: boolean,
): ScoreMark {
  return {
    key,
    label,
    color,
    actual,
    target,
    fraction: fillFraction(actual, target),
    participates: target > 0,
    perDay,
  };
}

// As `mark`, but only participates when a data source exists (HealthKit).
function markWithData(
  key: MarkKey,
  label: string,
  color: string,
  actual: number,
  target: number,
  hasData: boolean,
): ScoreMark {
  return {
    key,
    label,
    color,
    actual,
    target,
    fraction: hasData ? fillFraction(actual, target) : 0,
    participates: hasData && target > 0,
    perDay: true,
  };
}
