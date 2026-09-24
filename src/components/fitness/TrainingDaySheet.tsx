import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import { getWorkouts, RING_LABEL, type TrainingType, type Workout } from '../../lib/bodySignals';
import { reclassifyTo } from '../../lib/dayDetailHelpers';
import { todayISODate } from '../../lib/dateHelpers';
import { clockLabel, dayDateLabel, openPath } from '../../lib/fitnessFormat';

const CHANGE_TO: TrainingType[] = ['cardio', 'lower', 'upper', 'full_body'];

// One day of training: each workout in its own box (what it was, what you
// did, then time · average bpm · Active minutes), and buttons to add to that
// day. Tap a workout to open it. A workout the Apple Watch filed can be
// counted as something else (Change type), the same re-count the old
// Reclassify did. Opened from the Fitness score's day dots; built to be
// reused by Home.
export default function TrainingDaySheet({ date, onClose }: { date: string; onClose: () => void }) {
  const navigate = useNavigate();
  const workouts = useLiveQuery(() => getWorkouts(date, date), [date]);
  const isToday = date === todayISODate();
  const short = dayDateLabel(date).slice(0, 3);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <BottomSheet onClose={onClose} label={dayDateLabel(date)}>
      <p className="eyebrow pr-10">{isToday ? 'Today' : 'Training'}</p>
      <h2 className="text-heading text-ink mt-0.5">{dayDateLabel(date)}</h2>

      {workouts && workouts.length === 0 && (
        <p className="text-label text-muted border-t border-hairline mt-2 pt-3">
          {isToday ? 'Nothing logged yet today.' : 'Nothing logged this day.'}
        </p>
      )}
      <div className="mt-2 space-y-2">
        {(workouts ?? []).map((w) => (
          <WorkoutBox key={w.id} w={w} onOpen={() => go(openPath(w))} />
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => go(isToday ? '/log/strength' : `/log/strength?date=${date}`)}
          className="btn-primary flex-1 px-2"
        >
          {isToday ? 'Start a session' : `Add a session to ${short}`}
        </button>
        <button
          type="button"
          onClick={() => go(isToday ? '/log/cardio' : `/log/cardio?date=${date}`)}
          className="btn flex-1 px-2 tile text-green-700"
        >
          {isToday ? 'Log cardio' : `Log cardio for ${short}`}
        </button>
      </div>
    </BottomSheet>
  );
}

// "42 min · 118 avg bpm · 34 active min". Parts with nothing are left off.
function statsLine(w: Workout): string {
  const parts: string[] = [];
  if (w.minutes) parts.push(`${w.minutes} min`);
  if (w.hr?.avgBpm) parts.push(`${w.hr.avgBpm} avg bpm`);
  if (w.hr) parts.push(`${w.hr.activeMinutes} active min${w.hr.basis === 'said-so' ? ', you said so' : ''}`);
  return parts.join(' · ');
}

function WorkoutBox({ w, onOpen }: { w: Workout; onOpen: () => void }) {
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const typeLabel = RING_LABEL[w.type];
  const sameName = w.name.toLowerCase() === typeLabel.toLowerCase();
  const stats = statsLine(w);

  async function changeTo(t: TrainingType) {
    if (busy || t === w.type) return;
    setBusy(true);
    try {
      await reclassifyTo({ kind: w.kind, id: w.id, date: w.date, minutes: w.minutes ?? 0 }, t);
      showToast(`Counted as ${RING_LABEL[t]}`);
    } catch (e) {
      console.error('Change type failed:', e);
    } finally {
      setBusy(false);
      setChanging(false);
    }
  }

  return (
    <div className="tile rounded-input px-3 py-2.5">
      <button type="button" onClick={onOpen} className="w-full flex items-baseline justify-between gap-2 text-left">
        <span className="text-body font-bold text-ink min-w-0">
          {w.name}
          {!sameName && <span className="font-medium text-muted text-label"> · {typeLabel}</span>}
          {!w.complete && !w.fromWatch && <span className="font-medium text-muted text-label"> · In progress</span>}
        </span>
        <span className="text-label font-semibold text-muted whitespace-nowrap">
          {w.time ? `${clockLabel(w.time)} ›` : '›'}
        </span>
      </button>

      {w.exercises.length > 0 ? (
        <p className="text-label text-ink mt-0.5">
          {expanded || w.exercises.length <= 3 ? w.exercises.join(', ') : w.exercises.slice(0, 3).join(', ')}{' '}
          {w.exercises.length > 3 && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="font-bold text-green-700 whitespace-nowrap"
            >
              {expanded ? 'Show less' : `+ ${w.exercises.length - 3} more`}
            </button>
          )}
        </p>
      ) : w.distance ? (
        <p className="text-label text-ink mt-0.5">{w.distance}</p>
      ) : null}

      {stats && <p className="text-label text-muted mt-1 tabular-nums">{stats}</p>}

      {w.fromWatch && (
        <>
          <p className="text-label text-hint mt-1">
            From Apple Watch ·{' '}
            <button type="button" onClick={() => setChanging((c) => !c)} className="font-bold text-green-700">
              Change type
            </button>
          </p>
          {changing && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {CHANGE_TO.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={busy}
                  onClick={() => void changeTo(t)}
                  className={`pill py-1 ${t === w.type ? 'pill-on' : ''}`}
                >
                  {RING_LABEL[t]}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
