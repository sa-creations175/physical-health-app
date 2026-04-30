import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { completeSession } from '../lib/strengthHelpers';
import { SectionLabel } from '../components/ui/primitives';
import type { FeelRating } from '../db/types';

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
      <div className="px-5 pt-8 text-card-mute text-[12px]">Loading session…</div>
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
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Session Summary</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">How'd it go?</h1>
      <p className="text-[12px] text-ink-soft mt-1">
        {TYPE_LABEL[session.type] ?? session.type}
      </p>

      <div
        className="bg-card border border-card-edge rounded-xl p-4 mt-4"
        style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
      >
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] tracking-micro uppercase text-green-mint font-semibold">
              Exercises
            </p>
            <p className="text-[19px] font-medium text-ink mt-1 leading-none">
              {sessionExercises.length}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-micro uppercase text-green-mint font-semibold">
              Sets
            </p>
            <p className="text-[19px] font-medium text-ink mt-1 leading-none">
              {totalSets}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-micro uppercase text-green-mint font-semibold">
              Volume
            </p>
            <p className="text-[19px] font-medium text-ink mt-1 leading-none">
              {Math.round(totalVolume)}
            </p>
            <p className="text-[10px] text-card-mute mt-0.5">lb·reps</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel>How did it feel?</SectionLabel>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {FEEL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFeel(opt.value)}
              className={`bg-card border rounded-xl p-3 text-left min-h-[60px] transition-colors ${
                feel === opt.value ? 'border-green-mint' : 'border-card-edge'
              }`}
            >
              <p className="text-[15px] font-medium text-ink">{opt.label}</p>
              <p className="text-[11px] text-card-mute mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <SectionLabel>Notes (optional)</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to remember from this session?"
          className="mt-2 w-full bg-card border border-card-edge text-ink rounded-xl px-4 py-3 text-[16px] min-h-[80px] resize-none"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!feel || saving}
        className="mt-6 w-full bg-green-deep text-ink rounded-xl py-3.5 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Session'}
      </button>
    </div>
  );
}
