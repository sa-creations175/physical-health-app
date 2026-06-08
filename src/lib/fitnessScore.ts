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

// The dial + bars cover ONLY the five pillar marks. Calories / steps / exercise
// minutes are context shown in the daily-average strip — they do NOT affect the
// score (a cardio-heavy day shouldn't quietly inflate the grade).
export type MarkKey = 'bundle' | 'cardio' | 'lower' | 'upper' | 'mobility';

export interface ScoreMark {
  key: MarkKey;
  label: string;
  color: string;
  actual: number;
  target: number;
  fraction: number; // clamped 0..1 (0 when target 0)
  participates: boolean; // counts toward the dial
}

export interface FitnessScore {
  dialPct: number; // 0..100, average of participating pillar marks' fractions
  marks: ScoreMark[]; // the five pillars only
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

  // Only the five pillars feed the dial + bars.
  const marks: ScoreMark[] = [
    mark('bundle', 'Bundle', PILLAR_COLORS.bundle.fill, bundleQualDays, prefs.bundle_target),
    mark('cardio', 'Cardio', PILLAR_COLORS.cardio.fill, cardio.qualifyingCount, prefs.cardio_target_weekly),
    mark('lower', 'Lower', PILLAR_COLORS.lower.fill, lower?.thisWeekCount ?? 0, prefs.lifting_target_lower),
    mark('upper', 'Upper', PILLAR_COLORS.upper.fill, upper?.thisWeekCount ?? 0, prefs.lifting_target_upper),
    mark('mobility', 'Mobility', PILLAR_COLORS.mobility.fill, mobTotals.mobilityQualifyingDays, prefs.bundle_mobility_target),
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
): ScoreMark {
  return {
    key,
    label,
    color,
    actual,
    target,
    fraction: fillFraction(actual, target),
    participates: target > 0,
  };
}
