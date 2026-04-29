import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import ExerciseRow from '../components/strength/ExerciseRow';
import ExercisePicker from '../components/strength/ExercisePicker';
import { SectionLabel } from '../components/ui/primitives';
import { dateLabel } from '../lib/dateHelpers';

const TYPE_LABEL: Record<string, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
};

export default function ActiveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);

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

      {pickerOpen && (
        <ExercisePicker
          sessionId={session.id}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
