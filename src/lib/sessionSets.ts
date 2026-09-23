// Sets inside a session instance, and the history they're logged against.
//
// A set is only data once the user typed into it or checked it: that's when a
// `sets` row is written. Last time's numbers are never rows in this session;
// they're read from history at render time and shown as placeholders ("ghost"
// rows) by the session screen.
import { db } from '../db/database';
import { syncedAdd, syncedDelete, syncedUpdate } from '../db/syncedWrite';
import { isSessionComplete } from './sessionPlans';
import { formatSetMagnitude } from './setFormat';
import type { Session, SessionExercise, SetEntry, SetType } from '../db/types';

// One previous session's sets for an exercise.
export interface LastTimeEntry {
  sessionId: string;
  date: string; // YYYY-MM-DD
  sets: SetEntry[]; // in set order
}

export const LAST_TIME_MAX = 5;

function bySetOrder(a: SetEntry, b: SetEntry): number {
  return a.set_number - b.set_number || a.created_at.localeCompare(b.created_at);
}

// Pure: every completed session's sets for each exercise, newest first, capped
// at LAST_TIME_MAX. `before` excludes that session and anything created after
// it, so "last time" stays relative to the session being logged or edited.
export function composeLastTimes(
  links: SessionExercise[],
  sessions: Session[],
  sets: SetEntry[],
  before?: Pick<Session, 'id' | 'created_at'>,
): Map<string, LastTimeEntry[]> {
  const sessionById = new Map(
    sessions
      .filter(
        (s) =>
          isSessionComplete(s) &&
          (!before || (s.id !== before.id && s.created_at < before.created_at)),
      )
      .map((s) => [s.id, s]),
  );
  const setsByLink = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = setsByLink.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsByLink.set(s.session_exercise_id, arr);
  }
  const byExercise = new Map<string, { entry: LastTimeEntry; created: string }[]>();
  for (const l of links) {
    const session = sessionById.get(l.session_id);
    const linkSets = setsByLink.get(l.id);
    if (!session || !linkSets || linkSets.length === 0) continue;
    const arr = byExercise.get(l.exercise_id) ?? [];
    if (arr.some((x) => x.entry.sessionId === session.id)) continue;
    arr.push({
      entry: { sessionId: session.id, date: session.date, sets: linkSets.slice().sort(bySetOrder) },
      created: session.created_at,
    });
    byExercise.set(l.exercise_id, arr);
  }
  const out = new Map<string, LastTimeEntry[]>();
  for (const [exerciseId, arr] of byExercise) {
    arr.sort((a, b) => b.created.localeCompare(a.created));
    out.set(exerciseId, arr.slice(0, LAST_TIME_MAX).map((x) => x.entry));
  }
  return out;
}

// Last times for a set of exercises. Reads every table it depends on
// unconditionally so a live query observes all of them.
export async function getLastTimes(
  exerciseIds: string[],
  before?: Pick<Session, 'id' | 'created_at'>,
): Promise<Map<string, LastTimeEntry[]>> {
  const links = exerciseIds.length
    ? await db.session_exercises.where('exercise_id').anyOf(exerciseIds).toArray()
    : [];
  const sessionIds = [...new Set(links.map((l) => l.session_id))];
  const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();
  const sets = await db.sets
    .where('session_exercise_id')
    .anyOf(links.map((l) => l.id))
    .toArray();
  return composeLastTimes(links, sessions, sets, before);
}

// ---- Display ------------------------------------------------------------------

export function formatSet(s: Pick<SetEntry, 'weight' | 'reps' | 'set_type' | 'duration_seconds'>): string {
  return `${s.weight.toLocaleString()}×${formatSetMagnitude(s)}`;
}

// "200×12 · 220×12 · 230×12"
export function formatSetList(sets: SetEntry[]): string {
  return sets.map(formatSet).join(' · ');
}

// "3 sets · 200 to 220 lb" (one weight: "3 sets · 200 lb"). Bodyweight work
// with no load falls back to reps or time.
export function summarizeSets(sets: Pick<SetEntry, 'weight' | 'reps' | 'set_type' | 'duration_seconds'>[]): string {
  const n = `${sets.length} set${sets.length === 1 ? '' : 's'}`;
  if (sets.length === 0) return n;
  const range = (vals: number[], unit: string, fmt = (v: number) => v.toLocaleString()) => {
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    return lo === hi ? `${fmt(lo)} ${unit}` : `${fmt(lo)} to ${fmt(hi)} ${unit}`;
  };
  const weights = sets.map((s) => s.weight);
  if (Math.max(...weights) > 0) return `${n} · ${range(weights, 'lb')}`;
  if (sets.every((s) => s.set_type === 'duration')) {
    return `${n} · ${range(sets.map((s) => s.duration_seconds ?? 0), 'sec')}`;
  }
  return `${n} · ${range(sets.map((s) => s.reps), 'reps')}`;
}

// ---- Writes -------------------------------------------------------------------

export interface SetValues {
  weight: number;
  reps: number;
  set_type: SetType;
  duration_seconds: number | null;
}

export async function createSetRow(
  sessionExerciseId: string,
  setNumber: number,
  values: SetValues,
  completed: boolean,
): Promise<string> {
  const row: SetEntry = {
    id: crypto.randomUUID(),
    session_exercise_id: sessionExerciseId,
    set_number: setNumber,
    weight: values.weight,
    reps: values.set_type === 'reps' ? values.reps : 0,
    duration_seconds: values.set_type === 'duration' ? values.duration_seconds : null,
    set_type: values.set_type,
    completed,
    created_at: new Date().toISOString(),
  };
  await syncedAdd(db.sets, row);
  return row.id;
}

export async function updateSetRow(
  setId: string,
  changes: Partial<Pick<SetEntry, 'weight' | 'reps' | 'duration_seconds' | 'set_type' | 'completed'>>,
): Promise<void> {
  await syncedUpdate(db.sets, setId, changes);
}

export async function deleteSetRow(setId: string): Promise<void> {
  await syncedDelete(db.sets, setId);
}

// Rewrite set_number so stored order matches on-screen order (1-based).
export async function renumberSets(orderedSetIds: string[]): Promise<void> {
  await Promise.all(
    orderedSetIds.map(async (id, i) => {
      const row = await db.sets.get(id);
      if (row && row.set_number !== i + 1) await syncedUpdate(db.sets, id, { set_number: i + 1 });
    }),
  );
}

async function nextFinishedOrder(sessionId: string): Promise<number> {
  const links = await db.session_exercises.where('session_id').equals(sessionId).toArray();
  return links.reduce((m, l) => Math.max(m, l.finished_order ?? 0), 0) + 1;
}

// "Finish exercise": every logged row (typed or checked) counts as done; the
// card folds and sinks below the open ones, after anything finished before it.
// Returns false when there's nothing logged, so the caller can say so.
export async function finishExercise(
  link: SessionExercise,
  orderedSetIds: string[],
): Promise<boolean> {
  if (orderedSetIds.length === 0) return false;
  await renumberSets(orderedSetIds);
  await Promise.all(
    orderedSetIds.map(async (id) => {
      const row = await db.sets.get(id);
      if (row && !row.completed) await syncedUpdate(db.sets, id, { completed: true });
    }),
  );
  await syncedUpdate(db.session_exercises, link.id, {
    finished_order: await nextFinishedOrder(link.session_id),
  });
  return true;
}

// Tap a folded card to reopen it.
export async function reopenExercise(linkId: string): Promise<void> {
  await syncedUpdate(db.session_exercises, linkId, { finished_order: null });
}
