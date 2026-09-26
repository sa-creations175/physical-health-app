// Sets inside a session instance, and the history they're logged against.
//
// A set is only data once the user typed into it or checked it: that's when a
// `sets` row is written. Last time's numbers are never rows in this session;
// they're read from history at render time and shown as placeholders ("ghost"
// rows) by the session screen.
import { db } from '../db/database';
import { syncedAdd, syncedDelete, syncedUpdate } from '../db/syncedWrite';
import {
  adoptAsPlanIfEmpty,
  isSessionComplete,
  isStrengthType,
  STRENGTH_TYPE_LABEL,
} from './sessionPlans';
import { todayISODate } from './dateHelpers';
import { formatSetMagnitude } from './setFormat';
import type { Session, SessionExercise, SetEntry, SetType, StrengthType } from '../db/types';

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

// ---- Finishing a session --------------------------------------------------------

export interface FinishResult {
  kept: number; // exercises in the saved session
  dropped: string[]; // names of exercises left out because nothing was logged
  discarded: boolean; // nothing at all was logged, so the session wasn't kept
}

// "Finish session" (and "Save changes" when editing). Never blocks: every open
// exercise with at least one logged set (typed or checked) is finished, its
// sets marked done; every exercise with nothing logged is left out. A session
// with nothing logged anywhere isn't kept. Untouched ghost rows were never
// written, so there's nothing to drop for them.
export async function finishSession(sessionId: string): Promise<FinishResult> {
  const session = await db.sessions.get(sessionId);
  if (!session) return { kept: 0, dropped: [], discarded: true };
  const links = await db.session_exercises
    .where('session_id')
    .equals(sessionId)
    .sortBy('order_index');
  const names = new Map(
    (await db.exercises.where('id').anyOf(links.map((l) => l.exercise_id)).toArray()).map(
      (e) => [e.id, e.name],
    ),
  );

  const dropped: string[] = [];
  const kept: SessionExercise[] = [];
  let order = links.reduce((m, l) => Math.max(m, l.finished_order ?? 0), 0);
  for (const l of links) {
    const sets = (await db.sets.where('session_exercise_id').equals(l.id).toArray()).sort(
      (a, b) => a.set_number - b.set_number,
    );
    if (sets.length === 0) {
      dropped.push(names.get(l.exercise_id) ?? 'An exercise');
      await syncedDelete(db.session_exercises, l.id);
      continue;
    }
    kept.push(l);
    if (l.finished_order != null) continue;
    await renumberSets(sets.map((s) => s.id));
    for (const s of sets) if (!s.completed) await syncedUpdate(db.sets, s.id, { completed: true });
    await syncedUpdate(db.session_exercises, l.id, { finished_order: ++order });
  }

  if (kept.length === 0) {
    await syncedDelete(db.sessions, sessionId);
    return { kept: 0, dropped, discarded: true };
  }

  const now = new Date().toISOString();
  await syncedUpdate(db.sessions, sessionId, {
    completed_at: session.completed_at ?? now,
    updated_at: now,
  });
  if (isStrengthType(session.type)) {
    const ordered = kept
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map((l) => l.exercise_id);
    await adoptAsPlanIfEmpty(session.type, ordered);
  }
  return { kept: kept.length, dropped, discarded: false };
}

// "Bulgarian Split Squat and Leg Press had no sets, left out"
export function droppedMessage(dropped: string[]): string {
  const list =
    dropped.length <= 1
      ? (dropped[0] ?? '')
      : `${dropped.slice(0, -1).join(', ')} and ${dropped[dropped.length - 1]}`;
  return `${list} had no sets, left out`;
}

// ---- Sessions left unfinished --------------------------------------------------

// A notice Fitness shows once for each session saved on the user's behalf.
export interface AutoSavedNotice {
  sessionId: string;
  text: string; // "Monday's Lower Body was saved with 2 exercises. Tap to edit"
  // Newer notices also carry the parts, so the line can use the session
  // type's own name (renamed or built in) when it is shown.
  date?: string;
  type?: StrengthType;
  kept?: number;
}

export const AUTOSAVED_NOTICES_KEY = 'ph_autosaved_session_notices';
// Fired on window when notices change, so a mounted Fitness screen updates.
export const AUTOSAVED_NOTICES_EVENT = 'ph-autosaved-notices';

function writeNotices(notices: AutoSavedNotice[]): void {
  try {
    localStorage.setItem(AUTOSAVED_NOTICES_KEY, JSON.stringify(notices));
  } catch {
    /* storage unavailable: no notice, the session is still saved */
  }
  window.dispatchEvent(new Event(AUTOSAVED_NOTICES_EVENT));
}

export function readAutoSavedNotices(): AutoSavedNotice[] {
  try {
    return JSON.parse(localStorage.getItem(AUTOSAVED_NOTICES_KEY) ?? '[]') as AutoSavedNotice[];
  } catch {
    return [];
  }
}

export function dismissAutoSavedNotice(sessionId: string): void {
  writeNotices(readAutoSavedNotices().filter((n) => n.sessionId !== sessionId));
}

// On app open: a strength session left unfinished on an earlier day is saved
// with whatever was logged (same rules as Finish session), and Fitness is told
// once. Nothing keeps running. Today's unfinished session is left as a draft:
// the app may simply have been closed mid-workout, and "Save for later" keeps
// a draft on purpose.
export async function autoSaveUnfinishedSessions(): Promise<void> {
  const today = todayISODate();
  const drafts = (await db.sessions.toArray()).filter(
    (s) =>
      !isSessionComplete(s) &&
      s.source !== 'watch' &&
      isStrengthType(s.type) &&
      s.date < today,
  );
  if (drafts.length === 0) return;
  const notices = readAutoSavedNotices();
  for (const s of drafts) {
    const result = await finishSession(s.id);
    if (result.discarded || !isStrengthType(s.type)) continue;
    const weekday = new Date(s.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    notices.push({
      sessionId: s.id,
      date: s.date,
      type: s.type,
      kept: result.kept,
      text: `${weekday}'s ${STRENGTH_TYPE_LABEL[s.type]} was saved with ${result.kept} exercise${
        result.kept === 1 ? '' : 's'
      }. Tap to edit`,
    });
  }
  writeNotices(notices);
}
