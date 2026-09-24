// What you did, day by day, in one place. The Fitness score's rings and dots,
// the day sheet, the Details cards, Home's week strip, Quick reps and Recovery
// all read from here (through lib/bodySignals.ts), so a number is worked out
// once and every surface agrees.
import { db } from '../db/database';
import { currentWeekISODates, todayISODate } from './dateHelpers';
import { getGoals, goalFor, HEALTH_STANDARD } from './goals';
import { getUserPreferences } from './userPreferences';
import { getWeeklyActuals } from './fitnessScore';
import { isSessionComplete, isStrengthType, STRENGTH_TYPE_LABEL } from './sessionPlans';
import {
  getActiveMinutesData,
  totalOf,
  type ActiveMinutesData,
  type ActiveMinutesTotal,
  type HeartRateLine,
  type SessionHeartRate,
} from './heartRate';
import type { BodyGoal, Session, StrengthType } from '../db/types';

export type TrainingType = StrengthType | 'cardio';
export type WorkoutKind = 'session' | 'cardio';

// One thing you did: a strength session or a cardio log.
export interface Workout {
  kind: WorkoutKind;
  id: string;
  date: string; // local YYYY-MM-DD
  type: TrainingType;
  name: string; // "Lower Body", or the cardio activity ("Run")
  exercises: string[]; // strength: exercise names in order
  distance: string | null; // cardio: "3.1 mi"
  minutes: number | null;
  time: string | null; // ISO start time, when known
  complete: boolean; // strength: finished; cardio: always
  fromWatch: boolean; // created by the Apple Watch import (can change type)
  hr: SessionHeartRate | null; // average bpm and Active minutes, when there are any
}

const byStart = (a: Workout, b: Workout) =>
  a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '');

async function exerciseNames(sessionIds: string[]): Promise<Map<string, string[]>> {
  const links = await db.session_exercises.where('session_id').anyOf(sessionIds).toArray();
  const exercises = await db.exercises.where('id').anyOf([...new Set(links.map((l) => l.exercise_id))]).toArray();
  const name = new Map(exercises.map((e) => [e.id, e.name]));
  const out = new Map<string, string[]>();
  for (const l of links.slice().sort((a, b) => a.order_index - b.order_index)) {
    const n = name.get(l.exercise_id);
    if (n) out.set(l.session_id, [...(out.get(l.session_id) ?? []), n]);
  }
  return out;
}

// A session has no start time of its own: use its Watch workout's start, or
// when it was started in the app if that was on the session's day.
function sessionTime(s: Session, hr: SessionHeartRate | null): string | null {
  if (hr?.workoutStart) return hr.workoutStart;
  return new Date(s.created_at).toLocaleDateString('en-CA') === s.date ? s.created_at : null;
}

// Every strength session and cardio log from `from` to `to` (inclusive), in
// time order, with the heart rate Build 3 matched to each. Unfinished sessions
// are included (complete: false); counts use only finished ones.
export async function getWorkouts(
  from: string,
  to: string,
  active?: ActiveMinutesData,
): Promise<Workout[]> {
  const [sessions, logs, types, hrData] = await Promise.all([
    db.sessions.where('date').between(from, to, true, true).toArray(),
    db.cardio_logs.toArray(),
    db.cardio_types.toArray(),
    active ?? getActiveMinutesData(from, to),
  ]);
  const strength = sessions.filter((s) => isStrengthType(s.type));
  const names = await exerciseNames(strength.map((s) => s.id));
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const out: Workout[] = [];
  for (const s of strength) {
    const hr = hrData.bySession.get(s.id) ?? null;
    out.push({
      kind: 'session',
      id: s.id,
      date: s.date,
      type: s.type as StrengthType,
      name: STRENGTH_TYPE_LABEL[s.type as StrengthType],
      exercises: names.get(s.id) ?? [],
      distance: null,
      minutes: s.duration_minutes ?? hr?.workoutMinutes ?? null,
      time: sessionTime(s, hr),
      complete: isSessionComplete(s),
      fromWatch: s.source === 'watch',
      hr,
    });
  }
  for (const l of logs) {
    const date = new Date(l.started_at).toLocaleDateString('en-CA');
    if (date < from || date > to) continue;
    out.push({
      kind: 'cardio',
      id: l.id,
      date,
      type: 'cardio',
      name: typeName.get(l.cardio_type_id) ?? 'Cardio',
      exercises: [],
      distance: l.distance_miles ? `${l.distance_miles.toFixed(1)} mi` : null,
      minutes: l.duration_minutes,
      time: l.started_at,
      complete: true,
      fromWatch: l.source === 'watch',
      hr: hrData.bySession.get(l.id) ?? null,
    });
  }
  return out.sort(byStart);
}

