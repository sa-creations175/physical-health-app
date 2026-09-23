// The move goal streak on Home: consecutive days on which active calories
// (HealthKit) were at or above the daily calories goal.
import { addDaysISO, todayISODate } from './dateHelpers';
import { getActiveCaloriesSince } from './healthkit';
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
