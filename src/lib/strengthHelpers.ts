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
import { getUserPreferences } from './userPreferences';
import { getExerciseHistory } from './exerciseHistory';

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
    notes: null,
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

// ---------------------------------------------------------------------
// Repeat last session (Build 2.2)
// ---------------------------------------------------------------------

export interface LastSessionSummary {
  sessionId: string;
  date: string;        // ISO YYYY-MM-DD — feeds shortDateLabel for the panel.
  exerciseCount: number;
}

// In-progress draft = session row of the given type with feel_rating still
// null (the type-select screen creates the row up front, so abandoning
// the active screen mid-flow leaves an orphan behind). Most-recent first
// — pragmatically a user only has one draft per type, but if multiple
// exist we surface the latest so the badge maps to the freshest attempt.
export interface DraftSessionSummary {
  sessionId: string;
  created_at: string; // ISO datetime — drives the "started 2:14 PM" tag.
}

export async function getDraftSessionByType(
  type: 'upper' | 'lower' | 'full_body',
): Promise<DraftSessionSummary | null> {
  const sessions = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.feel_rating === null)
    .toArray();
  if (sessions.length === 0) return null;
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const draft = sessions[0];
  return { sessionId: draft.id, created_at: draft.created_at };
}

// Hard-delete a draft session and everything underneath it. Order:
// sets → session_exercises → session, so a partial failure can't leave
// dangling children that getDraftSessionByType would resurface. Used by
// the "Discard session" action on the active session screen.
export async function discardSession(sessionId: string): Promise<void> {
  const links = await db.session_exercises
    .where('session_id').equals(sessionId)
    .toArray();
  const linkIds = links.map((l) => l.id);
  if (linkIds.length > 0) {
    const setIds = (
      await db.sets.where('session_exercise_id').anyOf(linkIds).toArray()
    ).map((s) => s.id);
    for (const id of setIds) await syncedDelete(db.sets, id);
    for (const id of linkIds) await syncedDelete(db.session_exercises, id);
  }
  await syncedDelete(db.sessions, sessionId);
}

// Most recent COMPLETED session of the given type. Sort key is created_at
// (ISO datetime) so two sessions logged on the same day still resolve in
// the right order — same idiom composeExerciseHistory uses. Returns null
// when no completed session of this type exists.
export async function getLastSessionSummaryByType(
  type: 'upper' | 'lower' | 'full_body',
): Promise<LastSessionSummary | null> {
  const sessions = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.feel_rating !== null)
    .toArray();
  if (sessions.length === 0) return null;
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const last = sessions[0];

  const exerciseCount = await db.session_exercises
    .where('session_id').equals(last.id)
    .count();

  return {
    sessionId: last.id,
    date: last.date,
    exerciseCount,
  };
}

