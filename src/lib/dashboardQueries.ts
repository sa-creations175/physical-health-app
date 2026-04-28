import { db } from '../db/database';
import {
  todayISODate,
  startOfWeekISODate,
  last7DaysISODates,
  shortDayLabel,
  addDaysISO,
} from './dateHelpers';

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

export interface CardioWeekSummary {
  thisWeekCount: number;
  weekDots: WeekDot[];
  lastSession: LastSession | null;
}

export async function getLiftingSummary(type: LiftingType): Promise<LiftingTypeSummary> {
  const weekStart = startOfWeekISODate();
  const dates7 = last7DaysISODates();

  const weekSessions = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.date >= weekStart)
    .toArray();

  const dayHasSession = new Set(weekSessions.map((s) => s.date));
  const weekDots = dates7.map((date) => ({
    date,
    hadSession: dayHasSession.has(date),
  }));

  const allOfType = await db.sessions.where('type').equals(type).sortBy('date');
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

export async function getCardioSummary(): Promise<CardioWeekSummary> {
  const weekStart = startOfWeekISODate();
  const dates7 = last7DaysISODates();

  const weekSessions = await db.sessions
    .where('type').equals('cardio')
    .filter((s) => s.date >= weekStart)
    .toArray();

  const dayHasSession = new Set(weekSessions.map((s) => s.date));
  const weekDots = dates7.map((date) => ({
    date,
    hadSession: dayHasSession.has(date),
  }));

  const allCardio = await db.sessions.where('type').equals('cardio').sortBy('date');
  const lastRaw = allCardio.length > 0 ? allCardio[allCardio.length - 1] : null;

  let lastSession: LastSession | null = null;
  if (lastRaw) {
    const cardioLog = await db.cardio_logs.where('session_id').equals(lastRaw.id).first();
    const detail = cardioLog ? `${cardioLog.type} · ${cardioLog.duration_minutes}m` : '—';
    lastSession = {
      date: lastRaw.date,
      summary: `${shortDayLabel(lastRaw.date)} — ${detail}`,
    };
  }

  return {
    thisWeekCount: weekSessions.length,
    weekDots,
    lastSession,
  };
}

export async function computeStreak(): Promise<number> {
  // Days with at least one strength OR cardio session, counted backward from today.
  // If today has no qualifying session, count from yesterday so the streak doesn't
  // collapse mid-day before the user has logged.
  const sessions = await db.sessions
    .where('type').anyOf('upper', 'lower', 'full_body', 'cardio')
    .toArray();

  if (sessions.length === 0) return 0;

  const days = new Set(sessions.map((s) => s.date));
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
