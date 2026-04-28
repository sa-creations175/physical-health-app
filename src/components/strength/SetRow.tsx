import { useState } from 'react';
import type { SetEntry } from '../../db/types';
import { updateSet, deleteSet } from '../../lib/strengthHelpers';

export default function SetRow({
  set,
  setNumber,
}: {
  set: SetEntry;
  setNumber: number;
}) {
  const [weight, setWeight] = useState(set.weight === 0 ? '' : String(set.weight));
  const [reps, setReps] = useState(set.reps === 0 ? '' : String(set.reps));

  async function commitWeight() {
    const w = weight.trim() === '' ? 0 : parseFloat(weight);
    if (!isNaN(w) && w !== set.weight) {
      await updateSet(set.id, { weight: w });
    }
  }

  async function commitReps() {
    const r = reps.trim() === '' ? 0 : parseInt(reps, 10);
    if (!isNaN(r) && r !== set.reps) {
      await updateSet(set.id, { reps: r });
    }
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="text-[11px] text-card-mute w-5 text-center font-medium">
        {setNumber}
      </span>
      <input
        type="number"
        inputMode="decimal"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={commitWeight}
        placeholder="lb"
        aria-label="Weight"
        className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[68px] h-11 text-[16px] text-center"
      />
      <span className="text-[12px] text-card-mute">×</span>
      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={commitReps}
        placeholder="reps"
        aria-label="Reps"
        className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[60px] h-11 text-[16px] text-center"
      />
      <button
        type="button"
        onClick={() => updateSet(set.id, { completed: !set.completed })}
        aria-label={set.completed ? 'Mark not done' : 'Mark done'}
        className={`ml-auto rounded-full w-9 h-9 flex items-center justify-center text-[14px] transition-colors ${
          set.completed
            ? 'bg-green-deep text-green-light'
            : 'bg-charcoal text-card-mute border border-card-edge'
        }`}
      >
        {set.completed ? '✓' : '○'}
      </button>
      <button
        type="button"
        onClick={() => deleteSet(set.id)}
        aria-label="Delete set"
        className="text-card-mute text-[20px] w-9 h-9 flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}
