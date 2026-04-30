import { db } from '../db/database';
import type { Session, SessionExercise, SetEntry, SetType } from '../db/types';

export type PRKind = 'weight' | 'duration' | null;

export interface TopSet {
  weight: number;
  reps: number;
  duration_seconds: number | null;
  set_type: SetType;
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  date: string; // YYYY-MM-DD
  totalSets: number;
  totalVolume: number; // lb·reps for rep-mode sets only
  topSet: TopSet;
  // Single comparable number per session: est1RM for rep-mode top set,
  // duration_seconds for duration-mode. Drives the sparkline y-axis and PR detection.
  metric: number;
  metricKind: SetType;
  isPR: boolean;
  prKind: PRKind;
}

// Epley formula. weight × (1 + reps/30) — smooths weight↔reps trade-offs
// so a single number can rank rep-mode sets across sessions.
export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

function topSetForSession(sets: SetEntry[]): TopSet | null {
  const repSets = sets.filter((s) => s.set_type === 'reps');
  const durationSets = sets.filter((s) => s.set_type === 'duration');

  // Pick the dominant mode for this session. Rep-mode wins ties since most
  // lifting work is rep-based; a session that mixes modes still gets a single
  // comparable top set so the sparkline y-axis means one thing.
  const useReps = repSets.length >= durationSets.length;
  const candidates = useReps ? repSets : durationSets;
  if (candidates.length === 0) return null;

  if (useReps) {
    let best = candidates[0];
    let bestScore = estimated1RM(best.weight, best.reps);
    for (let i = 1; i < candidates.length; i++) {
      const score = estimated1RM(candidates[i].weight, candidates[i].reps);
      if (score > bestScore) {
        bestScore = score;
        best = candidates[i];
      }
    }
    return {
      weight: best.weight,
      reps: best.reps,
      duration_seconds: null,
      set_type: 'reps',
    };
  }

  let best = candidates[0];
  let bestSecs = best.duration_seconds ?? 0;
  for (let i = 1; i < candidates.length; i++) {
    const secs = candidates[i].duration_seconds ?? 0;
    if (secs > bestSecs) {
      bestSecs = secs;
      best = candidates[i];
    }
  }
  return {
    weight: best.weight,
    reps: 0,
    duration_seconds: best.duration_seconds,
    set_type: 'duration',
  };
}

// Pure compose: given the raw rows for an exercise (its session_exercise
// links, the parent sessions, and all sets across those links), return the
// most recent N completed sessions with top set, total volume, and PR flags.
//
// Pulled out of the async getExerciseHistory so the React detail view can
// drive observation via three single-table useLiveQuery hooks. dexie-react-hooks
// table tracking through a multi-await async chain is unreliable when an early
// return short-circuits before later tables are read; with one hook per table,
// every relevant table is observed unambiguously.
//
// PR detection is computed across all completed history passed in (not just
// the returned window) so an old PR outside the window still anchors the
// running max correctly. PRs are tracked per-mode — a duration PR doesn't
// invalidate the rep-mode running max and vice versa.
export function composeExerciseHistory(
  links: SessionExercise[],
  sessions: Session[],
  sets: SetEntry[],
  limit = 8,
): ExerciseHistoryEntry[] {
  if (links.length === 0) return [];

  const completed = sessions.filter((s) => s.feel_rating !== null);
  if (completed.length === 0) return [];

  const setsByLink = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = setsByLink.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsByLink.set(s.session_exercise_id, arr);
  }

  // A session shouldn't normally hold the same exercise twice; if it does,
  // we keep the first link encountered so we don't double-count.
  const linkBySession = new Map<string, string>();
  for (const link of links) {
    if (!linkBySession.has(link.session_id)) {
      linkBySession.set(link.session_id, link.id);
    }
  }

  // Walk oldest → newest so the running max can flag PRs.
  const ordered = completed.slice().sort((a, b) => a.date.localeCompare(b.date));
  const entries: ExerciseHistoryEntry[] = [];
  let maxRepMetric = 0;
  let maxDurationSecs = 0;

  for (const session of ordered) {
    const linkId = linkBySession.get(session.id);
    if (!linkId) continue;
    const sessionSets = setsByLink.get(linkId) ?? [];
    if (sessionSets.length === 0) continue;

    const top = topSetForSession(sessionSets);
    if (!top) continue;

    const totalVolume = sessionSets.reduce(
      (sum, s) => (s.set_type === 'duration' ? sum : sum + s.weight * s.reps),
      0,
    );

    let metric = 0;
    let isPR = false;
    let prKind: PRKind = null;

    if (top.set_type === 'reps') {
      metric = estimated1RM(top.weight, top.reps);
      if (metric > 0 && metric > maxRepMetric) {
        isPR = true;
        prKind = 'weight';
        maxRepMetric = metric;
      }
    } else {
      metric = top.duration_seconds ?? 0;
      if (metric > 0 && metric > maxDurationSecs) {
        isPR = true;
        prKind = 'duration';
        maxDurationSecs = metric;
      }
    }

    entries.push({
      sessionId: session.id,
      date: session.date,
      totalSets: sessionSets.length,
      totalVolume,
      topSet: top,
      metric,
      metricKind: top.set_type,
      isPR,
      prKind,
    });
  }

  // Most recent first, bounded.
  return entries.slice(-limit).reverse();
}

// One-shot async wrapper kept for non-React callers (tests, future
// background jobs). The detail view doesn't use this — it composes from
// per-table live queries instead.
export async function getExerciseHistory(
  exerciseId: string,
  limit = 8,
): Promise<ExerciseHistoryEntry[]> {
  const links = await db.session_exercises
    .where('exercise_id')
    .equals(exerciseId)
    .toArray();
  if (links.length === 0) return [];

  const sessionIds = [...new Set(links.map((l) => l.session_id))];
  const sessions = await db.sessions.where('id').anyOf(sessionIds).toArray();

  const linkIds = links.map((l) => l.id);
  const sets = await db.sets
    .where('session_exercise_id')
    .anyOf(linkIds)
    .toArray();

  return composeExerciseHistory(links, sessions, sets, limit);
}