// Repeat the most recent completed session of the given type:
//   1. New Session row (feel_rating null = in-progress, today's date).
//   2. For each exercise from the previous session (in order_index order):
//        - Skip if the exercise no longer exists in the library.
//        - Otherwise: new session_exercise link with the same order_index.
//        - Pre-populate ONE set row from the previous session's last set
//          (highest set_number) for that exercise. Carries: weight, reps,
//          set_type, duration_seconds. Skip the set if the previous
//          session had no sets logged for this exercise.
//        - PR bump: if the most recent completed session set a PR for
//          the exercise (per getExerciseHistory.entries[0].isPR) AND
//          the carried set is rep-mode, weight += 5. Duration sets
//          carry over unchanged.
// Returns the new session id. Throws if no previous session exists —
// caller should gate the entry point with getLastSessionSummaryByType
// so this branch is unreachable through the UI.
export async function repeatLastSession(
  type: 'upper' | 'lower' | 'full_body',
): Promise<string> {
  // Fetch the most recent completed session + its exercise links + sets
  // up front. The PR check per exercise uses getExerciseHistory below
  // (one query per exercise — bounded N at typical 6–10).
  const previous = await getMostRecentCompletedSession(type);
  if (!previous) {
    throw new Error('repeatLastSession: no completed session of this type');
  }

  const now = new Date().toISOString();
  const newSession: Session = {
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
  await syncedAdd(db.sessions, newSession);

  for (const link of previous.exercises) {
    const exists = await db.exercises.get(link.exercise_id);
    if (!exists) continue;

    const newLink: SessionExercise = {
      id: crypto.randomUUID(),
      session_id: newSession.id,
      exercise_id: link.exercise_id,
      order_index: link.order_index,
      notes: null,
    };
    await syncedAdd(db.session_exercises, newLink);

    const previousSets = previous.setsByLink.get(link.id) ?? [];
    if (previousSets.length === 0) continue;

    const lastSet = previousSets.reduce((best, s) =>
      s.set_number > best.set_number ? s : best,
    previousSets[0]);

    // PR check: did the most recent completed session for this exercise
    // hit the threshold? entries[0] is most-recent-first per
    // composeExerciseHistory's slice/reverse contract.
    const history = await getExerciseHistory(link.exercise_id, 1);
    const wasPR = history.entries[0]?.isPR ?? false;

    const carryWeight =
      wasPR && lastSet.set_type === 'reps' ? lastSet.weight + 5 : lastSet.weight;

    const newSet: SetEntry = {
      id: crypto.randomUUID(),
      session_exercise_id: newLink.id,
      set_number: 1,
      weight: carryWeight,
      reps: lastSet.set_type === 'reps' ? lastSet.reps : 0,
      duration_seconds: lastSet.duration_seconds,
      set_type: lastSet.set_type,
      completed: true,
      created_at: new Date().toISOString(),
    };
    await syncedAdd(db.sets, newSet);

    await syncedUpdate(db.exercises, link.exercise_id, {
      last_used_at: new Date().toISOString(),
    });
  }

  return newSession.id;
}

// Internal: bundles the previous session + its exercise links + a sets
// map keyed by session_exercise_id. Pulled out so repeatLastSession
// reads as a flat sequence rather than nesting the fetches inline.
interface PreviousSessionBundle {
  session: Session;
  exercises: SessionExercise[];
  setsByLink: Map<string, SetEntry[]>;
}

async function getMostRecentCompletedSession(
  type: 'upper' | 'lower' | 'full_body',
): Promise<PreviousSessionBundle | null> {
  const sessions = await db.sessions
    .where('type').equals(type)
    .filter((s) => s.feel_rating !== null)
    .toArray();
  if (sessions.length === 0) return null;
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const session = sessions[0];

  const exercises = await db.session_exercises
    .where('session_id').equals(session.id)
    .sortBy('order_index');

  const linkIds = exercises.map((e) => e.id);
  const sets = linkIds.length === 0
    ? []
    : await db.sets.where('session_exercise_id').anyOf(linkIds).toArray();

  const setsByLink = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = setsByLink.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsByLink.set(s.session_exercise_id, arr);
  }

  return { session, exercises, setsByLink };
}

// Pick the lifting type with the largest unmet target this week.
// Used to pre-select the type-selector. Only counts completed sessions.
// Targets come from user_preferences so a user who's edited their weekly
// goals in Settings gets a suggestion that respects them.
export async function suggestNextLiftingType(): Promise<'upper' | 'lower' | 'full_body'> {
  const types: ('upper' | 'lower' | 'full_body')[] = ['upper', 'lower', 'full_body'];
  const weekStart = startOfWeekISODate();

  const [sessions, prefs] = await Promise.all([
    db.sessions
      .where('type').anyOf(types)
      .filter((s) => s.date >= weekStart && s.feel_rating !== null)
      .toArray(),
    getUserPreferences(),
  ]);

  const counts: Record<string, number> = { upper: 0, lower: 0, full_body: 0 };
  for (const s of sessions) {
    counts[s.type] = (counts[s.type] ?? 0) + 1;
  }

  const targetByType: Record<'upper' | 'lower' | 'full_body', number> = {
    upper: prefs.lifting_target_upper,
    lower: prefs.lifting_target_lower,
    full_body: prefs.lifting_target_full_body,
  };

  const ranked = types
    .map((t) => ({ type: t, gap: targetByType[t] - counts[t] }))
    .sort((a, b) => b.gap - a.gap);

  return ranked[0].type;
}
