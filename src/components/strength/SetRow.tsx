import { useEffect, useState } from 'react';
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
  const [duration, setDuration] = useState(
    set.duration_seconds && set.duration_seconds > 0 ? String(set.duration_seconds) : '',
  );

  // Keep local inputs in sync when the underlying row changes type — e.g. the
  // user toggles reps↔duration and the other field's stored value updates.
  useEffect(() => {
    setReps(set.reps === 0 ? '' : String(set.reps));
    setDuration(
      set.duration_seconds && set.duration_seconds > 0 ? String(set.duration_seconds) : '',
    );
  }, [set.set_type, set.reps, set.duration_seconds]);

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

  async function commitDuration() {
    const d = duration.trim() === '' ? 0 : parseInt(duration, 10);
    if (!isNaN(d) && d !== (set.duration_seconds ?? 0)) {
      await updateSet(set.id, { duration_seconds: d });
    }
  }

  async function toggleType() {
    const next = set.set_type === 'reps' ? 'duration' : 'reps';
    await updateSet(set.id, { set_type: next });
  }

  const isDuration = set.set_type === 'duration';

  return (
    <div className="flex items-center gap-1.5 py-2">
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
        className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[60px] h-11 text-[16px] text-center"
      />
      <span className="text-[12px] text-card-mute">×</span>
      {isDuration ? (
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          onBlur={commitDuration}
          placeholder="sec"
          aria-label="Duration in seconds"
          className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[56px] h-11 text-[16px] text-center"
        />
      ) : (
        <input
          type="number"
          inputMode="numeric"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={commitReps}
          placeholder="reps"
          aria-label="Reps"
          className="bg-charcoal border border-card-edge text-ink rounded-lg px-2 w-[56px] h-11 text-[16px] text-center"
        />
      )}
      <button
        type="button"
        onClick={toggleType}
        aria-label={isDuration ? 'Switch to reps' : 'Switch to duration'}
        className="text-[9px] tracking-micro uppercase text-card-mute font-semibold w-11 h-11 flex items-center justify-center"
      >
        {isDuration ? 'sec' : 'reps'}
      </button>
      <button
        type="button"
        onClick={() => updateSet(set.id, { completed: !set.completed })}
        aria-label={set.completed ? 'Mark not done' : 'Mark done'}
        className={`ml-auto rounded-full w-11 h-11 flex items-center justify-center text-[14px] transition-colors ${
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
        className="text-card-mute text-[20px] w-11 h-11 flex items-center justify-center"
      >
        ×
      </button>
    </div>
  );
}
