import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import ExerciseRow from '../components/strength/ExerciseRow';
import ExercisePicker from '../components/strength/ExercisePicker';
import HeaderStrip from '../components/ui/HeaderStrip';
import BottomSheet from '../components/ui/BottomSheet';
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from 'lucide-react';
import DateBlock from '../components/ui/DateBlock';
import {
  discardSession,
  reorderSessionExercises,
  updateSessionDate,
} from '../lib/strengthHelpers';
import type { SessionExercise } from '../db/types';

const TYPE_LABEL: Record<string, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
};

export default function ActiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  );
  const sessionExercises = useLiveQuery(
    () =>
      sessionId
        ? db.session_exercises
            .where('session_id')
            .equals(sessionId)
            .sortBy('order_index')
        : [],
    [sessionId],
    [],
  );

  // Optimistic local ordering for the reorder controls. After an arrow move
  // we render from this override so the reorder feels instant; it's cleared
  // once the live query catches up with the persisted order.
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  // Reorder mode: exercises collapse to compact name-only rows with up/down
  // arrows (replaces the old iOS-unfriendly drag-and-drop). Sets are hidden
  // while reordering and expand back on exit.
  const [reordering, setReordering] = useState(false);

  // Clear the override as soon as the live query's persisted order
  // matches it — at that point the live data IS the new truth and the
  // override would just paper over future external changes (e.g. a
  // delete from elsewhere).
  useEffect(() => {
    if (!orderOverride) return;
    const liveIds = sessionExercises.map((l) => l.id);
    const matches =
      liveIds.length === orderOverride.length &&
      liveIds.every((id, i) => id === orderOverride[i]);
    if (matches) setOrderOverride(null);
  }, [sessionExercises, orderOverride]);

  const orderedExercises = applyOrderOverride(sessionExercises, orderOverride);

  if (!session) {
    return (
      <div className="px-4 pt-8 text-muted text-label">Loading session…</div>
    );
  }

  // Move one exercise up (dir -1) or down (dir +1) by swapping with its
  // neighbor. Updates the optimistic override immediately, then persists the
  // new order; on a write failure we drop the override so the UI snaps back to
  // Dexie's truth.
  function move(id: string, dir: -1 | 1) {
    const order = orderedExercises.map((l) => l.id);
    const from = order.indexOf(id);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= order.length) return;
    const next = order.slice();
    [next[from], next[to]] = [next[to], next[from]];
    setOrderOverride(next);
    reorderSessionExercises(next, sessionExercises).catch((err) => {
      console.error('Failed to persist reorder:', err);
      setOrderOverride(null);
    });
  }

  async function handleDiscard() {
    if (!sessionId || discarding) return;
    setDiscarding(true);
    try {
      await discardSession(sessionId);
      navigate('/log/strength');
    } catch (err) {
      console.error('Failed to discard session:', err);
      setDiscarding(false);
    }
  }

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Active Session"
        title={TYPE_LABEL[session.type] ?? session.type}
      />
      <div className="px-4">
      {/* Editable session date — retro-logging or correcting a draft started
          on the wrong day. Persists immediately via updateSessionDate. */}
      <div className="mt-4">
        <DateBlock
          value={session.date}
          onChange={(d) => updateSessionDate(session.id, d)}
          label="Session date"
          ariaLabel="Session date"
        />
      </div>

      {/* Reorder toggle — only worth showing with more than one exercise. */}
      {orderedExercises.length > 1 && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setReordering((r) => !r)}
            aria-pressed={reordering}
            className={`pill min-h-[44px] ${reordering ? 'pill-on' : ''}`}
          >
            {reordering ? (
              <>
                <Check aria-hidden="true" size={14} strokeWidth={2.5} /> Done
              </>
            ) : (
              <>
                <ArrowUpDown aria-hidden="true" size={14} strokeWidth={2} /> Reorder
              </>
            )}
          </button>
        </div>
      )}

      <div className={orderedExercises.length > 1 ? 'mt-2' : 'mt-4'}>
        {orderedExercises.length === 0 ? (
          <div className="card p-5 text-muted text-label text-center">
            No exercises yet — tap below to add the first one.
          </div>
        ) : reordering ? (
          orderedExercises.map((link, i) => (
            <CompactExerciseRow
              key={link.id}
              link={link}
              isFirst={i === 0}
              isLast={i === orderedExercises.length - 1}
              onMoveUp={() => move(link.id, -1)}
              onMoveDown={() => move(link.id, 1)}
            />
          ))
        ) : (
          orderedExercises.map((link) => <ExerciseRow key={link.id} link={link} />)
        )}
      </div>

      {/* In reorder mode the editing actions are hidden to keep the list short
          and the whole order in view; everything returns on exit. */}
      {!reordering && (
        <>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="btn-secondary mt-3 w-full"
          >
            + Add Exercise
          </button>

          {sessionExercises.length > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/log/strength/complete/${sessionId}`)}
              className="btn-primary mt-3 w-full"
            >
              Finish Session
            </button>
          )}

          {/* Discard link — destructive but quiet. Sits below the primary
              actions so a thumb resting near the save area can't trigger
              it. Confirm dialog gates the actual delete. */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="text-label text-muted underline decoration-dotted underline-offset-4 min-h-[44px]"
            >
              Discard session
            </button>
          </div>
        </>
      )}

      {pickerOpen && (
        <ExercisePicker
          sessionId={session.id}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {confirmDiscard && (
        <DiscardConfirm
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={handleDiscard}
          busy={discarding}
        />
      )}
      </div>
    </div>
  );
}

// Re-order `links` to match `override` (a list of ids in the desired
// order). Falls back to the raw list when override is null or doesn't
// cover the current set — e.g. a row was added or deleted while the
// override was still mid-flight.
function applyOrderOverride(
  links: SessionExercise[],
  override: string[] | null,
): SessionExercise[] {
  if (!override) return links;
  const byId = new Map(links.map((l) => [l.id, l]));
  if (
    override.length !== links.length ||
    override.some((id) => !byId.has(id))
  ) {
    return links;
  }
  return override.map((id) => byId.get(id) as SessionExercise);
}

// Compact, name-only row shown in reorder mode — sets hidden, with up/down
// arrows (reliable on iOS where drag-and-drop was fiddly). A muted set count
// stays for orientation without expanding the row.
function CompactExerciseRow({
  link,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  link: SessionExercise;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const exercise = useLiveQuery(
    () => db.exercises.get(link.exercise_id),
    [link.exercise_id],
  );
  const setCount =
    useLiveQuery(
      () => db.sets.where('session_exercise_id').equals(link.id).count(),
      [link.id],
      0,
    ) ?? 0;

  if (!exercise) return null;

  const arrow =
    'btn-secondary w-11 h-11 px-0 py-0 disabled:opacity-30';

  return (
    <div className="card px-3 py-2 mt-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-heading text-ink truncate">
          {exercise.name}
        </h3>
        <p className="text-label text-muted">
          {setCount} set{setCount === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          aria-label={`Move ${exercise.name} up`}
          className={arrow}
        >
          <ArrowUp size={18} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          aria-label={`Move ${exercise.name} down`}
          className={arrow}
        >
          <ArrowDown size={18} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function DiscardConfirm({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <BottomSheet onClose={onCancel} label="Discard session">
        <p className="text-body text-ink leading-snug pr-10">
          Discard this session? This can't be undone.
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            {busy ? 'Discarding…' : 'Discard'}
          </button>
        </div>
    </BottomSheet>
  );
}