// The last `limit` finished workouts of a type, newest first, for the Details
// cards. Looks back far enough to find them (up to a year).
export async function getRecentWorkouts(type: TrainingType, limit = 3): Promise<Workout[]> {
  const today = todayISODate();
  let from: string;
  if (type === 'cardio') {
    const logs = await db.cardio_logs.orderBy('started_at').reverse().limit(limit).toArray();
    if (logs.length === 0) return [];
    from = new Date(logs[logs.length - 1].started_at).toLocaleDateString('en-CA');
  } else {
    const done = (await db.sessions.where('type').equals(type).toArray())
      .filter(isSessionComplete)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
    if (done.length === 0) return [];
    from = done[done.length - 1].date;
  }
  const all = await getWorkouts(from, today > from ? today : from);
  return all
    .filter((w) => w.type === type && w.complete)
    .reverse()
    .slice(0, limit);
}

// ---- The Fitness score's week -----------------------------------------------------

export type RingKey = TrainingType | 'active_minutes';

export const RING_LABEL: Record<RingKey, string> = {
  lower: 'Lower body',
  upper: 'Upper body',
  full_body: 'Full body',
  cardio: 'Cardio',
  active_minutes: 'Active minutes',
};

export interface TrainingWeek {
  dates: string[]; // Sun..Sat
  today: string;
  workouts: Workout[];
  // Each ring: this week's count against the goal (null = no goal set).
  rings: { key: RingKey; actual: number; target: number | null }[];
  // "Sessions: N of M": the four session rings plus any session types you
  // added yourself (Swim), finished this week against their goals.
  sessions: { done: number; target: number };
  // Days with something, for the dots: all training, or one ring's kind.
  days: Record<RingKey | 'all', Set<string>>;
  active: ActiveMinutesTotal & { line: HeartRateLine | null };
  activeData: ActiveMinutesData;
}

// A training day: a finished strength session or any cardio log.
const counts = (w: Workout) => w.complete;

export async function getTrainingWeek(): Promise<TrainingWeek> {
  const dates = currentWeekISODates();
  const activeData = await getActiveMinutesData(dates[0], dates[6]);
  const [workouts, actuals, weekly] = await Promise.all([
    getWorkouts(dates[0], dates[6], activeData),
    getWeeklyActuals(),
    getGoals('week'),
  ]);
  const target = (metric: RingKey) => goalFor(weekly, metric)?.target ?? null;
  const done = workouts.filter(counts);
  const daysOf = (pred: (w: Workout) => boolean) => new Set(done.filter(pred).map((w) => w.date));
  const activeDays = new Set(
    [...activeData.byDate.entries()]
      .filter(([, d]) => totalOf([d]).minutes > 0)
      .map(([date]) => date),
  );
  const custom = weekly.filter((g) => g.active && g.metric === null);
  const customDone = await Promise.all(custom.map((g) => customCount(g)));
  const sessionKeys: TrainingType[] = ['lower', 'upper', 'full_body', 'cardio'];
  return {
    dates,
    today: todayISODate(),
    workouts,
    rings: [
      ...sessionKeys.map((key) => ({ key, actual: actuals[key], target: target(key) })),
      { key: 'active_minutes' as const, actual: actuals.active_minutes, target: target('active_minutes') },
    ],
    sessions: {
      done: sessionKeys.reduce((n, k) => n + actuals[k], 0) + customDone.reduce((n, c) => n + c, 0),
      target:
        sessionKeys.reduce((n, k) => n + (target(k) ?? 0), 0) + custom.reduce((n, g) => n + g.target, 0),
    },
    days: {
      all: daysOf(() => true),
      lower: daysOf((w) => w.type === 'lower'),
      upper: daysOf((w) => w.type === 'upper'),
      full_body: daysOf((w) => w.type === 'full_body'),
      cardio: daysOf((w) => w.type === 'cardio'),
      active_minutes: activeDays,
    },
    active: { ...totalOf([...activeData.byDate.values()]), line: activeData.line },
    activeData,
  };
}

