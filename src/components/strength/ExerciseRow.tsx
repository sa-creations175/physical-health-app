import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { SessionExercise } from '../../db/types';
import { addSet } from '../../lib/strengthHelpers';
import SetRow from './SetRow';

export default function ExerciseRow({ link }: { link: SessionExercise }) {
  const exercise = useLiveQuery(
    () => db.exercises.get(link.exercise_id),
    [link.exercise_id],
  );
  const sets = useLiveQuery(
    () => db.sets.where('session_exercise_id').equals(link.id).sortBy('created_at'),
    [link.id],
    [],
  );

  async function handleAddSet() {
    const last = sets[sets.length - 1];
    await addSet(link.id, last?.weight ?? 0, last?.reps ?? 0);
  }

  if (!exercise) return null;

  return (
    <div
      className="bg-card border border-card-edge rounded-xl p-3 mt-2"
      style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-medium text-ink">{exercise.name}</h3>
        <span className="text-[10px] tracking-micro uppercase text-green-mint font-semibold whitespace-nowrap">
          {exercise.muscle_group.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-1 divide-y divide-divider">
        {sets.map((s, i) => (
          <SetRow key={s.id} set={s} setNumber={i + 1} />
        ))}
      </div>
      <button
        type="button"
        onClick={handleAddSet}
        className="mt-2 w-full bg-charcoal text-card-mute rounded-lg py-2.5 text-[11px] font-semibold uppercase tracking-micro border border-card-edge"
      >
        + Add Set
      </button>
    </div>
  );
}
