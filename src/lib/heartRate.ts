// Active minutes: minutes of a workout with heart rate at or above the line,
// the line being 64% of the person's max heart rate (ACSM moderate intensity).
// Pure maths first, then the reads that match workouts to sessions.
//
// How readings become minutes: during a Watch workout the heart rate is
// recorded about every 5 seconds. Each reading is taken to hold until the next
// one, so it's credited with the seconds up to the next reading. Gaps longer
// than a minute (signal lost, extended workout mode duty-cycling the sensor)
// are credited with at most 60 seconds, so a long gap never counts as time
// above the line. The last reading gets 5 seconds, or less if the workout
// ends sooner. Seconds are summed per whole bpm, and only the seconds at or
// above the line are added up. They're turned into minutes (rounded to the
// nearest minute) only when shown, so a week is summed in seconds first.
import { db } from '../db/database';
import { currentWeekISODates } from './dateHelpers';
import { classifyWatchWorkout } from './watchImport';
import { isSessionComplete, isStrengthType } from './sessionPlans';
import type { CardioLog, Session, WorkoutHeartRate } from '../db/types';

export const LINE_FRACTION = 0.64;
const READING_SECONDS = 5; // the Watch's cadence during a workout
const MAX_CREDIT_SECONDS = 60; // cap on what one reading can stand for
const CARDIO_MATCH_WINDOW_MS = 30 * 60 * 1000; // same window as the Watch import

// ---- Pure --------------------------------------------------------------------------

export interface HeartRateSummary {
  sampleCount: number;
  avgBpm: number | null; // time-weighted
  secondsByBpm: Record<number, number>;
}

export function summarizeReadings(
  readings: { timestamp: string; bpm: number }[],
  workoutEnd: string,
): HeartRateSummary {
  const pts = readings
    .map((r) => ({ t: Date.parse(r.timestamp), bpm: r.bpm }))
    .filter((r) => Number.isFinite(r.t) && r.bpm > 0)
    .sort((a, b) => a.t - b.t);
  const end = Date.parse(workoutEnd);
  const secondsByBpm: Record<number, number> = {};
  let weighted = 0;
  let total = 0;
  pts.forEach((p, i) => {
    const next = i + 1 < pts.length ? pts[i + 1].t : Math.min(p.t + READING_SECONDS * 1000, end);
    const secs = Math.max(0, Math.min((next - p.t) / 1000, MAX_CREDIT_SECONDS));
    if (secs <= 0) return;
    const bpm = Math.round(p.bpm);
    secondsByBpm[bpm] = (secondsByBpm[bpm] ?? 0) + secs;
    weighted += bpm * secs;
    total += secs;
  });
  return {
    sampleCount: pts.length,
    avgBpm: total > 0 ? Math.round(weighted / total) : null,
    secondsByBpm,
  };
}

export type MaxMethod = 'measured' | 'tanaka' | 'gulati';

// Max heart rate: a measured max if stored, else Gulati (206 − 0.88 × age)
// for a profile that says female, else Tanaka (208 − 0.7 × age).
export function estimateMaxHr(input: {
  measured?: number | null;
  age?: number | null;
  sex?: 'male' | 'female' | null;
}): { max: number; method: MaxMethod } | null {
  if (input.measured && input.measured > 0) return { max: Math.round(input.measured), method: 'measured' };
  if (!input.age || input.age <= 0) return null;
  if (input.sex === 'female') return { max: Math.round(206 - 0.88 * input.age), method: 'gulati' };
  return { max: Math.round(208 - 0.7 * input.age), method: 'tanaka' };
}

// The line in whole bpm; a reading counts when it's at or above it.
export function lineFor(max: number): number {
  return Math.round(max * LINE_FRACTION);
}

export function secondsAtOrAbove(secondsByBpm: Record<number, number>, line: number): number {
  let s = 0;
  for (const [bpm, secs] of Object.entries(secondsByBpm)) if (Number(bpm) >= line) s += secs;
  return s;
}

