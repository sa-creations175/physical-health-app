// Fitness Score for Home and the Fitness tab, computed from the person's goals.
// Nothing here knows a target number: every target is a BodyGoal row. The dial
// is the average of each weekly goal's fill (each capped at 100%); the daily
// averages are compared with the daily goals.
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
import { getWeeklyHealthAverages, getExerciseMinutesThisWeek } from './healthkit';
import { fillFraction } from './progress';
import { getGoals } from './goals';
import { getActiveMinutesData, thisWeekSpan, totalOf } from './heartRate';
import type { BodyGoal, DailyGoalMetric, WeeklyGoalMetric } from '../db/types';

export interface WeeklyProgress {
  goal: BodyGoal;
  actual: number;
  fraction: number; // 0..1, capped
}

export interface DailyProgress {
  goal: BodyGoal;
  average: number | null; // null when there's nothing to measure (no HealthKit)
  // At or past the goal (true), under it (false), or not judged (unticked goal
  // or no data).
  met: boolean | null;
}

export interface FitnessScore {
  dialPct: number; // 0..100
  weekly: WeeklyProgress[];
  daily: DailyProgress[];
  daysElapsed: number; // Sun..today inclusive, 1..7
  averages: Record<DailyGoalMetric, number | null>;
}

// This week's count for every weekly metric the app measures.
export async function getWeeklyActuals(): Promise<Record<WeeklyGoalMetric, number>> {
  const prefs = await getUserPreferences();
  const weekStart = startOfWeekISODate();
  const [lower, upper, fullBody, cardio, bundleWeek, active] = await Promise.all([
    getLiftingSummary('lower'),
    getLiftingSummary('upper'),
    getLiftingSummary('full_body'),
    getCardioSummary(prefs.cardio_threshold_minutes),
    getBundleWeek(weekStart),
    getActiveMinutesData(...thisWeekSpan()),
  ]);
  return {
    bundle: bundleWeek.filter(isDayQualifying).length,
    cardio: cardio.qualifyingCount,
    lower: lower?.thisWeekCount ?? 0,
    upper: upper?.thisWeekCount ?? 0,
    full_body: fullBody?.thisWeekCount ?? 0,
    mobility: getWeeklyTotals(bundleWeek, prefs.bundle_mobility_min_minutes).mobilityQualifyingDays,
    // Minutes at or above the heart-rate line, measured plus "you said so".
    active_minutes: totalOf([...active.byDate.values()]).minutes,
  };
}

// A goal the person added themselves ("Swim, 2 a week") counts this week's
// cardio logs whose activity has the same name.
async function customWeeklyCount(name: string): Promise<number> {
  const weekStart = startOfWeekISODate();
  const [logs, types] = await Promise.all([
    db.cardio_logs.where('user_id').equals(LOCAL_USER_ID).toArray(),
    db.cardio_types.toArray(),
  ]);
  const want = name.trim().toLowerCase();
  const ids = new Set(types.filter((t) => t.name.trim().toLowerCase() === want).map((t) => t.id));
  return logs.filter(
    (l) => ids.has(l.cardio_type_id) && new Date(l.started_at).toLocaleDateString('en-CA') >= weekStart,
  ).length;
}

// Daily averages over the week so far.
export async function getDailyAverages(daysElapsed: number): Promise<Record<DailyGoalMetric, number | null>> {
  const weekStart = startOfWeekISODate();
  const weekEnd = currentWeekISODates()[6];
  // Exercise minutes: Apple's Exercise ring when HealthKit is there; otherwise
  // the app-logged sum (cardio + sessions + Watch strength + mobility).
  const [cardioLogs, sessions, hkExerciseWeek, bundleWeek, hk] = await Promise.all([
    db.cardio_logs.where('user_id').equals(LOCAL_USER_ID).toArray(),
    db.sessions.toArray(),
    getExerciseMinutesThisWeek(),
    getBundleWeek(weekStart),
    getWeeklyHealthAverages(daysElapsed),
  ]);
  let appLogged = 0;
  for (const l of cardioLogs) {
    if (new Date(l.started_at).toLocaleDateString('en-CA') >= weekStart) appLogged += l.duration_minutes;
  }
  for (const s of sessions) {
    if (s.date >= weekStart && s.date <= weekEnd) appLogged += s.duration_minutes ?? 0;
  }
  for (const b of bundleWeek) appLogged += (b.watch_duration_minutes ?? 0) + (b.mobility_minutes ?? 0);
  // Reps: push-ups, ab rolls and calf raises together, averaged over the week
  // so far.
  const reps = bundleWeek.reduce((n, b) => n + b.pushups + b.ab_rolls + b.calf_raises, 0);
  return {
    reps: Math.round(reps / daysElapsed),
    calories: hk?.caloriesAvg ?? null,
    steps: hk?.stepsAvg ?? null,
    exercise_minutes: Math.round((hkExerciseWeek ?? appLogged) / daysElapsed),
  };
}

export async function getFitnessScore(): Promise<FitnessScore> {
  const today = todayISODate();
  const daysElapsed = currentWeekISODates().filter((d) => d <= today).length || 1;
  const [weeklyGoals, dailyGoals, actuals, averages] = await Promise.all([
    getGoals('week'),
    getGoals('day'),
    getWeeklyActuals(),
    getDailyAverages(daysElapsed),
  ]);

  const weekly: WeeklyProgress[] = [];
  for (const goal of weeklyGoals.filter((g) => g.active && g.target > 0)) {
    const actual =
      goal.metric && goal.metric in actuals
        ? actuals[goal.metric as WeeklyGoalMetric]
        : await customWeeklyCount(goal.name);
    weekly.push({ goal, actual, fraction: fillFraction(actual, goal.target) });
  }

  const daily: DailyProgress[] = dailyGoals.map((goal) => {
    const average =
      goal.metric && goal.metric in averages ? averages[goal.metric as DailyGoalMetric] : null;
    return {
      goal,
      average,
      met: goal.active && goal.target > 0 && average !== null ? average >= goal.target : null,
    };
  });

  const dialPct = weekly.length
    ? Math.round((weekly.reduce((sum, w) => sum + w.fraction, 0) / weekly.length) * 100)
    : 0;

  return { dialPct, weekly, daily, daysElapsed, averages };
}
