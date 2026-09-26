import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import BottomSheet from '../ui/BottomSheet';
import { createNewExercise } from '../../lib/strengthHelpers';
import { useRingNames } from '../../lib/useGoalNames';
import {
  getTopCandidates,
  type Candidate,
} from '../../lib/sessionPlans';
import type { Exercise, MuscleGroup, Session, StrengthType } from '../../db/types';

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'full_body',
];

// One sheet for "+ Add an exercise" and "Swap exercise". Leads with the top
// candidates for the session type, then every other exercise A to Z. Exercises
// already in today's session aren't offered.
export default function ExerciseSheet({
  mode,
  session,
  type,
  swapName,
  inSession,
  onPick,
  onClose,
}: {
  mode: 'add' | 'swap';
  session: Session;
  type: StrengthType;
  swapName?: string;
  inSession: string[]; // exercise ids already in today's instance
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
}) {
  const typeLabel = useRingNames()[type].heading;
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], []);
  const candidates = useLiveQuery(
    () => getTopCandidates(type, session, inSession),
    [type, session.id, inSession.join(',')],
    [] as Candidate[],
  );

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const candidateIds = new Set(candidates.map((c) => c.exerciseId));
  const term = search.trim().toLowerCase();
  const rest = exercises.filter(
    (e) =>
      !inSession.includes(e.id) &&
      !candidateIds.has(e.id) &&
      (!term || e.name.toLowerCase().includes(term)),
  );

  return (
    <BottomSheet
      onClose={onClose}
      label={mode === 'add' ? 'Add an exercise' : `Swap out ${swapName}`}
    >
      <h2 className="text-heading text-ink pr-10">
        {mode === 'add' ? 'Add an exercise' : `Swap out ${swapName}`}
      </h2>
      <p className="text-label text-muted mt-0.5">
        {mode === 'add'
          ? `Added to today only. ${typeLabel} keeps its usual list.`
          : `Just for today. Next ${typeLabel} opens with the usual list.`}
      </p>

      {creating ? (
        <NewExerciseForm
          initialName={search}
          onBack={() => setCreating(false)}
          onCreated={(ex) => onPick(ex)}
        />
      ) : (
        <>
          {candidates.length > 0 && !term && (
            <>
              <p className="micro text-green-500 mt-4 mb-1">Top Candidates for {typeLabel}</p>
              {candidates.map((c) => {
                const ex = byId.get(c.exerciseId);
                if (!ex) return null;
                return (
                  <OptionRow key={c.exerciseId} usual onClick={() => onPick(ex)}>
                    <span>{ex.name}</span>
                    <span className="text-label text-muted">
                      {c.count} of your last {c.of}
                    </span>
                  </OptionRow>
                );
              })}
            </>
          )}

          <p className="micro text-green-500 mt-4 mb-1">All Exercises</p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises"
            aria-label="Search exercises"
            className="input w-full h-11 mb-1"
          />
          {rest.map((ex) => (
            <OptionRow key={ex.id} onClick={() => onPick(ex)}>
              <span>{ex.name}</span>
            </OptionRow>
          ))}
          {rest.length === 0 && (
            <p className="text-label text-muted py-3">No matches.</p>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-2 text-label font-bold text-green-700 min-h-[44px]"
          >
            + New exercise
          </button>
        </>
      )}
    </BottomSheet>
  );
}

function OptionRow({
  children,
  usual = false,
  onClick,
}: {
  children: React.ReactNode;
  usual?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 min-h-[44px] py-2.5 text-left text-body text-ink border-b ${
        usual ? 'bg-green-100 -mx-4 px-4 w-[calc(100%+2rem)] border-white' : 'w-full border-hairline'
      }`}
    >
      {children}
    </button>
  );
}

function NewExerciseForm({
  initialName,
  onBack,
  onCreated,
}: {
  initialName: string;
  onBack: () => void;
  onCreated: (ex: Exercise) => void;
}) {
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup>('quads');
  const [compound, setCompound] = useState(false);
  const [busy, setBusy] = useState(false);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await createNewExercise(trimmed, group, compound);
      const ex = await db.exercises.get(id);
      if (ex) onCreated(ex);
    } catch (err) {
      console.error('Failed to create exercise:', err);
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <label className="block eyebrow">Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
        className="input w-full px-4 h-11 mt-2"
      />
      <label className="block eyebrow mt-4">Muscle Group</label>
      <select
        value={group}
        onChange={(e) => setGroup(e.target.value as MuscleGroup)}
        className="input w-full px-4 h-11 mt-2"
      >
        {MUSCLE_GROUPS.map((g) => (
          <option key={g} value={g}>
            {g.replace('_', ' ')}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-3 mt-4 text-body text-ink">
        <input
          type="checkbox"
          checked={compound}
          onChange={(e) => setCompound(e.target.checked)}
          className="w-5 h-5 accent-green-700"
        />
        Compound lift
      </label>
      <div className="flex gap-2 mt-5">
        <button type="button" onClick={onBack} className="btn-secondary flex-1">
          Back
        </button>
        <button
          type="button"
          onClick={create}
          disabled={!name.trim() || busy}
          className="btn-primary flex-1"
        >
          Create &amp; pick
        </button>
      </div>
    </div>
  );
}
