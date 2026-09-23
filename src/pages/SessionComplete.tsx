import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { completeSession, updateSessionDate } from '../lib/strengthHelpers';
import { SectionLabel } from '../components/ui/primitives';
import DateBlock from '../components/ui/DateBlock';
import type { FeelRating } from '../db/types';
import HeaderStrip from '../components/ui/HeaderStrip';

const FEEL_OPTIONS: {
  value: FeelRating;
  label: string;
  description: string;
}[] = [
  { value: 'flying', label: 'Flying', description: 'Light, strong, in the zone' },
  { value: 'cruising', label: 'Cruising', description: 'Steady, productive, fine' },
  { value: 'crawling', label: 'Crawling', description: 'Heavy legs, slow, off' },
];

const TYPE_LABEL: Record<string, string> = {
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
};

export default function SessionComplete() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [feel, setFeel] = useState<FeelRating | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const session = useLiveQuery(
    () => (sessionId ? db.sessions.get(sessionId) : undefined),
    [sessionId],
  );
  const sessionExercises = useLiveQuery(
    () =>
      sessionId
        ? db.session_exercises.where('session_id').equals(sessionId).toArray()
        : [],
    [sessionId],
    [],
  );
  const allSets = useLiveQuery(
    async () => {
      if (!sessionId) return [];
      const links = await db.session_exercises
        .where('session_id')
        .equals(sessionId)
        .toArray();
      const ids = links.map((l) => l.id);
      if (ids.length === 0) return [];
      return await db.sets.where('session_exercise_id').anyOf(ids).toArray();
    },
    [sessionId],
    [],
  );

  // Notes joined with their exercise name for the summary "Notes" section.
  // Empty / null notes are filtered out so the section only mounts when
  // there's something to show.
  const noteRows = useLiveQuery(
    async () => {
      if (!sessionId) return [];
      const links = await db.session_exercises
        .where('session_id')
        .equals(sessionId)
        .sortBy('order_index');
      const withNotes = links.filter((l) => l.notes && l.notes.trim() !== '');
      if (withNotes.length === 0) return [];
      const exs = await db.exercises
        .where('id')
        .anyOf(withNotes.map((l) => l.exercise_id))
        .toArray();
      const nameById = new Map(exs.map((e) => [e.id, e.name]));
      return withNotes.map((l) => ({
        id: l.id,
        name: nameById.get(l.exercise_id) ?? 'Exercise',
        note: l.notes as string,
      }));
    },
    [sessionId],
    [],
  );

  const totalSets = allSets.length;
  // Volume is lb·reps — only rep-mode sets contribute. Duration sets are
  // counted in totalSets but excluded here; weight × seconds isn't a
  // meaningful comparable magnitude.
  const totalVolume = allSets.reduce(
    (sum, s) => (s.set_type === 'duration' ? sum : sum + s.weight * s.reps),
    0,
  );

  if (!session) {
    return (
      <div className="px-4 pt-8 text-muted text-label">Loading session…</div>
    );
  }

  async function handleSave() {
    if (!feel || !sessionId || saving) return;
    setSaving(true);
    try {
      await completeSession(sessionId, feel, notes);
      navigate('/');
    } catch (err) {
      console.error('Failed to save session:', err);
      setSaving(false);
    }
  }

  return (
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Session Summary"
        title="How'd It Go?"
        subtitle={TYPE_LABEL[session.type] ?? session.type}
      />
      <div className="px-4">

      <div
        className="card p-4 mt-4"
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="micro text-green-700">
              Exercises
            </p>
            <p className="text-title text-ink mt-1 leading-none">
              {sessionExercises.length}
            </p>
          </div>
          <div>
            <p className="micro text-green-700">
              Sets
            </p>
            <p className="text-title text-ink mt-1 leading-none">
              {totalSets}
            </p>
          </div>
          <div>
            <p className="micro text-green-700">
              Volume
            </p>
            <p className="text-title text-ink mt-1 leading-none">
              {Math.round(totalVolume).toLocaleString()}
            </p>
            <p className="text-label text-muted mt-0.5">lb·reps</p>
          </div>
        </div>
      </div>

      {noteRows.length > 0 && (
        <div className="mt-6">
          <SectionLabel>Exercise Notes</SectionLabel>
          <ul className="mt-2 card p-3 space-y-2">
            {noteRows.map((row) => (
              <li key={row.id} className="text-label leading-snug">
                <span className="text-ink font-medium">{row.name}</span>
                <span className="text-muted"> — {row.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <SectionLabel>Session Date</SectionLabel>
        <div className="mt-2">
          <DateBlock
            value={session.date}
            onChange={(next) => {
              if (next && next !== session.date) {
                void updateSessionDate(session.id, next);
              }
            }}
            label="Date"
            ariaLabel="Session date"
          />
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel>How Did It Feel?</SectionLabel>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {FEEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFeel(opt.value)}
              className={`card p-3 text-left min-h-[60px] transition-colors ${
                feel === opt.value ? 'border-green-700 bg-green-100' : ''
              }`}
            >
              <p className="text-body font-medium text-ink">{opt.label}</p>
              <p className="text-label text-muted mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel>Notes (Optional)</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember from this session?"
          className="input mt-2 w-full px-4 py-3 min-h-[80px] resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!feel || saving}
        className="btn-primary mt-6 w-full disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save session'}
      </button>
      </div>
    </div>
  );
}
