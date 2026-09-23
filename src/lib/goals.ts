// Goals as data. Every target Home and Fitness show is a BodyGoal row the
// person owns: a name, a target, a unit and a period (a week or a day). The
// "Life Coaching standard" is only the starting set and what Reset restores.
import { db } from '../db/database';
import { syncedBulkDelete, syncedBulkPut } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { getUserPreferences } from './userPreferences';
import type {
  BodyGoal,
  DailyGoalMetric,
  GoalMetric,
  GoalPeriod,
  UserPreferences,
  WeeklyGoalMetric,
} from '../db/types';

interface StandardGoal {
  metric: GoalMetric;
  name: string;
  target: number;
  unit: string;
}

// The Life Coaching standard, in display order.
export const STANDARD_WEEKLY: (StandardGoal & { metric: WeeklyGoalMetric })[] = [
  { metric: 'bundle', name: 'Daily Bundle', target: 4, unit: 'days' },
  { metric: 'cardio', name: 'Cardio', target: 5, unit: 'sessions' },
  { metric: 'lower', name: 'Lower Body', target: 2, unit: 'sessions' },
  { metric: 'upper', name: 'Upper Body', target: 2, unit: 'sessions' },
  { metric: 'full_body', name: 'Full Body', target: 1, unit: 'sessions' },
  { metric: 'mobility', name: 'Mobility', target: 4, unit: 'days' },
];

export const STANDARD_DAILY: (StandardGoal & { metric: DailyGoalMetric })[] = [
  { metric: 'calories', name: 'Calories burned', target: 700, unit: 'calories' },
  { metric: 'exercise_minutes', name: 'Exercise minutes', target: 30, unit: 'minutes' },
  { metric: 'steps', name: 'Steps', target: 10000, unit: 'steps' },
];

export function standardFor(period: GoalPeriod): StandardGoal[] {
  return period === 'week' ? STANDARD_WEEKLY : STANDARD_DAILY;
}

// Standard goals get fixed ids, so seeding on a second device and then pulling
// the cloud copy lands on the same rows instead of duplicating them.
export function standardGoalId(metric: GoalMetric): string {
  return `goal-${metric}`;
}

function row(
  g: Pick<BodyGoal, 'name' | 'metric' | 'target' | 'unit'> & { id?: string; active?: boolean },
  period: GoalPeriod,
  order: number,
  now: string,
  createdAt?: string,
): BodyGoal {
  return {
    id: g.id ?? (g.metric ? standardGoalId(g.metric) : crypto.randomUUID()),
    user_id: LOCAL_USER_ID,
    name: g.name,
    metric: g.metric,
    target: g.target,
    unit: g.unit,
    period,
    active: g.active ?? true,
    order_index: order,
    created_at: createdAt ?? now,
    updated_at: now,
  };
}

// First run: the Life Coaching standard, carrying over any target the person
// had already set in Settings before goals existed (a target of 0 there meant
// "not tracked", so the standard number is used instead).
function carriedTarget(metric: GoalMetric, prefs: UserPreferences): number | null {
  const v: Record<GoalMetric, number | undefined> = {
    bundle: prefs.bundle_target,
    cardio: prefs.cardio_target_weekly,
    lower: prefs.lifting_target_lower,
    upper: prefs.lifting_target_upper,
    full_body: prefs.lifting_target_full_body,
    mobility: prefs.bundle_mobility_target,
    calories: prefs.daily_calories_target,
    exercise_minutes: prefs.daily_exercise_minutes_target,
    steps: prefs.daily_steps_target,
  };
  const n = v[metric];
  return typeof n === 'number' && n > 0 ? n : null;
}

export async function seedGoalsIfEmpty(): Promise<void> {
  if ((await db.body_goals.count()) > 0) return;
  const prefs = await getUserPreferences();
  const now = new Date().toISOString();
  const rows: BodyGoal[] = [];
  for (const period of ['week', 'day'] as GoalPeriod[]) {
    standardFor(period).forEach((g, i) =>
      rows.push(row({ ...g, target: carriedTarget(g.metric, prefs) ?? g.target }, period, i, now)),
    );
  }
  await syncedBulkPut(db.body_goals, rows);
}

// ---- Reading ---------------------------------------------------------------------

export async function getGoals(period: GoalPeriod): Promise<BodyGoal[]> {
  const rows = await db.body_goals.where('period').equals(period).toArray();
  return rows.sort((a, b) => a.order_index - b.order_index);
}

// The active goal for a metric, if the person has one.
export function goalFor(goals: BodyGoal[], metric: GoalMetric): BodyGoal | undefined {
  return goals.find((g) => g.metric === metric && g.active);
}

// ---- Writing -----------------------------------------------------------------------

// One goal as edited in a goals sheet. New goals have no id.
export interface GoalDraft {
  id?: string;
  name: string;
  metric: GoalMetric | null;
  target: number;
  unit: string;
  active: boolean;
  createdAt?: string;
}

export function draftsFrom(goals: BodyGoal[]): GoalDraft[] {
  return goals.map((g) => ({
    id: g.id,
    name: g.name,
    metric: g.metric,
    target: g.target,
    unit: g.unit,
    active: g.active,
    createdAt: g.created_at,
  }));
}

export function standardDrafts(period: GoalPeriod): GoalDraft[] {
  return standardFor(period).map((g) => ({
    id: standardGoalId(g.metric),
    name: g.name,
    metric: g.metric,
    target: g.target,
    unit: g.unit,
    active: true,
  }));
}

// Replace a period's goals with the edited list: add, rename, retarget, remove,
// reorder and Reset all land here. Blank names and non-positive targets are
// dropped, so an emptied row is a removal.
export async function saveGoals(period: GoalPeriod, drafts: GoalDraft[]): Promise<void> {
  const now = new Date().toISOString();
  const keep = drafts.filter((d) => d.name.trim() !== '' && d.target > 0);
  const rows = keep.map((d, i) =>
    row(
      {
        id: d.id ?? crypto.randomUUID(),
        name: d.name.trim(),
        metric: d.metric,
        target: d.target,
        unit: d.unit,
        active: d.active,
      },
      period,
      i,
      now,
      d.createdAt,
    ),
  );
  const existing = await getGoals(period);
  const gone = existing.filter((g) => !rows.some((r) => r.id === g.id)).map((g) => g.id);
  await syncedBulkDelete(db.body_goals, gone);
  await syncedBulkPut(db.body_goals, rows);
}

export async function resetToStandard(period: GoalPeriod): Promise<void> {
  await saveGoals(period, standardDrafts(period));
}
