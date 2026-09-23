import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { syncedUpdate } from '../../db/syncedWrite';
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

export default function ExerciseEditor({
  exerciseId,
  onClose,
}: {
  exerciseId: string;
  onClose: () => void;
}) {
  const exercise = useLiveQuery(
    () => db.exercises.get(exerciseId),
    [exerciseId],
  );
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [compound, setCompound] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (exercise && !hydrated) {
      setName(exercise.name);
      setGroup(exercise.muscle_group);
      setCompound(exercise.is_compound);
      setHydrated(true);
    }
  }, [exercise, hydrated]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await syncedUpdate(db.exercises, exerciseId, {
        name: trimmed,
        muscle_group: group,
        is_compound: compound,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save exercise:', err);
      setSaving(false);
    }
  }

  if (!exercise) {
    return (
      <div className="fixed inset-0 bg-paper z-50 flex items-center justify-center text-muted text-label">
        Loading…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-paper z-50 flex flex-col overflow-hidden">
      <HeaderStrip
        overlay
        eyebrow="Body · Library"
        title="Edit Exercise"
        right={<CloseButton onClose={onClose} />}
      />

      <div className="flex-1 px-4 pt-4 overflow-y-auto pb-6">
        <label className="block eyebrow">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input w-full px-4 h-11 mt-2"
        />

        <label className="block eyebrow mt-4">
          Muscle group
        </label>
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

        <label className="flex items-center gap-3 mt-5 text-body text-ink">
          <input
            type="checkbox"
            checked={compound}
            onChange={(e) => setCompound(e.target.checked)}
            className="w-5 h-5 accent-green-700"
          />
          Compound lift
        </label>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
