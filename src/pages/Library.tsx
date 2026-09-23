import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import type { Exercise } from '../db/types';
import HeaderStrip from '../components/ui/HeaderStrip';

export default function Library() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

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
    <div className="pb-8">
      <HeaderStrip
        eyebrow="Exercise Library"
        title="Library"
        subtitle={<>{exercises.length} exercise{exercises.length === 1 ? '' : 's'} · tap for history</>}
      />
      <div className="px-4">

      <input
        type="text"
        placeholder="Search…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mt-4 w-full px-4 h-11"
      />

      <div className="mt-3">
        {filtered.length === 0 && (
          <p className="text-muted text-label text-center mt-6">
            {term ? 'No matches.' : 'Library is empty.'}
          </p>
        )}
        {filtered.map((e) => (
          <ExerciseListItem
            key={e.id}
            exercise={e}
            onTap={() => navigate(`/library/${e.id}`)}
          />
        ))}
      </div>
      </div>
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
      className="w-full card p-3 mt-2 flex items-center justify-between text-left gap-3 min-h-[48px]"
    >
      <div className="min-w-0">
        <p className="text-body text-ink truncate">{exercise.name}</p>
        {exercise.is_compound && (
          <p className="text-label text-muted mt-0.5 lowercase">
            compound
          </p>
        )}
      </div>
      <span className="micro text-muted whitespace-nowrap">
        {exercise.muscle_group.replace('_', ' ')}
      </span>
    </button>
  );
}
