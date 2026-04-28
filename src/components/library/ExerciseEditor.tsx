import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { syncedUpdate } from '../../db/syncedWrite';
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
      <div className="fixed inset-0 bg-charcoal z-50 flex items-center justify-center text-card-mute text-[12px]">
        Loading…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-charcoal z-50 flex flex-col">
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <h2 className="text-[19px] font-medium text-ink">Edit Exercise</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-ink-soft text-[28px] w-11 h-11 flex items-center justify-center"
        >
          ×
        </button>
      </header>

      <div className="flex-1 px-5 overflow-y-auto pb-6">
        <label className="block text-[11px] tracking-micro uppercase text-green-mint font-semibold">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px] mt-2"
        />

        <label className="block text-[11px] tracking-micro uppercase text-green-mint font-semibold mt-4">
          Muscle group
        </label>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value as MuscleGroup)}
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
            checked={compound}
            onChange={(e) => setCompound(e.target.checked)}
            className="w-5 h-5 accent-green-deep"
          />
          Compound lift
        </label>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-card border border-card-edge text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 bg-green-deep text-ink rounded-xl py-3 text-[13px] font-medium uppercase tracking-micro min-h-[48px] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
