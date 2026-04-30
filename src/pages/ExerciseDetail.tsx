import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import ExerciseEditor from '../components/library/ExerciseEditor';
import Sparkline from '../components/library/Sparkline';
import { SectionLabel } from '../components/ui/primitives';
import { composeExerciseHistory } from '../lib/exerciseHistory';
import { formatSetMagnitude } from '../lib/setFormat';
import { relativeDateLabel } from '../lib/dateHelpers';
import type { Session, SessionExercise, SetEntry } from '../db/types';

export default function ExerciseDetail() {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const exercise = useLiveQuery(
    () => (exerciseId ? db.exercises.get(exerciseId) : undefined),
    [exerciseId],
  );

  // History is composed from three single-table live queries. Earlier we
  // chained all three reads inside one async helper passed to a single
  // useLiveQuery — but dexie-react-hooks observation drops tables when an
  // early return short-circuits the chain before the later table is ever
  // touched, which left the sets/sessions tables unobserved on a fresh
  // exercise and caused new sessions not to refresh the page. One hook per
  // table = each table is observed unambiguously.
  const links = useLiveQuery(
    () =>
      exerciseId
        ? db.session_exercises.where('exercise_id').equals(exerciseId).toArray()
        : Promise.resolve([] as SessionExercise[]),
    [exerciseId],
    [] as SessionExercise[],
  );

  const sessions = useLiveQuery(
    () => {
      const sessionIds = [...new Set(links.map((l) => l.session_id))];
      if (sessionIds.length === 0) return Promise.resolve([] as Session[]);
      return db.sessions.where('id').anyOf(sessionIds).toArray();
    },
    [links],
    [] as Session[],
  );

  const sets = useLiveQuery(
    () => {
      const linkIds = links.map((l) => l.id);
      if (linkIds.length === 0) return Promise.resolve([] as SetEntry[]);
      return db.sets.where('session_exercise_id').anyOf(linkIds).toArray();
    },
    [links],
    [] as SetEntry[],
  );

  const history = useMemo(
    () => composeExerciseHistory(links, sessions, sets, 8),
    [links, sessions, sets],
  );

  if (!exerciseId) {
    return (
      <div className="px-5 pt-8 text-card-mute text-[12px]">
        No exercise selected.
      </div>
    );
  }

  if (exercise === undefined) {
    return (
      <div className="px-5 pt-8 text-card-mute text-[12px]">Loading…</div>
    );
  }

  if (exercise === null) {
    return (
      <div className="px-5 pt-8 text-card-mute text-[12px]">
        Exercise not found.
      </div>
    );
  }

  const last = history[0] ?? null;

  return (
    <div className="px-5 pt-8 pb-8">
      <button
        type="button"
        onClick={() => navigate('/library')}
        className="text-[11px] tracking-micro uppercase text-card-mute font-semibold"
      >
        ← Library
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>Exercise</SectionLabel>
          <h1 className="text-[22px] font-medium text-ink mt-1 leading-tight">
            {exercise.name}
          </h1>
          <p className="text-[12px] text-ink-soft mt-1">
            {exercise.muscle_group.replace('_', ' ')}
            {exercise.is_compound ? ' · compound' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[11px] tracking-micro uppercase font-semibold text-green-mint border border-card-edge bg-card rounded-lg px-3 h-9 whitespace-nowrap"
        >
          Edit
        </button>
      </div>

      <div
        className="bg-card border border-card-edge rounded-xl p-4 mt-5"
        style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
      >
        <SectionLabel>Last session</SectionLabel>
        {last ? (
          <>
            <p className="text-[14px] text-ink mt-1">
              <span className="font-medium">{last.topSet.weight}</span>
              <span className="text-card-mute"> × {formatSetMagnitude(last.topSet)}</span>
              <span className="text-card-mute">
                {' · '}
                {last.totalSets} set{last.totalSets === 1 ? '' : 's'}
              </span>
            </p>
            <p className="text-[11px] text-card-mute mt-1">
              {relativeDateLabel(last.date)}
            </p>
          </>
        ) : (
          <p className="text-[12px] text-card-mute mt-1">
            No sessions yet — log this exercise to start a history.
          </p>
        )}
      </div>

      <div className="mt-5">
        <SectionLabel>Last 8 sessions</SectionLabel>
        <div className="bg-card border border-card-edge rounded-xl p-4 mt-2">
          <Sparkline entries={history} />
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel>History</SectionLabel>
        {history.length === 0 ? (
          <p className="text-[12px] text-card-mute mt-2">
            No completed sessions yet.
          </p>
        ) : (
          <div className="mt-2">
            {history.map((entry) => {
              const accent = entry.isPR ? '#5DCAA5' : '#0F6E56';
              return (
                <div
                  key={entry.sessionId}
                  className="bg-card border border-card-edge rounded-xl p-3 mt-2 flex items-center justify-between gap-3"
                  style={{ borderLeftWidth: '2px', borderLeftColor: accent }}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] text-card-mute tracking-micro uppercase">
                      {relativeDateLabel(entry.date)}
                    </p>
                    <p className="text-[14px] text-ink mt-0.5">
                      <span className="font-medium">{entry.topSet.weight}</span>
                      <span className="text-card-mute"> × {formatSetMagnitude(entry.topSet)}</span>
                      <span className="text-card-mute">
                        {' · '}
                        {entry.totalSets} set{entry.totalSets === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  {entry.isPR && (
                    <span className="text-[10px] tracking-micro uppercase font-semibold text-green-mint border border-green-mint rounded-full px-2 py-0.5 whitespace-nowrap">
                      PR
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <ExerciseEditor exerciseId={exerciseId} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
