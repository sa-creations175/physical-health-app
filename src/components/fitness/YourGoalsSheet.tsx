import { useEffect, useRef, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import {
  HEALTH_STANDARD,
  draftsFrom,
  saveGoals,
  standardDrafts,
  standardFor,
  standardGoalId,
  type GoalDraft,
} from '../../lib/goals';
import type { BodyGoal, GoalMetric, GoalPeriod } from '../../db/types';

// "Your goals" (body-fitness-proto.html): every Moving my body goal in one
// sheet, grouped the way Fitness shows them, each with − and + steppers.
// Where a health standard exists it's shown under the goal, and a goal set
// below it says so. Nothing is written until "Save goals".

export type GoalsSection = 'daily' | 'sess' | 'reps' | 'rec' | 'still';

const GROUP_TITLE: Record<GoalsSection, string> = {
  daily: 'Daily movement',
  sess: 'Fitness score',
  reps: 'Quick reps',
  rec: 'Recovery',
  still: 'Still to place',
};

interface RowSpec {
  label: string;
  unit: string;
  step: number;
  standard?: number;
}

const ROW: Record<GoalMetric, RowSpec> = {
  calories: { label: 'Active calories', unit: 'a day', step: 25 },
  steps: { label: 'Steps', unit: 'a day', step: 500 },
  lower: { label: 'Lower body', unit: 'a week', step: 1 },
  upper: { label: 'Upper body', unit: 'a week', step: 1 },
  full_body: { label: 'Full body', unit: 'a week', step: 1 },
  cardio: { label: 'Cardio', unit: 'a week', step: 1 },
  active_minutes: { label: 'Active minutes', unit: 'min a week', step: 10, standard: HEALTH_STANDARD.active_minutes },
  reps: { label: 'Reps', unit: 'a day', step: 5 },
  mobility: { label: 'Stretches', unit: 'a week', step: 1, standard: HEALTH_STANDARD.stretch_days },
  // Not placed on the new Fitness screen yet; still editable here.
  bundle: { label: 'Daily Bundle', unit: 'a week', step: 1 },
  exercise_minutes: { label: 'Exercise minutes', unit: 'min a day', step: 5 },
};

// Goals still to place keep the name you gave them.
const OWN_NAME: GoalMetric[] = ['bundle', 'exercise_minutes'];

// Every goal the new Fitness screen shows gets a row, even if it was removed
// from your goals before: it starts at 0 and is only saved if you raise it.
const PLACED: GoalMetric[] = ['calories', 'steps', 'lower', 'upper', 'full_body', 'cardio', 'active_minutes', 'reps', 'mobility'];

function withPlaceholders(period: GoalPeriod, goals: BodyGoal[]): { drafts: GoalDraft[]; added: string[] } {
  const drafts = draftsFrom(goals);
  const added: string[] = [];
  for (const g of standardFor(period)) {
    if (!PLACED.includes(g.metric) || goals.some((x) => x.metric === g.metric)) continue;
    const id = standardGoalId(g.metric);
    drafts.push({ id, name: g.name, metric: g.metric, target: 0, unit: g.unit, active: true });
    added.push(id);
  }
  return { drafts, added };
}

const GROUP_OF: Record<GoalMetric, GoalsSection> = {
  calories: 'daily',
  steps: 'daily',
  lower: 'sess',
  upper: 'sess',
  full_body: 'sess',
  cardio: 'sess',
  active_minutes: 'sess',
  reps: 'reps',
  mobility: 'rec',
  bundle: 'still',
  exercise_minutes: 'still',
};

// Order within a group follows the prototype; goals you added yourself sit
// just above Active minutes (session types) or in Still to place (daily).
const ORDER: (GoalMetric | 'custom')[] = [
  'calories',
  'steps',
  'lower',
  'upper',
  'full_body',
  'cardio',
  'custom',
  'active_minutes',
  'reps',
  'mobility',
  'bundle',
  'exercise_minutes',
];

type Ref = { period: GoalPeriod; index: number };

export default function YourGoalsSheet({
  week,
  day,
  section,
  onClose,
}: {
  week: BodyGoal[];
  day: BodyGoal[];
  section?: GoalsSection;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [start] = useState(() => ({ week: withPlaceholders('week', week), day: withPlaceholders('day', day) }));
  const [drafts, setDrafts] = useState<Record<GoalPeriod, GoalDraft[]>>(() => ({
    week: start.week.drafts,
    day: start.day.drafts,
  }));
  const placeholders = new Set([...start.week.added, ...start.day.added]);
  const keep = (d: GoalDraft[]) => d.filter((g) => !(g.id && placeholders.has(g.id) && g.target === 0));
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const groupRefs = useRef<Partial<Record<GoalsSection, HTMLElement | null>>>({});

  // Opened from "Goal 650" or "Sessions: N of M": start at that group.
  useEffect(() => {
    if (section) groupRefs.current[section]?.scrollIntoView({ block: 'start' });
  }, [section]);

  const bump = (r: Ref, dir: 1 | -1) =>
    setDrafts((d) => ({
      ...d,
      [r.period]: d[r.period].map((g, i) => {
        if (i !== r.index) return g;
        const step = g.metric ? ROW[g.metric].step : 1;
        return { ...g, target: Math.max(0, (Number.isFinite(g.target) ? g.target : 0) + dir * step) };
      }),
    }));

  const remove = (r: Ref) =>
    setDrafts((d) => ({ ...d, [r.period]: d[r.period].filter((_, i) => i !== r.index) }));

  // A session type you add sits just above Active minutes.
  function add() {
    const name = newName.trim();
    if (!name) return;
    setDrafts((d) => {
      const at = d.week.findIndex((g) => g.metric === 'active_minutes');
      const next = d.week.slice();
      next.splice(at < 0 ? next.length : at, 0, { name, metric: null, target: 1, unit: 'sessions', active: true });
      return { ...d, week: next };
    });
    setNewName('');
  }

  function reset() {
    setDrafts({ week: standardDrafts('week'), day: standardDrafts('day') });
    showToast('Set to the standard. Save to keep it.');
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    await saveGoals('week', keep(drafts.week));
    await saveGoals('day', keep(drafts.day));
    showToast('Goals saved');
    onClose();
  }

  // Every goal, placed in its group and order.
  const rows = (['week', 'day'] as GoalPeriod[])
    .flatMap((period) =>
      drafts[period].map((g, index) => ({
        g,
        ref: { period, index },
        group: g.metric ? GROUP_OF[g.metric] : period === 'week' ? ('sess' as const) : ('still' as const),
        rank: ORDER.indexOf(g.metric ?? 'custom') * 1000 + index,
      })),
    )
    .sort((a, b) => a.rank - b.rank);

  const strengthTotal = drafts.week
    .filter((g) => g.metric === 'lower' || g.metric === 'upper' || g.metric === 'full_body')
    .reduce((n, g) => n + (Number.isFinite(g.target) ? g.target : 0), 0);
  const strengthLow = strengthTotal < HEALTH_STANDARD.strength_sessions;

  const groups = (Object.keys(GROUP_TITLE) as GoalsSection[]).filter((k) => rows.some((r) => r.group === k));

  return (
    <BottomSheet onClose={onClose} label="Your goals">
      <p className="eyebrow pr-10">Moving my body</p>
      <h2 className="text-heading text-ink mt-0.5">Your goals</h2>
      <p className="text-label text-muted mt-1 leading-snug">
        Yours to set. Where a health standard exists it’s shown under the goal. Set a goal below it and the row
        says so.
      </p>

      {groups.map((k) => (
        <section key={k} ref={(el) => void (groupRefs.current[k] = el)} className="scroll-mt-2">
          <p className="eyebrow mt-4 mb-0.5">{GROUP_TITLE[k]}</p>
          {rows
            .filter((r) => r.group === k)
            .map(({ g, ref }) => {
              const spec = g.metric ? ROW[g.metric] : null;
              const standard = spec?.standard;
              const low = standard !== undefined && g.target < standard;
              return (
                <div key={`${ref.period}-${g.id ?? ref.index}`}>
                  <div className="flex items-center justify-between gap-2 py-2 border-t border-hairline">
                    <div className="min-w-0">
                      <p className="text-label font-semibold text-ink truncate">
                        {spec && !OWN_NAME.includes(g.metric!) ? spec.label : g.name}
                      </p>
                      {standard !== undefined && (
                        <p className={`text-label ${low ? 'text-amber-text font-semibold' : 'text-hint'}`}>
                          {low ? `Below the standard, for now · standard ${standard}` : `Standard ${standard}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StepButton label={`Less ${spec?.label ?? g.name}`} onClick={() => bump(ref, -1)}>
                        <Minus size={14} strokeWidth={2.5} />
                      </StepButton>
                      <b className="min-w-[52px] text-center text-body font-bold text-ink tabular-nums">
                        {Number.isFinite(g.target) ? g.target.toLocaleString() : 0}
                      </b>
                      <StepButton label={`More ${spec?.label ?? g.name}`} onClick={() => bump(ref, 1)}>
                        <Plus size={14} strokeWidth={2.5} />
                      </StepButton>
                      <span className="text-label text-muted w-[72px]">
                        {spec?.unit ?? (ref.period === 'week' ? 'a week' : 'a day')}
                      </span>
                      {!g.metric && (
                        <button
                          type="button"
                          onClick={() => remove(ref)}
                          aria-label={`Remove ${g.name}`}
                          className="w-8 h-11 -mr-2 flex items-center justify-center text-hint"
                        >
                          <X size={15} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                  </div>
                  {g.metric === 'active_minutes' && (
                    <div className="flex gap-1.5 pb-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') add();
                        }}
                        placeholder="Add a session type, e.g. Swim"
                        aria-label="New session type"
                        className="input flex-1 min-w-0 h-10"
                      />
                      <button type="button" onClick={add} className="btn-primary min-h-[40px] px-4 text-label">
                        Add
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          {k === 'sess' && (
            <p className={`text-label pt-0.5 ${strengthLow ? 'text-amber-text font-semibold' : 'text-muted'}`}>
              Strength sessions a week: {strengthTotal}
              {strengthLow
                ? `. Below the standard of ${HEALTH_STANDARD.strength_sessions}, for now.`
                : `. Standard: ${HEALTH_STANDARD.strength_sessions}.`}
            </p>
          )}
        </section>
      ))}

      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full mt-4">
        Save goals
      </button>
      <button type="button" onClick={reset} className="w-full mt-1 min-h-[44px] text-label font-bold text-green-700">
        Reset to the Life Coaching standard
      </button>
    </BottomSheet>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 rounded-full border border-green-300 bg-white text-green-700 flex items-center justify-center"
    >
      {children}
    </button>
  );
}
