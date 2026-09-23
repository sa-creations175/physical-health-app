import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  addExerciseToSession,
  createNewExercise,
} from '../../lib/strengthHelpers';
import type { MuscleGroup } from '../../db/types';
import HeaderStrip from '../ui/HeaderStrip';
import CloseButton from '../ui/CloseButton';

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
    <div className="fixed inset-0 bg-paper z-50 flex flex-col overflow-hidden">
      <HeaderStrip
        overlay
        eyebrow="Body · Log"
        title={adding ? 'New Exercise' : 'Add Exercise'}
        right={<CloseButton onClose={onClose} />}
      />
      <div className="h-3 shrink-0" />

      {!adding ? (
        <>
          <div className="px-4">
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full px-4 h-11"
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 mt-3 pb-3">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => handlePick(e.id)}
                disabled={busy}
                className="w-full card p-3 mt-2 flex items-center justify-between text-left disabled:opacity-50 min-h-[48px]"
              >
                <span className="text-body text-ink">{e.name}</span>
                <span className="micro text-muted whitespace-nowrap">
                  {e.muscle_group.replace('_', ' ')}
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-muted text-label text-center mt-6">
                No matches. Add it below.
              </p>
            )}
          </div>
          <div
            className="px-4 py-3 border-t border-hairline"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <button
              type="button"
              onClick={() => {
                setAdding(true);
                setNewName(search);
              }}
              className="btn-secondary w-full"
            >
              + Add new exercise
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 px-4 overflow-y-auto pb-6">
          <label className="block eyebrow">
            Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            className="input w-full px-4 h-11 mt-2"
          />
          <label className="block eyebrow mt-4">
            Muscle Group
          </label>
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
            className="input w-full px-4 h-11 mt-2"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g.replace('_', ' ')}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-3 mt-5 text-body text-ink">
            <input
              type="checkbox"
              checked={newCompound}
              onChange={(e) => setNewCompound(e.target.checked)}
              className="w-5 h-5 accent-green-700"
            />
            Compound lift
          </label>
          <div className="flex gap-2 mt-6">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateNew}
              disabled={!newName.trim() || busy}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Create &amp; add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
