// The move goal streak (Home and Fitness): consecutive days on which active calories
// (HealthKit) were at or above the daily calories goal.
import { addDaysISO, currentWeekISODates, todayISODate } from './dateHelpers';
import { getActiveCaloriesSince, getCaloriesByDay } from './healthkit';
import { getGoals, goalFor } from './goals';

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