export const toMinutes = (seconds: number) => Math.round(seconds / 60);

// ---- The line, from the profile -------------------------------------------------

export interface HeartRateLine {
  max: number;
  method: MaxMethod;
  line: number;
}

// Age comes from the body stats the nutrition setup records, moved on by the
// whole years since it was recorded. null when there's no age and no measured
// max: then there's no line and no Active minutes.
export async function getHeartRateLine(): Promise<HeartRateLine | null> {
  const [prefs, stats] = await Promise.all([
    db.user_preferences.toCollection().first(),
    db.body_stats.orderBy('recorded_at').last(),
  ]);
  let age: number | null = null;
  if (stats?.age) {
    const years = (Date.now() - Date.parse(stats.recorded_at)) / (365.25 * 86_400_000);
    age = stats.age + Math.max(0, Math.floor(years));
  }
  const est = estimateMaxHr({ measured: prefs?.measured_max_hr ?? null, age, sex: stats?.biological_sex ?? null });
  return est ? { ...est, line: lineFor(est.max) } : null;
}

// ---- Matching workouts to sessions -------------------------------------------------

export interface WorkoutActive {
  workout: WorkoutHeartRate;
  activeSeconds: number; // at or above the line (0 without a line)
}

const isStrengthWorkout = (w: WorkoutHeartRate) =>
  classifyWatchWorkout(w.workout_type, w.duration_minutes).category === 'strength';
const isCardioWorkout = (w: WorkoutHeartRate) =>
  classifyWatchWorkout(w.workout_type, w.duration_minutes).category === 'cardio';

// Two apps can record the same workout (the Watch and, say, Strava), and both
// would carry the same heart-rate readings. A workout that overlaps an already
// counted one by more than half its length is treated as that same workout
// and skipped; the one with more readings is kept.
export function dedupeWorkouts(rows: WorkoutHeartRate[]): WorkoutHeartRate[] {
  const kept: WorkoutHeartRate[] = [];
  for (const w of rows.slice().sort((a, b) => b.sample_count - a.sample_count)) {
    const s = Date.parse(w.workout_start);
    const e = Date.parse(w.workout_end);
    const dup = kept.some((k) => {
      const overlap = Math.min(e, Date.parse(k.workout_end)) - Math.max(s, Date.parse(k.workout_start));
      return overlap > 0.5 * Math.max(1, e - s);
    });
    if (!dup) kept.push(w);
  }
  return kept.sort((a, b) => a.workout_start.localeCompare(b.workout_start));
}

// Strength sessions match the day's Watch strength workouts, the way the Watch
// import merges durations: same day, strength type. With several on one day,
// sessions (in the order they were started) pair with workouts (in time order).
function matchStrength(sessions: Session[], workouts: WorkoutHeartRate[]): Map<string, WorkoutHeartRate> {
  const out = new Map<string, WorkoutHeartRate>();
  const byDay = new Map<string, Session[]>();
  for (const s of sessions) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
  for (const [date, list] of byDay) {
    const ws = workouts.filter((w) => w.date === date && isStrengthWorkout(w));
    list
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((s, i) => {
        if (ws[i]) out.set(s.id, ws[i]);
      });
  }
  return out;
}

// Cardio logs have a start time: they match the cardio workout that started
// closest to it, within 30 minutes.
function matchCardio(logs: CardioLog[], workouts: WorkoutHeartRate[]): Map<string, WorkoutHeartRate> {
  const out = new Map<string, WorkoutHeartRate>();
  const taken = new Set<string>();
  for (const l of logs.slice().sort((a, b) => a.started_at.localeCompare(b.started_at))) {
    const t = Date.parse(l.started_at);
    let best: WorkoutHeartRate | null = null;
    for (const w of workouts) {
      if (taken.has(w.id) || !isCardioWorkout(w)) continue;
      const d = Math.abs(Date.parse(w.workout_start) - t);
      if (d <= CARDIO_MATCH_WINDOW_MS && (!best || d < Math.abs(Date.parse(best.workout_start) - t))) best = w;
    }
    if (best) {
      out.set(l.id, best);
      taken.add(best.id);
    }
  }
  return out;
}

