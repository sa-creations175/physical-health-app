// A goal's name wherever it appears, from one place. A goal you've renamed
// shows your name everywhere (the Goals sheet, the rings on Home and
// Fitness, the Details cards, the day sheet); one you haven't shows the
// built-in wording, which comes in three lengths: the sheet's ("Lower
// body"), a ring's ("Lower"), and a card heading's ("Lower Body").
import type { BodyGoal, GoalMetric } from '../db/types';
import { STANDARD_DAILY, STANDARD_WEEKLY } from './goals';

export interface GoalNames {
  name: string; // the Goals sheet and running text
  short: string; // under a ring
  heading: string; // a card heading (Title Case)
}

const BUILT_IN: Record<GoalMetric, GoalNames> = {
  calories: { name: 'Active calories', short: 'Calories', heading: 'Active Calories' },
  steps: { name: 'Steps', short: 'Steps', heading: 'Steps' },
  lower: { name: 'Lower body', short: 'Lower', heading: 'Lower Body' },
  upper: { name: 'Upper body', short: 'Upper', heading: 'Upper Body' },
  full_body: { name: 'Full body', short: 'Full', heading: 'Full Body' },
  cardio: { name: 'Cardio', short: 'Cardio', heading: 'Cardio' },
  active_minutes: { name: 'Active minutes', short: 'Active min', heading: 'Active Minutes' },
  reps: { name: 'Reps', short: 'Reps', heading: 'Reps' },
  mobility: { name: 'Stretches', short: 'Stretches', heading: 'Stretches' },
  bundle: { name: 'Daily Bundle', short: 'Bundle', heading: 'Daily Bundle' },
  exercise_minutes: { name: 'Exercise minutes', short: 'Exercise min', heading: 'Exercise Minutes' },
};

const STANDARD_NAME = new Map<string, string>(
  [...STANDARD_WEEKLY, ...STANDARD_DAILY].map((g) => [g.metric, g.name.trim().toLowerCase()]),
);

// A built-in goal still carries its built-in name (in any of its forms, any
// case) until you rename it.
function isBuiltInName(metric: GoalMetric, name: string): boolean {
  const n = name.trim().toLowerCase();
  const b = BUILT_IN[metric];
  return n === '' || n === b.name.toLowerCase() || n === b.heading.toLowerCase() || n === STANDARD_NAME.get(metric);
}

export function namesFor(goal: Pick<BodyGoal, 'name' | 'metric'>): GoalNames {
  const m = goal.metric;
  if (m && m in BUILT_IN && isBuiltInName(m as GoalMetric, goal.name)) return BUILT_IN[m as GoalMetric];
  return { name: goal.name, short: goal.name, heading: goal.name };
}

// The built-in names for a metric, for a goal that doesn't exist (yet).
export function builtInNames(metric: GoalMetric): GoalNames {
  return BUILT_IN[metric];
}
