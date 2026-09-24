// The shared per-day signals Home and Fitness read, in one place: the move
// goal streak, this week's move goal days, sleep nights and Active minutes. Each screen reads
// these rather than keeping its own copy.
//
// Move goal streak: consecutive days on which active calories (HealthKit) were
// at or above the daily calories goal.
import { addDaysISO, currentWeekISODates, todayISODate } from './dateHelpers';
import { getActiveCaloriesSince, getCaloriesByDay } from './healthkit';
import { getGoals, goalFor } from './goals';
import { db } from '../db/database';
import type { SleepNight } from '../db/types';
import {
  getActiveMinutesData,
  getHeartRateLine,
  thisWeekSpan,
  toMinutes,
  type HeartRateLine,
  type SessionHeartRate,
} from './heartRate';

// Pure: count back from the most recent finished day (yesterday) while each
// day is at or above the goal. Today adds one once it's at or above the goal,
// and never breaks the streak while it's still in progress.
export function countMoveStreak(
  caloriesByDate: Map<string, number>,
  goal: number,
  today: string,
  earliest: string,
): number {
  let streak = 0;
  let cursor = addDaysISO(today, -1);
  while (cursor >= earliest && (caloriesByDate.get(cursor) ?? 0) >= goal) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  if ((caloriesByDate.get(today) ?? 0) >= goal) streak++;
  return streak;
}

const WINDOW_DAYS = 120;
const MAX_DAYS = 730;

// null = no streak to show: the calories goal is removed or unticked, or
// there's no HealthKit to read.
export async function getMoveStreak(): Promise<number | null> {
  const goal = goalFor(await getGoals('day'), 'calories')?.target;
  if (!goal || goal <= 0) return null;
  const today = todayISODate();
  // Read a window; if every day in it met the goal, widen and count again.
  for (let days = WINDOW_DAYS; ; days = Math.min(days * 2, MAX_DAYS)) {
    const earliest = addDaysISO(today, -days);
    const calories = await getActiveCaloriesSince(earliest);
    if (!calories) return null;
    const streak = countMoveStreak(calories, goal, today, earliest);
    const finishedDays = streak - ((calories.get(today) ?? 0) >= goal ? 1 : 0);
    if (finishedDays < days || days >= MAX_DAYS) return streak;
  }
}

// ---- Move goal days this week ---------------------------------------------------

// How a day of this week stands against the calories goal:
//   met    — at or above the goal (today included, once it's met)
//   missed — under the goal, and the day has ended
//   open   — today, not met yet: still in progress, never a miss
//   future — later this week
export type MoveDayState = 'met' | 'missed' | 'open' | 'future';

export interface MoveGoalWeek {
  days: { date: string; state: MoveDayState }[];
  met: number; // days met so far this week
}

// Pure: one state per day of the week (Sun..Sat), from that day's active
// calories. Days with no calories read as 0.
export function moveGoalDayStates(
  dates: string[],
  calories: (number | undefined)[],
  goal: number,
  today: string,
): MoveGoalWeek {
  const days = dates.map((date, i) => {
    const reached = (calories[i] ?? 0) >= goal;
    const state: MoveDayState =
      date > today ? 'future' : reached ? 'met' : date === today ? 'open' : 'missed';
    return { date, state };
  });
  return { days, met: days.filter((d) => d.state === 'met').length };
}

// The one shared count Home and Fitness read. null = nothing to show: no
// calories goal (removed or unticked) or no HealthKit to read.
export async function getMoveGoalWeek(): Promise<MoveGoalWeek | null> {
  const goal = goalFor(await getGoals('day'), 'calories')?.target;
  if (!goal || goal <= 0) return null;
  const calories = await getCaloriesByDay();
  if (!calories) return null;
  return moveGoalDayStates(currentWeekISODates(), calories, goal, todayISODate());
}

// ---- Sleep ------------------------------------------------------------------------

// Nights come from the sleep import (lib/sleepImport.ts), stored one per
// morning, so these read the local table and are live: Home's Sleep card, a
// Sleep tab and a sleep goal can all read them without asking HealthKit.
// A night with no asleep time (a nap-only day) doesn't count as a night.

async function nightOn(date: string): Promise<SleepNight | null> {
  const n = await db.sleep_nights.get(`night-${date}`);
  return n && n.asleep_minutes > 0 ? n : null;
}

// Last night: the night that ended this morning. null until it's been read.
export async function getLastNight(): Promise<SleepNight | null> {
  return nightOn(todayISODate());
}

// Each night this week, Sunday to Saturday by the morning it ended (Sunday's
// is Saturday night into Sunday). null for nights with no sleep recorded or
// still to come.
export async function getNightsThisWeek(): Promise<(SleepNight | null)[]> {
  return Promise.all(currentWeekISODates().map(nightOn));
}

// This week's average time asleep, in minutes, over the nights that have
// sleep recorded. null when there are none.
export async function getWeekSleepAverage(): Promise<number | null> {
  const nights = (await getNightsThisWeek()).filter((n): n is SleepNight => n !== null);
  if (nights.length === 0) return null;
  return Math.round(nights.reduce((sum, n) => sum + n.asleep_minutes, 0) / nights.length);
}

// ---- Active minutes -----------------------------------------------------------------

// Minutes with heart rate at or above the line (64% of max), from Watch
// workout readings, plus sessions marked "heart rate was up" that have no
// readings ("you said so"). The Fitness score's Active min ring, the Details
// card and each session's summary read these. See lib/heartRate.ts.

export interface ActiveMinutesTotal {
  minutes: number; // measured + said so
  measuredMinutes: number;
  saidSoMinutes: number;
}

function total(days: { measuredSeconds: number; saidSoMinutes: number }[]): ActiveMinutesTotal {
  const measuredSeconds = days.reduce((s, d) => s + d.measuredSeconds, 0);
  const saidSoMinutes = days.reduce((s, d) => s + d.saidSoMinutes, 0);
  const measuredMinutes = toMinutes(measuredSeconds);
  return { minutes: measuredMinutes + saidSoMinutes, measuredMinutes, saidSoMinutes };
}

// This week, Sunday to Saturday. `line` is null when there's no age or
// measured max to draw the line from; measured minutes are then 0.
export async function getActiveMinutesThisWeek(): Promise<ActiveMinutesTotal & { line: HeartRateLine | null }> {
  const [from, to] = thisWeekSpan();
  const data = await getActiveMinutesData(from, to);
  return { ...total([...data.byDate.values()]), line: data.line };
}

// Each day this week, Sunday to Saturday.
export async function getActiveMinutesByDay(): Promise<{ date: string; total: ActiveMinutesTotal }[]> {
  const dates = currentWeekISODates();
  const data = await getActiveMinutesData(dates[0], dates[6]);
  return dates.map((date) => ({
    date,
    total: total([data.byDate.get(date) ?? { measuredSeconds: 0, saidSoMinutes: 0 }]),
  }));
}

// One session's (or cardio log's) heart rate: average bpm and Active minutes,
// measured or said so. null when there's neither readings nor the mark.
export async function getSessionHeartRate(
  kind: 'session' | 'cardio',
  id: string,
): Promise<SessionHeartRate | null> {
  const row = kind === 'session' ? await db.sessions.get(id) : await db.cardio_logs.get(id);
  if (!row) return null;
  const date = kind === 'session' ? (row as { date: string }).date : new Date((row as { started_at: string }).started_at).toLocaleDateString('en-CA');
  const data = await getActiveMinutesData(date, date);
  return data.bySession.get(id) ?? null;
}

export { getHeartRateLine };
