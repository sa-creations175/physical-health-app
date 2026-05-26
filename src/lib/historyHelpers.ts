import { db } from '../db/database';
import type { FeelRating, Intensity, SetEntry } from '../db/types';
import type { LiftingType } from './dashboardQueries';

// Unified history feed: completed strength sessions + cardio logs, merged and
// sorted most-recent-first. Read-only view layer over Dexie.

export interface HistoryExercise {
  name: string;
  sets: SetEntry[];
}

export interface HistoryStrengthItem {
  kind: 'strength';
  id: string;
  type: LiftingType;
  date: string; // YYYY-MM-DD
  sortAt: string; // created_at — secondary sort within a day
  feel_rating: FeelRating | null; // null for Watch-imported incomplete sessions
  notes: string;
  source: 'manual' | 'watch' | 'merged' | null;
  exercises: HistoryExercise[];
  totalVolume: number; // Σ weight × reps over rep-sets
  totalSets: number;
}

export interface HistoryCardioItem {
  kind: 'cardio';
  id: string;
  date: string; // local YYYY-MM-DD of started_at
  sortAt: string; // started_at
  typeName: string;
  duration_minutes: number;
  intensity: Intensity;
  distance_miles: number | null;
  notes: string | null;
  source: 'manual' | 'watch' | null;
}

export type HistoryItem = HistoryStrengthItem | HistoryCardioItem;

export async function getHistoryItems(): Promise<HistoryItem[]> {
  const [sessions, links, sets, exercises, cardioLogs, cardioTypes] =
    await Promise.all([
      db.sessions
        .filter((s) => s.feel_rating !== null || s.source === 'watch')
        .toArray(),
      db.session_exercises.toArray(),
      db.sets.toArray(),
      db.exercises.toArray(),
      db.cardio_logs.toArray(),
      db.cardio_types.toArray(),
    ]);

  const exName = new Map(exercises.map((e) => [e.id, e.name]));
  const setsByLink = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const arr = setsByLink.get(s.session_exercise_id) ?? [];
    arr.push(s);
    setsByLink.set(s.session_exercise_id, arr);
  }
  const linksBySession = new Map<string, typeof links>();
  for (const l of links) {
    const arr = linksBySession.get(l.session_id) ?? [];
    arr.push(l);
    linksBySession.set(l.session_id, arr);
  }

  const strength: HistoryStrengthItem[] = [];
  for (const s of sessions) {
    // Completed sessions, plus Watch-imported incomplete ones (feel_rating
    // null) so auto-imported strength still surfaces in History.
    if (s.feel_rating === null && s.source !== 'watch') continue;
    if (s.type !== 'lower' && s.type !== 'upper' && s.type !== 'full_body') {
      continue;
    }
    const slinks = (linksBySession.get(s.id) ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index);
    const exs: HistoryExercise[] = slinks.map((l) => ({
      name: exName.get(l.exercise_id) ?? '—',
      sets: (setsByLink.get(l.id) ?? [])
        .slice()
        .sort((a, b) => a.set_number - b.set_number),
    }));
    let totalVolume = 0;
    let totalSets = 0;
    for (const ex of exs) {
      for (const set of ex.sets) {
        totalSets++;
        if (set.set_type === 'reps') totalVolume += set.weight * set.reps;
      }
    }
    strength.push({
      kind: 'strength',
      id: s.id,
      type: s.type,
      date: s.date,
      sortAt: s.created_at,
      feel_rating: s.feel_rating,
      notes: s.notes,
      source: s.source ?? null,
      exercises: exs,
      totalVolume,
      totalSets,
    });
  }

  const ctName = new Map(cardioTypes.map((t) => [t.id, t.name]));
  const cardio: HistoryCardioItem[] = cardioLogs
    .filter((l) => l.cardio_type_id && ctName.has(l.cardio_type_id))
    .map((l) => ({
      kind: 'cardio',
      id: l.id,
      date: new Date(l.started_at).toLocaleDateString('en-CA'),
      sortAt: l.started_at,
      typeName: ctName.get(l.cardio_type_id) as string,
      duration_minutes: l.duration_minutes,
      intensity: l.intensity,
      distance_miles: l.distance_miles ?? null,
      notes: l.notes ?? null,
      source: l.source ?? null,
    }));

  const all: HistoryItem[] = [...strength, ...cardio];
  all.sort((a, b) =>
    a.date === b.date
      ? b.sortAt.localeCompare(a.sortAt)
      : b.date.localeCompare(a.date),
  );
  return all;
}
