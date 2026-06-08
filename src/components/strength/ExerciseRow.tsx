import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { SessionExercise } from '../../db/types';
import {
  addSet,
  getPreviousSessionForExercise,
  removeExerciseFromSession,
  updateSessionExerciseNotes,
} from '../../lib/strengthHelpers';
import { relativeDateLabel } from '../../lib/dateHelpers';
import { formatSetMagnitude } from '../../lib/setFormat';
import SetRow from './SetRow';

export default function ExerciseRow({ link }: { link: SessionExercise }) {
  const [confirming, setConfirming] = useState(false);
  const exercise = useLiveQuery(
    () => db.exercises.get(link.exercise_id),
    [link.exercise_id],
  );
  const sets = useLiveQuery(
    () => db.sets.where('session_exercise_id').equals(link.id).sortBy('created_at'),
    [link.id],
    [],
  );
  const previous = useLiveQuery(
    () => getPreviousSessionForExercise(link.exercise_id, link.session_id),
    [link.exercise_id, link.session_id],
    null,
  );

  async function handleAddSet() {
    // Copies the most recent set in the current exercise; if none, falls back
    // to last-session's top set so a brand-new exercise still pre-fills with
    // the user's prior weight/reps as a starting point. set_type and the
    // matching magnitude (reps or duration_seconds) carry over so a
    // timed-effort exercise keeps logging in the same mode.
    const last = sets[sets.length - 1];
    if (last) {
      await addSet(link.id, last.weight, last.reps, {
        set_type: last.set_type,
        duration_seconds: last.duration_seconds,
      });
      return;
    }
    const prevTop = previous?.sets[previous.sets.length - 1];
    await addSet(link.id, prevTop?.weight ?? 0, prevTop?.reps ?? 0, {
      set_type: prevTop?.set_type ?? 'reps',
      duration_seconds: prevTop?.duration_seconds ?? null,
    });
  }

  if (!exercise) return null;

  return (
    <div
      className="bg-card border border-card-edge rounded-xl p-3 mt-2"
      style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-[15px] font-medium text-ink truncate">
            {exercise.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] tracking-micro uppercase text-green-mint font-semibold">
            {exercise.muscle_group.replace('_', ' ')}
          </span>
          {/* Remove the whole exercise + its sets. Distinct from the
              per-set × in SetRow; pinned at the header so the action
              and its target are visually grouped. */}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${exercise.name}`}
            className="text-card-mute text-[18px] w-8 h-8 flex items-center justify-center -mr-1"
          >
            ×
          </button>
        </div>
      </div>
      {confirming && (
        <div className="mt-2 px-3 py-2 bg-charcoal rounded-lg border border-card-edge">
          <p className="text-[12px] text-ink leading-snug">
            Remove {exercise.name} and all its sets?
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 bg-card border border-card-edge text-ink rounded-md py-2 text-[11px] font-semibold uppercase tracking-micro min-h-[36px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void removeExerciseFromSession(link.id);
              }}
              style={{ background: '#7a2222' }}
              className="flex-1 text-white rounded-md py-2 text-[11px] font-semibold uppercase tracking-micro min-h-[36px]"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {previous && previous.sets.length > 0 && (
        <div className="mt-2 px-3 py-2 bg-charcoal rounded-lg">
          <p className="text-[10px] tracking-micro uppercase text-card-mute font-semibold">
            Last · {relativeDateLabel(previous.date)} · {previous.sets.length} set
            {previous.sets.length === 1 ? '' : 's'}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {previous.sets.map((s) => (
              <span key={s.id} className="text-[12px]">
                <span className="text-ink-body font-medium">{s.weight}</span>
                <span className="text-card-mute">×{formatSetMagnitude(s)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-1 divide-y divide-divider">
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s} setNumber={i + 1} />
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddSet}
        className="mt-2 w-full bg-charcoal text-card-mute rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-micro border border-card-edge min-h-[44px]"
      >
        + Add Set
      </button>

      <NoteField sessionExerciseId={link.id} notes={link.notes} />
    </div>
  );
}

// Per-exercise free-form note. Collapsed by default ("Add note"); opens
// expanded if a note is already saved so the user sees the existing
// text on entry. Saves on blur via syncedUpdate — no per-keystroke
// writes. Clearing the field on blur stores null so the collapsed
// affordance returns next time.
function NoteField({
  sessionExerciseId,
  notes,
}: {
  sessionExerciseId: string;
  notes: string | null;
}) {
  const [expanded, setExpanded] = useState<boolean>(Boolean(notes));
  const [draft, setDraft] = useState<string>(notes ?? '');

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 w-full text-left text-[12px] text-green-mint font-medium py-1.5"
      >
        Add note
      </button>
    );
  }

  return (
    <input
      type="text"
      autoFocus={!notes}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const trimmed = draft.trim();
        const next = trimmed === '' ? null : trimmed;
        if (next !== (notes ?? null)) {
          void updateSessionExerciseNotes(sessionExerciseId, next);
        }
        if (next === null) setExpanded(false);
      }}
      placeholder="Note for this exercise"
      aria-label="Exercise note"
      className="mt-2 w-full bg-charcoal border border-card-edge text-ink rounded-lg px-3 py-2 text-[16px] placeholder:text-card-mute"
    />
  );
}
