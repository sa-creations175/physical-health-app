import { db } from '../db/database';
import {
  syncedAdd,
  syncedUpdate,
  syncedDelete,
} from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type {
  Session,
  SessionType,
  Exercise,
  SessionExercise,
  SetEntry,
  SetType,
  FeelRating,
  MuscleGroup,
} from '../db/types';
import { todayISODate, startOfWeekISODate } from './dateHelpers';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from './defaults';

export async function createSession(type: SessionType): Promise<string> {
  const now = new Date().toISOString();
  const session: Session = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    type,
    date: todayISODate(),
    duration_minutes: null,
    notes: '',
    feel_rating: null,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.sessions, session);
  return session.id;
}

export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
): Promise<string> {
  const existing = await db.session_exercises
    .where('session_id').equals(sessionId)
    .toArray();
  const link: SessionExercise = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: exerciseId,
    order_index: existing.length,
  };
  await syncedAdd(db.session_exercises, link);
  await syncedUpdate(db.exercises, exerciseId, {
    last_used_at: new Date().toISOString(),
  });
  return link.id;
}

export async function addSet(
  sessionExerciseId: string,
  weight: number,
  reps: number,
  options: { set_type?: SetType; duration_seconds?: number | null } = {},
): Promise<string> {
  const existing = await db.sets
    .where('session_exercise_id').equals(sessionExerciseId)
    .count();
  const set: SetEntry = {
    id: crypto.randomUUID(),
    session_exercise_id: sessionExerciseId,
    set_number: existing + 1,
    weight,
    reps,
    duration_seconds: options.duration_seconds ?? null,
    set_type: options.set_type ?? 'reps',
    completed: true,
    created_at: new Date().toISOString(),
  };
  await syncedAdd(db.sets, set);
  return set.id;
}

export async function updateSet(
  setId: string,
  changes: {
    weight?: number;
    reps?: number;
    duration_seconds?: number | null;
    set_type?: SetType;
    completed?: boolean;
  },
): Promise<void> {
  await syncedUpdate(db.sets, setId, changes);
}

export async function deleteSet(setId: string): Promise<void> {
  await syncedDelete(db.sets, setId);
}

export async function completeSession(
  sessionId: string,
  feel_rating: FeelRating,
  notes: string,
): Promise<void> {
  await syncedUpdate(db.sessions, sessionId, {
    feel_rating,
    notes,
    updated_at: new Date().toISOString(),
  });
}

export async function createNewExercise(
  name: string,
  muscle_group: MuscleGroup,
  is_compound: boolean,
): Promise<string> {
  const exercise: Exercise = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    name: name.trim(),
    muscle_group,
    is_compound,
    created_at: new Date().toISOString(),
    last_used_at: null,
  };
  await syncedAdd(db.exercises, exercise);
  return exercise.id;
}

// Most-recent completed session that included this exercise, with its sets.
// Used in the active logger as a progressive-overload reference. Excludes
// the current session so the user sees history, not their in-progress work.
export interface PreviousSessionForExercise {
  date: string;
  sets: SetEntry[];
}

export async function getPreviousSessionForExercise(
  exerciseId: string,
  excludeSessionId: string,
): Promise<PreviousSessionForExercise | null> {
  const links = await db.session_exercises
    .where('exercise_id').equals(exerciseId)
    .toArray();
  if (links.length === 0) return null;

  const sessionIds = [...new Set(links.map((l) => l.session_id))];
  const candidates = await db.sessions
    .where('id').anyOf(sessionIds)
    .filter((s) => s.feel_rating !== null && s.id !== excludeSessionId)
    .toArray();
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.date.localeCompare(a.date));
  const last = candidates[0];

  const linkForLast = links.find((l) => l.session_id === last.id);
  if (!linkForLast) return null;

  const sets = await db.sets
    .where('session_exercise_id').equals(linkForLast.id)
    .sortBy('created_at');

  return { date: last.date, sets };
}

// Pick the lifting type with the largest unmet target this week.
// Used to pre-select the type-selector. Only counts completed sessions.
export async function suggestNextLiftingType(): Promise<'upper' | 'lower' | 'full_body'> {
  const types: ('upper' | 'lower' | 'full_body')[] = ['upper', 'lower', 'full_body'];
  const weekStart = startOfWeekISODate();

  const sessions = await db.sessions
    .where('type').anyOf(types)
    .filter((s) => s.date >= weekStart && s.feel_rating !== null)
    .toArray();

  const counts: Record<string, number> = { upper: 0, lower: 0, full_body: 0 };
  for (const s of sessions) {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }

  const ranked = types
    .map((t) => ({ type: t, gap: DEFAULT_WEEKLY_LIFTING_TARGETS[t] - counts[t] }))
    .sort((a, b) => b.gap - a.gap);

  return ranked[0].type;
}