// One session's (or cardio log's) heart rate.
export interface SessionHeartRate {
  avgBpm: number | null;
  activeMinutes: number;
  // measured: from Watch readings. saidSo: the person marked "heart rate was
  // up" and there were no readings, so the whole session's minutes count.
  basis: 'measured' | 'said-so';
  workoutId: string | null;
}

// Everything Active minutes needs for a span of days, matched once.
export interface ActiveMinutesData {
  line: HeartRateLine | null;
  byDate: Map<string, { measuredSeconds: number; saidSoMinutes: number }>;
  bySession: Map<string, SessionHeartRate>; // key: session id or cardio log id
}

export async function getActiveMinutesData(from: string, to: string): Promise<ActiveMinutesData> {
  const [line, workoutRows, sessions, cardioLogs] = await Promise.all([
    getHeartRateLine(),
    db.workout_heart_rates.where('date').between(from, to, true, true).toArray(),
    db.sessions.where('date').between(from, to, true, true).toArray(),
    db.cardio_logs.toArray(),
  ]);
  const workouts = dedupeWorkouts(workoutRows);
  const logs = cardioLogs.filter((l) => {
    const d = new Date(l.started_at).toLocaleDateString('en-CA');
    return d >= from && d <= to;
  });
  const strength = sessions.filter((s) => isStrengthType(s.type) && isSessionComplete(s));
  const strengthMatch = matchStrength(strength, workouts);
  const cardioMatch = matchCardio(logs, workouts);

  const activeSecs = (w: WorkoutHeartRate) =>
    line ? secondsAtOrAbove(JSON.parse(w.seconds_by_bpm) as Record<number, number>, line.line) : 0;

  const byDate = new Map<string, { measuredSeconds: number; saidSoMinutes: number }>();
  const bump = (date: string, measured: number, saidSo: number) => {
    const cur = byDate.get(date) ?? { measuredSeconds: 0, saidSoMinutes: 0 };
    byDate.set(date, { measuredSeconds: cur.measuredSeconds + measured, saidSoMinutes: cur.saidSoMinutes + saidSo });
  };
  // Every Watch workout with readings counts, matched to a session or not
  // (a walk, a short strength set): heart rate up is measured across the day.
  for (const w of workouts) if (w.sample_count > 0) bump(w.date, activeSecs(w), 0);

  const bySession = new Map<string, SessionHeartRate>();
  const record = (
    id: string,
    date: string,
    matched: WorkoutHeartRate | undefined,
    saidSo: boolean,
    minutes: number | null,
  ) => {
    if (matched && matched.sample_count > 0) {
      bySession.set(id, {
        avgBpm: matched.avg_bpm,
        activeMinutes: toMinutes(activeSecs(matched)),
        basis: 'measured',
        workoutId: matched.id,
      });
    } else if (saidSo) {
      const m = minutes ?? matched?.duration_minutes ?? 0;
      bySession.set(id, { avgBpm: null, activeMinutes: m, basis: 'said-so', workoutId: matched?.id ?? null });
      bump(date, 0, m);
    }
  };
  for (const s of strength) record(s.id, s.date, strengthMatch.get(s.id), !!s.hr_was_up, s.duration_minutes);
  for (const l of logs) {
    record(l.id, new Date(l.started_at).toLocaleDateString('en-CA'), cardioMatch.get(l.id), !!l.hr_was_up, l.duration_minutes);
  }
  return { line, byDate, bySession };
}

// Convenience: this week's span, Sunday to Saturday.
export function thisWeekSpan(): [string, string] {
  const dates = currentWeekISODates();
  return [dates[0], dates[6]];
}

