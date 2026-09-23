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
  SetEntry,
  MuscleGroup,
} from '../db/types';
import { todayISODate, startOfWeekISODate } from './dateHelpers';
import { getUserPreferences } from './userPreferences';
import { copyPlanIntoSession, isSessionComplete, isStrengthType } from './sessionPlans';

// Start a session INSTANCE. For a strength type it opens as a copy of the
// type's standing exercise list (see sessionPlans.ts).
export async function createSession(
  type: SessionType,
  date: string = todayISODate(),
): Promise<string> {
  const now = new Date().toISOString();
  const session: Session = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    type,
    date,
    duration_minutes: null,
    notes: '',
    feel_rating: null,
    source: 'manual',
    completed_at: null,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.sessions, session);
  if (isStrengthType(type)) await copyPlanIntoSession(session.id, type);
  return session.id;
}

export async function updateSessionExerciseNotes(
  sessionExerciseId: string,
  notes: string | null,
): Promise<void> {
  await syncedUpdate(db.session_exercises, sessionExerciseId, { notes });
}

export async function updateSessionDate(
  sessionId: string,
  date: string,
): Promise<void> {
  await syncedUpdate(db.sessions, sessionId, {
    date,
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
    .filter((s) => !isSessionComplete(s))
    .toArray();
  if (sessions.length === 0) return null;
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));
  const draft = sessions[0];
  return { sessionId: draft.id, created_at: draft.created_at };
}

// Full detail for every unfinished (feel_rating null) strength session,
// newest first — including each exercise and its sets so the stale-session
// surface on Log Session can SHOW the contents before the user decides to
// resume or discard. Heavier than getDraftSessionByType (which is just the
// badge), so it's only called where the contents are actually rendered.
export interface DraftExerciseDetail {
  name: string;
  sets: SetEntry[];
}
export interface DraftSessionDetail {
  sessionId: string;
  type: 'upper' | 'lower' | 'full_body';
  date: string;
  created_at: string;
  exercises: DraftExerciseDetail[];
}

export async function getDraftSessions(): Promise<DraftSessionDetail[]> {
  const drafts = (await db.sessions.toArray()).filter(
    (s) =>
      !isSessionComplete(s) &&
      // Exclude Apple Watch placeholders (incomplete by design, surfaced in
      // History) — only user-abandoned manual drafts are resumable here.
      s.source !== 'watch' &&
      (s.type === 'upper' || s.type === 'lower' || s.type === 'full_body'),
  );
  if (drafts.length === 0) return [];

  const exName = new Map((await db.exercises.toArray()).map((e) => [e.id, e.name]));
  const out: DraftSessionDetail[] = [];
  for (const s of drafts) {
    const links = (
      await db.session_exercises.where('session_id').equals(s.id).toArray()
    ).sort((a, b) => a.order_index - b.order_index);
    const exercises: DraftExerciseDetail[] = [];
    for (const l of links) {
      const sets = await db.sets
        .where('session_exercise_id')
        .equals(l.id)
        .sortBy('created_at');
      exercises.push({ name: exName.get(l.exercise_id) ?? '—', sets });
    }
    out.push({
      sessionId: s.id,
      // Narrowed by the filter above; cast past SessionType's 'cardio' member.
      type: s.type as 'upper' | 'lower' | 'full_body',
      date: s.date,
      created_at: s.created_at,
      exercises,
    });
  }
  out.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
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
      .filter((s) => s.date >= weekStart && isSessionComplete(s))
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
