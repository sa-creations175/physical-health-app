import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import HeaderStrip from '../components/ui/HeaderStrip';
import { getLiftingSummary } from '../lib/dashboardQueries';
import { getUserPreferences } from '../lib/userPreferences';
import { isStrengthType, STRENGTH_TYPE_LABEL } from '../lib/sessionPlans';
import { formatSetList } from '../lib/sessionSets';
import { getWatchDurationForSession } from '../lib/sessionDuration';
import { pillarCallout } from '../lib/pillarNarrative';
import { fillFraction } from '../lib/progress';
import FeelAndNote from '../components/strength/FeelAndNote';
import type { SetEntry, StrengthType } from '../db/types';

const TARGET_FIELD = {
  lower: 'lifting_target_lower',
  upper: 'lifting_target_upper',
  full_body: 'lifting_target_full_body',
} as const;

// The summary after "Finish session": date, Apple Watch duration when there's
// a matching workout, the exercise count, what you did, and this week's count
// for the type. "Edit session" reopens the same screen, folded.
export default function SessionComplete() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState<number | null>(null);

  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const rows = useLiveQuery(
    async () => {
      const links = await db.session_exercises.where('session_id').equals(sessionId).toArray();
      const sets = await db.sets
        .where('session_exercise_id')
        .anyOf(links.map((l) => l.id))
        .toArray();
      const exercises = await db.exercises.where('id').anyOf(links.map((l) => l.exercise_id)).toArray();
      const name = new Map(exercises.map((e) => [e.id, e.name]));
      return links
        .slice()
        .sort(
          (a, b) =>
            (a.finished_order ?? Infinity) - (b.finished_order ?? Infinity) ||
            a.order_index - b.order_index,
        )
        .map((l) => ({
          id: l.id,
          name: name.get(l.exercise_id) ?? 'Exercise',
          sets: sets
            .filter((s) => s.session_exercise_id === l.id)
            .sort((a, b) => a.set_number - b.set_number) as SetEntry[],
        }));
    },
    [sessionId],
    [],
  );
  const type: StrengthType | null = session && isStrengthType(session.type) ? session.type : null;
  const week = useLiveQuery(
    async () => {
      if (!type) return null;
      const [summary, prefs] = await Promise.all([getLiftingSummary(type), getUserPreferences()]);
      return { count: summary.thisWeekCount, target: prefs[TARGET_FIELD[type]] };
    },
    [type],
  );

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getWatchDurationForSession(session)
      .then((m) => {
        if (!cancelled) setMinutes(m);
      })
      .catch(() => {
        /* no Watch duration: the summary just shows the date */
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return <div className="px-4 pt-8 text-muted text-label">Loading session…</div>;
  }

  const typeLabel = type ? STRENGTH_TYPE_LABEL[type] : 'Session';
  const dateLabel = new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const subtitle = [
    dateLabel,
    minutes ? `${minutes} min · Apple Watch` : null,
    `${rows.length} exercise${rows.length === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const met = !!week && week.target > 0 && week.count >= week.target;
  const callout =
    week && week.target > 0 && (type === 'lower' || type === 'upper')
      ? pillarCallout(type, fillFraction(week.count, week.target), session.date)
      : null;

  return (
    <div className="pb-8">
      <HeaderStrip eyebrow={`Body · Fitness · ${typeLabel}`} title="Session Saved" subtitle={subtitle} />
      <div className="px-4">
        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">What You Did</p>
            <button
              type="button"
              onClick={() => navigate(`/log/strength/active/${sessionId}`)}
              className="pill pill-soft py-1 px-2.5"
            >
              Edit session
            </button>
          </div>
          <div className="mt-1">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex justify-between gap-3 py-2.5 border-b border-hairline last:border-b-0 text-body tabular-nums"
              >
                <span className="text-ink">{r.name}</span>
                <span className="text-ink text-right">{formatSetList(r.sets)}</span>
              </div>
            ))}
          </div>
          {callout && <p className="callout mt-3 font-semibold text-green-900">{callout}</p>}
          <FeelAndNote session={session} />
        </div>

        {type && week && week.target > 0 && (
          <div className="card p-4 mt-3">
            <p className="eyebrow">This Week</p>
            <p className="text-body text-ink mt-2">
              {typeLabel}{' '}
              <span className="font-bold tabular-nums">
                {week.count} / {week.target}
              </span>
              {met && <span className="pill pill-soft py-0.5 px-2 ml-2 text-micro">goal met</span>}
            </p>
          </div>
        )}

        <button type="button" onClick={() => navigate('/fitness')} className="btn-primary w-full mt-4">
          Done
        </button>
      </div>
    </div>
  );
}
