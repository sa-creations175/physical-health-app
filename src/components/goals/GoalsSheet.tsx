import { useState } from 'react';
import { Check, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import {
  draftsFrom,
  saveGoals,
  standardDrafts,
  standardFor,
  type GoalDraft,
} from '../../lib/goals';
import type { BodyGoal, GoalPeriod } from '../../db/types';

const COPY: Record<GoalPeriod, { eyebrow: string; title: string; body: string; per: string; saved: string }> = {
  week: {
    eyebrow: 'Fitness Score',
    title: 'Your weekly goals',
    body: 'These are yours. Rename, change the count, remove, or add your own. The score is the average across whatever is here.',
    per: 'a week',
    saved: 'Weekly goals saved',
  },
  day: {
    eyebrow: 'Average Per Day',
    title: 'Your daily goals',
    body: "The number you're aiming at each day. Under it, the small bar marks a miss; at or past it, it fills. Untick one to keep the number but drop the goal.",
    per: 'a day',
    saved: 'Daily goals saved',
  },
};

// Edit a period's goals: rename, change the target, remove, add your own, or
// reset to the Life Coaching standard. Nothing is written until "Save goals".
export default function GoalsSheet({
  period,
  goals,
  onClose,
}: {
  period: GoalPeriod;
  goals: BodyGoal[];
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const copy = COPY[period];
  const [drafts, setDrafts] = useState<GoalDraft[]>(() => draftsFrom(goals));
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('1');
  const [saving, setSaving] = useState(false);

  const patch = (i: number, change: Partial<GoalDraft>) =>
    setDrafts((d) => d.map((g, j) => (j === i ? { ...g, ...change } : g)));

  function add() {
    const name = newName.trim();
    const target = parseFloat(newTarget);
    if (!name || !(target > 0)) return;
    setDrafts((d) => [
      ...d,
      { name, metric: null, target, unit: period === 'week' ? 'times' : 'times', active: true },
    ]);
    setNewName('');
    setNewTarget('1');
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    await saveGoals(period, drafts);
    showToast(copy.saved);
    onClose();
  }

  const standardLine = standardFor(period)
    .map((g) => (period === 'week' ? `${g.name} ${g.target}` : g.target.toLocaleString()))
    .join(period === 'week' ? ', ' : ' · ');

  return (
    <BottomSheet onClose={onClose} label={copy.title}>
      <p className="eyebrow pr-10">{copy.eyebrow}</p>
      <h2 className="text-heading text-ink mt-0.5">{copy.title}</h2>
      <p className="text-label text-muted mt-1 leading-snug">{copy.body}</p>

      <div className="mt-2">
        {drafts.map((g, i) => (
          <div key={g.id ?? `new-${i}`} className="flex items-center gap-2 py-2 border-b border-hairline">
            {period === 'day' && (
              <button
                type="button"
                role="checkbox"
                aria-checked={g.active}
                aria-label={`${g.name} is a goal`}
                onClick={() => patch(i, { active: !g.active })}
                className="w-9 h-11 flex items-center justify-center shrink-0 -ml-1"
              >
                <span
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                    g.active ? 'bg-green-700 border-green-700 text-white' : 'border-green-300 text-transparent'
                  }`}
                >
                  <Check aria-hidden="true" size={13} strokeWidth={3} />
                </span>
              </button>
            )}
            <input
              type="text"
              value={g.name}
              onChange={(e) => patch(i, { name: e.target.value })}
              aria-label="Goal name"
              className="flex-1 min-w-0 bg-transparent text-input text-ink border-0 border-b border-dashed border-hairline py-1 focus:outline-none"
            />
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={Number.isFinite(g.target) ? String(g.target) : ''}
              onChange={(e) => patch(i, { target: parseFloat(e.target.value) })}
              aria-label={`${g.name} target ${copy.per}`}
              className={`input h-10 px-2 text-right ${period === 'day' ? 'w-[84px]' : 'w-[60px]'}`}
            />
            <span className="text-label text-hint shrink-0 w-11">{copy.per}</span>
            <button
              type="button"
              onClick={() => setDrafts((d) => d.filter((_, j) => j !== i))}
              aria-label={`Remove ${g.name}`}
              className="w-8 h-11 flex items-center justify-center text-hint shrink-0"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={period === 'week' ? 'Add a goal, e.g. Swim' : 'Add a goal'}
          aria-label="New goal name"
          className="input flex-1 min-w-0 h-11"
        />
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={newTarget}
          onChange={(e) => setNewTarget(e.target.value)}
          aria-label="New goal target"
          className="input w-[64px] h-11 px-2 text-right"
        />
        <button type="button" onClick={add} className="pill pill-soft min-h-[44px]">
          Add
        </button>
      </div>

      <p className="text-label text-hint mt-3 leading-snug">
        <button
          type="button"
          onClick={() => setDrafts(standardDrafts(period))}
          className="font-bold text-green-700"
        >
          Reset to the Life Coaching standard
        </button>{' '}
        · {standardLine}
      </p>

      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full mt-4">
        Save goals
      </button>
      <button type="button" onClick={onClose} className="btn-secondary w-full mt-2">
        Cancel
      </button>
    </BottomSheet>
  );
}
