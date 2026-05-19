import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import ExerciseRow from '../components/strength/ExerciseRow';
import ExercisePicker from '../components/strength/ExercisePicker';
import { SectionLabel } from '../components/ui/primitives';
import { dateLabel } from '../lib/dateHelpers';
import { discardSession } from '../lib/strengthHelpers';

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

  if (!session) {
    return (
      <div className="px-5 pt-8 text-card-mute text-[12px]">Loading session…</div>
    );
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
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Active Session</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">
        {TYPE_LABEL[session.type] ?? session.type}
      </h1>
      <p className="text-[12px] text-ink-soft mt-1">
        {dateLabel(new Date(session.date + 'T00:00:00'))}
      </p>

      <div className="mt-4">
        {sessionExercises.length === 0 ? (
          <div className="bg-card border border-card-edge rounded-xl p-5 text-card-mute text-[13px] text-center">
            No exercises yet — tap below to add the first one.
          </div>
        ) : (
          sessionExercises.map((link) => (
            <ExerciseRow key={link.id} link={link} />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
        className="mt-3 w-full bg-card border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
      >
        + Add Exercise
      </button>

      {sessionExercises.length > 0 && (
        <button
          type="button"
          onClick={() => navigate(`/log/strength/complete/${sessionId}`)}
          className="mt-3 w-full bg-green-deep text-ink rounded-xl py-3.5 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
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
          className="text-[12px] text-card-mute underline decoration-dotted underline-offset-4 min-h-[44px]"
        >
          Discard session
        </button>
      </div>

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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="bg-card border border-card-edge rounded-2xl p-5 w-full max-w-md mb-6"
        role="dialog"
        aria-modal="true"
      >
        <p className="text-[14px] text-ink leading-snug">
          Discard this session? This can't be undone.
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 bg-charcoal border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{ background: '#7a2222' }}
            className="flex-1 text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
          >
            {busy ? 'Discarding…' : 'Discard'}
          </button>
        </div>
      </div>
    </div>
  );
}
