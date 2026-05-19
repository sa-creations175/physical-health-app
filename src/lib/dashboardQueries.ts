import { db } from '../db/database';
import {
  todayISODate,
  startOfWeekISODate,
  currentWeekISODates,
  shortDayLabel,
  addDaysISO,
} from './dateHelpers';
import type { Intensity } from '../db/types';

export type LiftingType = 'lower' | 'upper' | 'full_body';

export interface WeekDot {
  date: string;
  hadSession: boolean;
}

export interface LastSession {
  date: string;
  summary: string; // e.g. "Tue — squats, RDLs, leg press"
}

export interface LiftingTypeSummary {
  type: LiftingType;
  thisWeekCount: number;
  weekDots: WeekDot[];
  lastSession: LastSession | null;
}

export interface CardioSessionRow {
  id: string;
  date: string; // local YYYY-MM-DD
  started_at: string;
  type_name: string;
  duration_minutes: number;
  intensity: Intensity;
  qualifying: boolean; // duration_minutes >= threshold
  distance_miles: number | null;
}

export interface CardioWeekSummary {
  qualifyingCount: number;
  shortCount: number;
  // Sum of duration_minutes across QUALIFYING sessions only (≥ threshold).
  // Short sessions are excluded so this stat lines up with the headline
  // "X / Y sessions" — both reflect the same definition of "counts."
  qualifyingMinutes: number;
  threshold: number;
  sessions: CardioSessionRow[]; // chronological asc within the week
}

export async function getLiftingSummary(type: LiftingType): Promise<LiftingTypeSummary> {
  const weekStart = startOfWeekISODate();
  const dates7 = currentWeekISODates();

  // Only completed sessions count toward weekly progress (feel_rating set on save).
  const weekSessions = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.date >= weekStart && s.feel_rating !== null)
    .toArray();

  const dayHasSession = new Set(weekSessions.map((s) => s.date));
  const weekDots = dates7.map((date) => ({
    date,
    hadSession: dayHasSession.has(date),
  }));

  const allOfType = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.feel_rating !== null)
    .sortBy('date');
  const lastRaw = allOfType.length > 0 ? allOfType[allOfType.length - 1] : null;

  let lastSession: LastSession | null = null;
  if (lastRaw) {
    const exerciseNames = await getExerciseNamesForSession(lastRaw.id);
    const namesPart = exerciseNames.length > 0 ? exerciseNames.join(', ') : '—';
    lastSession = {
      date: lastRaw.date,
      summary: `${shortDayLabel(lastRaw.date)} — ${namesPart}`,
    };
  }

  return {
    type,
    thisWeekCount: weekSessions.length,
    weekDots,
    lastSession,
  };
}

// Build 2.1: cardio is queried directly off cardio_logs (no parent
// Session row). The week boundary is the user's local Sunday — the
// log's `started_at` ISO datetime is collapsed to a local YYYY-MM-DD
// for the comparison so a Saturday-night session that the timezone
// translation would push into Sunday UTC still lands in the right week.
//
// Threshold is passed by the caller (live query in CardioSection) so
// the UI re-renders the moment the user edits it in Settings — no
// extra fetch round-trip inside this function.
export async function getCardioSummary(
  threshold: number,
): Promise<CardioWeekSummary> {
  const weekStart = startOfWeekISODate();

  const [allLogs, allTypes] = await Promise.all([
    db.cardio_logs.toArray(),
    db.cardio_types.toArray(),
  ]);
  const typeNameById = new Map(allTypes.map((t) => [t.id, t.name]));

  const weekRows: CardioSessionRow[] = [];
  let qualifyingMinutes = 0;
  let qualifyingCount = 0;
  let shortCount = 0;

  for (const log of allLogs) {
    const localDate = new Date(log.started_at).toLocaleDateString('en-CA');
    if (localDate < weekStart) continue;
    // Skip orphans missing a type id (defensive — shouldn't happen via
    // the logger, but the v4 upgrade hook backfills "" for any pre-2.1
    // dev rows and we'd rather not render them as broken rows).
    if (!log.cardio_type_id) continue;
    const typeName = typeNameById.get(log.cardio_type_id);
    if (!typeName) continue;

    const qualifying = log.duration_minutes >= threshold;
    if (qualifying) {
      qualifyingCount++;
      qualifyingMinutes += log.duration_minutes;
    } else {
      shortCount++;
    }

    weekRows.push({
      id: log.id,
      date: localDate,
      started_at: log.started_at,
      type_name: typeName,
      duration_minutes: log.duration_minutes,
      intensity: log.intensity,
      qualifying,
      distance_miles: log.distance_miles ?? null,
    });
  }

  weekRows.sort((a, b) => a.started_at.localeCompare(b.started_at));

  return {
    qualifyingCount,
    shortCount,
    qualifyingMinutes,
    threshold,
    sessions: weekRows,
  };
}

export async function computeStreak(): Promise<number> {
  // Days with at least one strength OR cardio session, counted backward
  // from today. Strength days come from completed Session rows
  // (feel_rating !== null); cardio days come from cardio_logs directly,
  // since Build 2.1 stopped routing cardio through Session rows. Any
  // cardio_log keeps the streak alive — even short ones — because
  // showing up at all is the signal we're rewarding.
  //
  // If today has no qualifying session, we count from yesterday so the
  // streak doesn't collapse mid-day before the user has logged.
  const [strengthSessions, cardioLogs] = await Promise.all([
    db.sessions
      .where('type').anyOf('upper', 'lower', 'full_body')
      .filter((s) => s.feel_rating !== null)
      .toArray(),
    db.cardio_logs.toArray(),
  ]);

  const days = new Set<string>();
  for (const s of strengthSessions) days.add(s.date);
  for (const c of cardioLogs) {
    days.add(new Date(c.started_at).toLocaleDateString('en-CA'));
  }

  if (days.size === 0) return 0;

  let cursor = todayISODate();
  if (!days.has(cursor)) {
    cursor = addDaysISO(cursor, -1);
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}

async function getExerciseNamesForSession(sessionId: string): Promise<string[]> {
  const links = await db.session_exercises
    .where('session_id').equals(sessionId)
    .sortBy('order_index');
  if (links.length === 0) return [];

  const ids = links.map((l) => l.exercise_id);
  const exercises = await db.exercises.where('id').anyOf(ids).toArray();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return links
    .map((l) => byId.get(l.exercise_id)?.name)
    .filter((n): n is string => Boolean(n))
    .map((n) => n.toLowerCase());
}
