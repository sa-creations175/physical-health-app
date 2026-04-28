import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { SectionLabel } from '../components/ui/primitives';
import ExerciseEditor from '../components/library/ExerciseEditor';
import type { Exercise } from '../db/types';

export default function Library() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const exercises = useLiveQuery(
    () => db.exercises.orderBy('name').toArray(),
    [],
    [],
  );

  const term = search.trim().toLowerCase();
  const filtered = term
    ? exercises.filter((e) => e.name.toLowerCase().includes(term))
    : exercises;

  return (
    <div className="px-5 pt-8 pb-8">
      <SectionLabel>Exercise Library</SectionLabel>
      <h1 className="text-[22px] font-medium text-ink mt-1">Library</h1>
      <p className="text-[12px] text-ink-soft mt-1">
        {exercises.length} exercise{exercises.length === 1 ? '' : 's'} · tap to edit
      </p>

      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4 w-full bg-card border border-card-edge text-ink rounded-xl px-4 h-11 text-[16px]"
      />

      <div className="mt-3">
        {filtered.length === 0 && (
          <p className="text-card-mute text-[13px] text-center mt-6">
            {term ? 'No matches.' : 'Library is empty.'}
          </p>
        )}
        {filtered.map((e) => (
          <ExerciseListItem
            key={e.id}
            exercise={e}
            onTap={() => setEditingId(e.id)}
          />
        ))}
      </div>

      {editingId && (
        <ExerciseEditor
          exerciseId={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

function ExerciseListItem({
  exercise,
  onTap,
}: {
  exercise: Exercise;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      style={{ borderLeftWidth: '2px', borderLeftColor: '#0F6E56' }}
      className="w-full bg-card border border-card-edge rounded-xl p-3 mt-2 flex items-center justify-between text-left gap-3"
    >
      <div className="min-w-0">
        <p className="text-[14px] text-ink truncate">{exercise.name}</p>
        {exercise.is_compound && (
          <p className="text-[10px] text-card-mute mt-0.5 lowercase tracking-micro">
            compound
          </p>
        )}
      </div>
      <span className="text-[10px] tracking-micro uppercase text-green-mint font-semibold whitespace-nowrap">
        {exercise.muscle_group.replace('_', ' ')}
      </span>
    </button>
  );
}