// A session type you added yourself counts this week's cardio logged under
// the same name (the rule the Fitness score uses).
async function customCount(goal: BodyGoal): Promise<number> {
  const dates = currentWeekISODates();
  const [logs, types] = await Promise.all([db.cardio_logs.toArray(), db.cardio_types.toArray()]);
  const want = goal.name.trim().toLowerCase();
  const ids = new Set(types.filter((t) => t.name.trim().toLowerCase() === want).map((t) => t.id));
  return logs.filter((l) => {
    const d = new Date(l.started_at).toLocaleDateString('en-CA');
    return ids.has(l.cardio_type_id) && d >= dates[0] && d <= dates[6];
  }).length;
}

// Finished sessions and cardio logs per day this week, for Home's week strip.
export async function getWeekSessionCounts(): Promise<Map<string, number>> {
  const dates = currentWeekISODates();
  const workouts = await getWorkouts(dates[0], dates[6]);
  const out = new Map<string, number>(dates.map((d) => [d, 0]));
  for (const w of workouts.filter(counts)) out.set(w.date, (out.get(w.date) ?? 0) + 1);
  return out;
}

// ---- Quick reps -------------------------------------------------------------------

// A day's reps: push-ups, ab rolls and calf raises together.
//   met  — at or over the daily Reps goal
//   some — some reps, under the goal (or no goal to judge against)
//   none — nothing logged
//   future — later this week
export type RepDayState = 'met' | 'some' | 'none' | 'future';

export interface RepsWeek {
  goal: number | null;
  today: number;
  days: { date: string; reps: number; state: RepDayState }[];
  met: number;
}

export async function getRepsWeek(): Promise<RepsWeek> {
  const dates = currentWeekISODates();
  const today = todayISODate();
  const [rows, daily] = await Promise.all([
    db.bundle_logs.where('date').anyOf(dates).toArray(),
    getGoals('day'),
  ]);
  const goal = goalFor(daily, 'reps')?.target ?? null;
  const reps = new Map(rows.map((r) => [r.date, r.pushups + r.ab_rolls + r.calf_raises]));
  const days = dates.map((date) => {
    const n = reps.get(date) ?? 0;
    const state: RepDayState =
      date > today ? 'future' : n <= 0 ? 'none' : goal && n >= goal ? 'met' : 'some';
    return { date, reps: n, state };
  });
  return { goal, today: reps.get(today) ?? 0, days, met: days.filter((d) => d.state === 'met').length };
}

// ---- Recovery ---------------------------------------------------------------------

// A stretch day is a Mobility day: at least the minimum minutes, logged by
// hand or filled in by a Watch yoga or stretch workout.
export interface StretchWeek {
  goal: number | null;
  count: number; // stretch days this week
  days: { date: string; state: 'met' | 'none' | 'future' }[];
  last: string | null; // the most recent stretch day, any week
}

export async function getStretchWeek(): Promise<StretchWeek> {
  const dates = currentWeekISODates();
  const today = todayISODate();
  const [rows, prefs, weekly] = await Promise.all([
    db.bundle_logs.toArray(),
    getUserPreferences(),
    getGoals('week'),
  ]);
  const min = prefs.bundle_mobility_min_minutes;
  const stretched = new Set(
    rows.filter((r) => (r.mobility_minutes ?? 0) >= min && r.date <= today).map((r) => r.date),
  );
  const days = dates.map((date) => ({
    date,
    state: date > today ? ('future' as const) : stretched.has(date) ? ('met' as const) : ('none' as const),
  }));
  return {
    goal: goalFor(weekly, 'mobility')?.target ?? null,
    count: days.filter((d) => d.state === 'met').length,
    days,
    last: [...stretched].sort().pop() ?? null,
  };
}

// ---- Moving my body standards -------------------------------------------------------

export interface StandardRow {
  key: 'active_minutes' | 'stretch_days' | 'strength_sessions';
  label: string;
  actual: number;
  standard: number;
  unit: string;
  met: boolean;
}

export async function getStandardsWeek(): Promise<StandardRow[]> {
  const actuals = await getWeeklyActuals();
  const strength = actuals.lower + actuals.upper + actuals.full_body;
  const rows: Omit<StandardRow, 'met'>[] = [
    { key: 'active_minutes', label: 'Active minutes', actual: actuals.active_minutes, standard: HEALTH_STANDARD.active_minutes, unit: 'min' },
    { key: 'stretch_days', label: 'Stretches', actual: actuals.mobility, standard: HEALTH_STANDARD.stretch_days, unit: 'days' },
    { key: 'strength_sessions', label: 'Strength sessions', actual: strength, standard: HEALTH_STANDARD.strength_sessions, unit: 'sessions' },
  ];
  return rows.map((r) => ({ ...r, met: r.actual >= r.standard }));
}
