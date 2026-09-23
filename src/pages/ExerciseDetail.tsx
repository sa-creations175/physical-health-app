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
import HeaderStrip from '../components/ui/HeaderStrip';

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
      <div className="px-4 pt-8 text-muted text-label">
        No exercise selected.
      </div>
    );
  }

  if (exercise === undefined) {
    return (
      <div className="px-4 pt-8 text-muted text-label">Loading…</div>
    );
  }

  const last = history.entries[0] ?? null;
  const pr = history.personalRecord;

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Exercise"
        title={exercise.name}
        subtitle={
          <>
            {exercise.muscle_group.replace('_', ' ')}
            {exercise.is_compound ? ' · compound' : ''}
          </>
        }
        right={
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="pill min-h-[44px] min-w-[64px] whitespace-nowrap"
          >
            Edit
          </button>
        }
      >
        <div className="mt-3">
          <button type="button" onClick={() => navigate('/library')} className="pill">
            ← Library
          </button>
        </div>
      </HeaderStrip>
      <div className="px-4">

      <div
        className="card p-4 mt-5"
      >
        {!last && !pr ? (
          <p className="text-label text-muted">
            No sessions yet — log this exercise to start a history.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <SectionLabel>Last Set</SectionLabel>
              {last ? (
                <>
                  <p className="text-body text-ink mt-1">
                    <span className="font-medium">{last.lastSet.weight.toLocaleString()}</span>
                    <span className="text-muted"> × {formatSetMagnitude(last.lastSet)}</span>
                  </p>
                  <p className="text-label text-muted mt-1">
                    {relativeDateLabel(last.date)}
                    {' · '}
                    {last.totalSets} set{last.totalSets === 1 ? '' : 's'}
                  </p>
                </>
              ) : (
                <p className="text-label text-muted mt-1">—</p>
              )}
            </div>
            <div>
              <SectionLabel>Personal Best</SectionLabel>
              {pr ? (
                <>
                  <p className="text-body text-ink mt-1">
                    <span className="font-medium">{pr.weight.toLocaleString()}</span>
                    <span className="text-muted"> × {formatSetMagnitude(pr)}</span>
                  </p>
                  <p className="text-label text-muted mt-1">
                    {relativeDateLabel(pr.date)}
                  </p>
                </>
              ) : (
                <p className="text-label text-muted mt-1">—</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5">
        <SectionLabel>Last 8 Sessions</SectionLabel>
        <div className="card p-4 mt-2">
          <Sparkline entries={history.entries} />
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel>History</SectionLabel>
        {history.entries.length === 0 ? (
          <p className="text-label text-muted mt-2">
            No completed sessions yet.
          </p>
        ) : (
          <div className="mt-2">
            {history.entries.map((entry) => {
              return (
                <div
                  key={entry.sessionId}
                  className="card p-3 mt-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="micro text-muted">
                      {relativeDateLabel(entry.date)}
                    </p>
                    <p className="text-body text-ink mt-0.5">
                      <span className="font-medium">{entry.topSet.weight.toLocaleString()}</span>
                      <span className="text-muted"> × {formatSetMagnitude(entry.topSet)}</span>
                      <span className="text-muted">
                        {' · '}
                        {entry.totalSets} set{entry.totalSets === 1 ? '' : 's'}
                      </span>
                    </p>
                  </div>
                  {entry.isPR && (
                    <span className="eyebrow border border-green-700 rounded-full px-2 py-0.5 whitespace-nowrap">
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
    </div>
  );
}
