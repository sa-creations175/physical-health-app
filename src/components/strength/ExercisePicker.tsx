import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  addExerciseToSession,
  createNewExercise,
} from '../../lib/strengthHelpers';
import type { MuscleGroup } from '../../db/types';

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

export default function ExercisePicker({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<MuscleGroup>('chest');
  const [newCompound, setNewCompound] = useState(false);
  const [busy, setBusy] = useState(false);

  const exercises = useLiveQuery(
    () => db.exercises.orderBy('name').toArray(),
    [],
    [],
  );

  const term = search.trim().toLowerCase();
  const filtered = term
    ? exercises.filter((e) => e.name.toLowerCase().includes(term))
    : exercises;

  async function handlePick(exerciseId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await addExerciseToSession(sessionId, exerciseId);
      onClose();
    } catch (err) {
      console.error('Failed to add exercise:', err);
      setBusy(false);
    }
  }

  async function handleCreateNew() {
    const trimmed = newName.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const id = await createNewExercise(trimmed, newGroup, newCompound);
      await addExerciseToSession(sessionId, id);
      onClose();
    } catch (err) {
      console.error('Failed to create exercise:', err);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-charcoal z-50 flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h2 className="text-[19px] font-medium text-ink">
          {adding ? 'New Exercise' : 'Add Exercise'}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-soft text-[28px] w-11 h-11 flex items-center justify-center"
        >
          ×
        </button>
      </header>

      {!adding ? (
        <>
          <div className="px-5">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px]"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-5 mt-3 pb-3">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => handlePick(e.id)}
                disabled={busy}
                style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
                className="w-full bg-card border border-card-edge rounded-xl p-3 mt-2 flex items-center justify-between text-left disabled:opacity-50 min-h-[48px]"
              >
                <span className="text-[14px] text-ink">{e.name}</span>
                <span className="text-[10px] tracking-micro uppercase text-card-mute whitespace-nowrap">
                  {e.muscle_group.replace('_', ' ')}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-card-mute text-[13px] text-center mt-6">
                No matches. Add it below.
              </p>
            )}
          </div>
          <div
            className="px-5 py-3 border-t border-divider"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setNewName(search);
              }}
              className="w-full bg-charcoal text-green-mint border border-green-deep rounded-xl py-3 text-[13px] font-semibold uppercase tracking-micro min-h-[48px]"
            >
              + Add new exercise
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 px-5 overflow-y-auto pb-6">
          <label className="block text-[11px] tracking-micro uppercase text-green-mint font-semibold">
            Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px] mt-2"
          />
          <label className="block text-[11px] tracking-micro uppercase text-green-mint font-semibold mt-4">
            Muscle group
          </label>
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
            className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px] mt-2"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g.replace('_', ' ')}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-3 mt-5 text-[14px] text-ink">
            <input
              type="checkbox"
              checked={newCompound}
              onChange={(e) => setNewCompound(e.target.checked)}
              className="w-5 h-5 accent-green-deep"
            />
            Compound lift
          </label>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 bg-card border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newName.trim() || busy}
              className="flex-1 bg-green-deep text-white rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
            >
              Create &amp; Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
