// Session types and session instances.
//
// A session TYPE (Lower Body, Upper Body, Full Body) owns a standing list of
// exercises: its SessionPlan. A session INSTANCE is one dated Session row whose
// session_exercises start as a copy of that list. Swapping or adding an
// exercise changes the instance only; the type's list changes only when the
// user accepts the "make it part of the usual list" nudge (keepSwapInPlan).
import { db } from '../db/database';
import { syncedAdd, syncedBulkDelete, syncedDelete, syncedPut, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type {
  Session,
  SessionExercise,
  SessionPlan,
  SessionType,
  StrengthType,
} from '../db/types';

export const STRENGTH_TYPES: StrengthType[] = ['lower', 'upper', 'full_body'];

export const STRENGTH_TYPE_LABEL: Record<StrengthType, string> = {
  lower: 'Lower Body',
  upper: 'Upper Body',
  full_body: 'Full Body',
};

export function isStrengthType(t: SessionType): t is StrengthType {
  return t === 'lower' || t === 'upper' || t === 'full_body';
}

// A session is finished once it has completed_at. Rows from before that column
// existed signalled completion with a feel rating, so either counts.
export function isSessionComplete(
  s: Pick<Session, 'feel_rating'> & { completed_at?: string | null },
): boolean {
  return !!s.completed_at || s.feel_rating !== null;
}

export function planId(type: StrengthType): string {
  return `plan-${type}`;
}

// How many recent instances "top candidates" looks back over, and how many
// candidates it returns.
export const CANDIDATE_WINDOW = 6;
export const CANDIDATE_LIMIT = 3;

// ---- Standing lists ---------------------------------------------------------

// Completed instances of a type, newest first. `before` limits the list to
// instances created before that session (so an instance never counts itself,
// even when it's reopened for editing after it was finished).
export async function completedInstances(
  type: StrengthType,
  before?: Pick<Session, 'id' | 'created_at'>,
): Promise<Session[]> {
  const rows = await db.sessions.where('type').equals(type).toArray();
  return rows
    .filter(
      (s) =>
        isSessionComplete(s) &&
        s.source !== 'watch' &&
        (!before || (s.id !== before.id && s.created_at < before.created_at)),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function linksFor(sessionId: string): Promise<SessionExercise[]> {
  return db.session_exercises
    .where('session_id')
    .equals(sessionId)
    .sortBy('order_index');
}

// Seed each type's standing list from what the app used before types existed:
// "Repeat last session" copied the most recent completed session of the type,
// so that session's exercises, in order, become the list. A type with no
// history starts empty. Runs once per type at startup; never overwrites.
export async function seedSessionPlansIfMissing(): Promise<void> {
  for (const type of STRENGTH_TYPES) {
    if (await db.session_plans.get(planId(type))) continue;
    const [last] = await completedInstances(type);
    const ids: string[] = [];
    if (last) {
      for (const l of await linksFor(last.id)) {
        // A today-only swap stands in for its standing exercise; a today-only
        // addition isn't part of the list at all.
        const id =
          l.origin === 'swap' ? l.replaced_exercise_id
          : l.origin === 'added' ? null
          : l.exercise_id;
        if (id && !ids.includes(id) && (await db.exercises.get(id))) ids.push(id);
      }
    }
    const now = new Date().toISOString();
    await syncedPut(db.session_plans, {
      id: planId(type),
      user_id: LOCAL_USER_ID,
      type,
      exercise_ids: ids,
      created_at: now,
      updated_at: now,
    });
  }
}

export async function getSessionPlan(type: StrengthType): Promise<SessionPlan | null> {
  return (await db.session_plans.get(planId(type))) ?? null;
}

async function setPlanExercises(type: StrengthType, ids: string[]): Promise<void> {
  const existing = await getSessionPlan(type);
  const now = new Date().toISOString();
  await syncedPut(db.session_plans, {
    id: planId(type),
    user_id: LOCAL_USER_ID,
    type,
    exercise_ids: ids,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  });
}

// A type with no standing list yet (no history when lists were seeded) takes
// the exercises of its first finished session as the list, so the next
// session doesn't open empty again.
export async function adoptAsPlanIfEmpty(
  type: StrengthType,
  exerciseIds: string[],
): Promise<void> {
  const plan = await getSessionPlan(type);
  if (plan && plan.exercise_ids.length > 0) return;
  if (exerciseIds.length === 0) return;
  await setPlanExercises(type, [...new Set(exerciseIds)]);
}

// ---- Instances --------------------------------------------------------------

function newLink(
  sessionId: string,
  exerciseId: string,
  orderIndex: number,
  origin: SessionExercise['origin'],
  replacedExerciseId: string | null = null,
): SessionExercise {
  return {
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: exerciseId,
    order_index: orderIndex,
    notes: null,
    origin,
    replaced_exercise_id: replacedExerciseId,
    finished_order: null,
    nudge_resolved: null,
  };
}

// Copy the type's standing list into a fresh instance. Exercises that were
// deleted from the library since are skipped.
export async function copyPlanIntoSession(
  sessionId: string,
  type: StrengthType,
): Promise<void> {
  const plan = await getSessionPlan(type);
  if (!plan) return;
  let i = 0;
  for (const exerciseId of plan.exercise_ids) {
    if (!(await db.exercises.get(exerciseId))) continue;
    await syncedAdd(db.session_exercises, newLink(sessionId, exerciseId, i++, 'plan'));
  }
}

// "+ Add an exercise": lands at the end of today's instance, today only.
export async function addExerciseToInstance(
  sessionId: string,
  exerciseId: string,
): Promise<string> {
  const links = await linksFor(sessionId);
  const order = links.reduce((m, l) => Math.max(m, l.order_index + 1), 0);
  const link = newLink(sessionId, exerciseId, order, 'added');
  await syncedAdd(db.session_exercises, link);
  await syncedUpdate(db.exercises, exerciseId, { last_used_at: new Date().toISOString() });
  return link.id;
}

// "Swap exercise": today's card now holds a different exercise, in the same
// position, open. Anything logged against the old exercise belonged to it, so
// its sets go with it. The standing exercise it stands in for is remembered so
// the nudge can offer to make the swap permanent.
export async function swapExerciseInInstance(
  linkId: string,
  exerciseId: string,
): Promise<void> {
  const link = await db.session_exercises.get(linkId);
  if (!link) return;
  const standing =
    link.origin === 'swap' ? (link.replaced_exercise_id ?? null)
    : link.origin === 'added' ? null
    : link.exercise_id;
  const sets = await db.sets.where('session_exercise_id').equals(linkId).toArray();
  for (const s of sets) await syncedDelete(db.sets, s.id);
  await syncedUpdate(db.session_exercises, linkId, {
    exercise_id: exerciseId,
    origin: link.origin === 'added' ? 'added' : 'swap',
    replaced_exercise_id: standing,
    finished_order: null,
    nudge_resolved: null,
    notes: null,
  });
  await syncedUpdate(db.exercises, exerciseId, { last_used_at: new Date().toISOString() });
}

// "Remove": take an exercise out of today's session, with any sets already
// logged for it. Like swap and add, it changes this instance only; the type's
// standing list is never touched, so the next session still includes it.
// Both deletes land in one transaction: deleting the sets and then the link
// as two separate writes left the session screen's live exercise list showing
// the removed card until the next reload.
export async function removeExerciseFromInstance(linkId: string): Promise<void> {
  await db.transaction('rw', db.sets, db.session_exercises, async () => {
    const setIds = (await db.sets.where('session_exercise_id').equals(linkId).primaryKeys()) as string[];
    await syncedBulkDelete(db.sets, setIds);
    await syncedDelete(db.session_exercises, linkId);
  });
}

// Reorder today's open exercises (long press and drag). Like a swap, it changes
// this instance only; the type's standing list keeps its order. Finished
// exercises keep sinking below open ones whatever their order_index.
export async function reorderOpenExercises(
  sessionId: string,
  openOrder: string[],
): Promise<void> {
  const links = await linksFor(sessionId);
  const finished = links.filter((l) => !openOrder.includes(l.id));
  const order = [...openOrder, ...finished.map((l) => l.id)];
  for (const [i, id] of order.entries()) {
    const link = links.find((l) => l.id === id);
    if (link && link.order_index !== i) await syncedUpdate(db.session_exercises, id, { order_index: i });
  }
}

// The swapped-in exercises in this instance that were ALSO swapped in on the
// previous instance of the same type. Those get the nudge.
export async function repeatSwapLinkIds(sessionId: string): Promise<Set<string>> {
  const session = await db.sessions.get(sessionId);
  const out = new Set<string>();
  if (!session || !isStrengthType(session.type)) return out;
  const links = (await linksFor(sessionId)).filter(
    (l) => l.origin === 'swap' && !l.nudge_resolved,
  );
  if (links.length === 0) return out;
  const [previous] = await completedInstances(session.type, session);
  if (!previous) return out;
  const prevSwapped = new Set(
    (await linksFor(previous.id))
      .filter((l) => l.origin === 'swap')
      .map((l) => l.exercise_id),
  );
  for (const l of links) if (prevSwapped.has(l.exercise_id)) out.add(l.id);
  return out;
}

// "Yes, keep it": the swapped-in exercise takes the standing exercise's place
// in the type's list (or joins the end if that one is no longer there).
export async function keepSwapInPlan(linkId: string): Promise<void> {
  const link = await db.session_exercises.get(linkId);
  if (!link) return;
  const session = await db.sessions.get(link.session_id);
  if (!session || !isStrengthType(session.type)) return;
  const plan = await getSessionPlan(session.type);
  const ids = (plan?.exercise_ids ?? []).filter((id) => id !== link.exercise_id);
  const at = link.replaced_exercise_id ? ids.indexOf(link.replaced_exercise_id) : -1;
  if (at >= 0) ids[at] = link.exercise_id;
  else ids.push(link.exercise_id);
  await setPlanExercises(session.type, ids);
  await syncedUpdate(db.session_exercises, linkId, { nudge_resolved: true });
}

// "Just today": the nudge goes away for this card; the list is untouched.
export async function resolveNudge(linkId: string): Promise<void> {
  await syncedUpdate(db.session_exercises, linkId, { nudge_resolved: true });
}

// ---- Top candidates -----------------------------------------------------------

export interface Candidate {
  exerciseId: string;
  count: number; // instances (of the last `of`) the exercise appeared in
  of: number; // how many instances were looked at (≤ CANDIDATE_WINDOW)
}

// For a type: the top three exercises by how many of the last six instances of
// that type they appeared in, excluding ones already in today's instance.
// Ties go to the exercise seen most recently.
export async function getTopCandidates(
  type: StrengthType,
  session: Pick<Session, 'id' | 'created_at'>,
  excludeExerciseIds: Iterable<string>,
): Promise<Candidate[]> {
  const exclude = new Set(excludeExerciseIds);
  const recent = (await completedInstances(type, session)).slice(0, CANDIDATE_WINDOW);
  const count = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  for (const [i, s] of recent.entries()) {
    const ids = new Set((await linksFor(s.id)).map((l) => l.exercise_id));
    for (const id of ids) {
      count.set(id, (count.get(id) ?? 0) + 1);
      if (!lastSeen.has(id)) lastSeen.set(id, i);
    }
  }
  const out: Candidate[] = [];
  for (const [exerciseId, c] of count) {
    if (exclude.has(exerciseId)) continue;
    if (!(await db.exercises.get(exerciseId))) continue;
    out.push({ exerciseId, count: c, of: recent.length });
  }
  out.sort(
    (a, b) =>
      b.count - a.count ||
      (lastSeen.get(a.exerciseId) ?? 0) - (lastSeen.get(b.exerciseId) ?? 0),
  );
  return out.slice(0, CANDIDATE_LIMIT);
}
