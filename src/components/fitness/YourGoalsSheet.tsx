import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, Plus } from 'lucide-react';
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
import { builtInNames, namesFor } from '../../lib/goalNames';
import { activeMinutesLabel } from '../../lib/fitnessFormat';
import { getUserPreferences, updateUserPreferences } from '../../lib/userPreferences';
import type { BodyGoal, GoalMetric, GoalPeriod } from '../../db/types';

// "Your goals" (body-goals-merged-proto.html; docs/GOALS_SHEET_AND_STRENGTH_
// COVERAGE_SPEC.md Part 1): the one goals sheet, behind the Goals pill. Every
// Moving my body goal, grouped the way Fitness shows them, with every other
// group on Mint (PERSONAL_OS_BRAND.md section 2, Green 100 surfaces). Each
// goal can be renamed, set with − and + (never below 1) and removed; a removed
// goal waits at the end of its own group to be added back. You can add a
// session type or a daily goal of your own. The Life Coaching standards sit
// in one section at the bottom. Nothing is written until "Save goals".
//
// Underneath, a removed built-in goal is still stored with a target of 0 (so
// it keeps its id and place); a goal you added yourself is deleted.

export type GoalsSection = 'daily' | 'sess' | 'reps' | 'rec' | 'still';

const GROUP_TITLE: Record<GoalsSection, string> = {
  daily: 'Daily movement',
  sess: 'Fitness score',
  reps: 'Quick reps',
  rec: 'Recovery',
  still: 'Still to place',
};

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

const UNIT: Record<GoalMetric, string> = {
  calories: 'a day',
  steps: 'a day',
  lower: 'a week',
  upper: 'a week',
  full_body: 'a week',
  cardio: 'a week',
  active_minutes: 'min a week',
  reps: 'a day',
  mobility: 'a week',
  bundle: 'a week',
  exercise_minutes: 'min a day',
};

const STEP: Partial<Record<GoalMetric, number>> = {
  calories: 25,
  steps: 500,
  active_minutes: 10,
  reps: 5,
  exercise_minutes: 5,
};

// Order within a group follows the prototype. Your own session types sit
// just above Active minutes; your own daily goals sit after Reps.
const ORDER: (GoalMetric | 'customWeek' | 'customDay')[] = [
  'calories',
  'steps',
  'lower',
  'upper',
  'full_body',
  'cardio',
  'customWeek',
  'active_minutes',
  'reps',
  'customDay',
  'mobility',
  'bundle',
  'exercise_minutes',
];

// Every goal the new Fitness screen shows gets a place, even one that was
// removed before this sheet existed: it starts removed and is only saved if
// you add it back.
const PLACED: GoalMetric[] = ['calories', 'steps', 'lower', 'upper', 'full_body', 'cardio', 'active_minutes', 'reps', 'mobility'];

type Ref = { period: GoalPeriod; index: number };

const isRemoved = (g: GoalDraft) => g.metric !== null && (!(g.target > 0) || !g.active);
const groupOf = (g: GoalDraft, period: GoalPeriod): GoalsSection =>
  g.metric ? GROUP_OF[g.metric] : period === 'week' ? 'sess' : 'reps';
const nameOf = (g: GoalDraft) => namesFor({ name: g.name, metric: g.metric }).name;

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
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const hours = prefs?.active_minutes_as_hours === true;
  const [start] = useState(() => ({ week: withPlaceholders('week', week), day: withPlaceholders('day', day) }));
  const [drafts, setDrafts] = useState<Record<GoalPeriod, GoalDraft[]>>(() => ({
    week: start.week.drafts,
    day: start.day.drafts,
  }));
  const placeholders = new Set([...start.week.added, ...start.day.added]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [newSession, setNewSession] = useState('');
  const [newDaily, setNewDaily] = useState('');
  const [newDailyCount, setNewDailyCount] = useState('20');
  const [whyOpen, setWhyOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const groupRefs = useRef<Partial<Record<GoalsSection, HTMLElement | null>>>({});

  // Opened from "Goal 650" or "Sessions: N of M": start at that group.
  useEffect(() => {
    if (section) groupRefs.current[section]?.scrollIntoView({ block: 'start' });
  }, [section]);

  const keyOf = (r: Ref) => `${r.period}-${r.index}`;
  const patch = (r: Ref, change: Partial<GoalDraft>) =>
    setDrafts((d) => ({ ...d, [r.period]: d[r.period].map((g, i) => (i === r.index ? { ...g, ...change } : g)) }));

  // − and + never go below 1: taking a goal away is Remove.
  const bump = (r: Ref, dir: 1 | -1) => {
    const g = drafts[r.period][r.index];
    const step = (g.metric && STEP[g.metric]) || 1;
    patch(r, { target: Math.max(1, (g.target > 0 ? g.target : 1) + dir * step) });
  };

  function remove(r: Ref) {
    const g = drafts[r.period][r.index];
    setConfirming(null);
    if (g.metric === null) {
      // A goal you added yourself goes; a built-in one waits under Removed.
      setDrafts((d) => ({ ...d, [r.period]: d[r.period].filter((_, i) => i !== r.index) }));
    } else {
      patch(r, { target: 0 });
    }
  }

  // Back at its old number if it still has one, else the Life Coaching
  // standard's.
  function addBack(r: Ref) {
    const g = drafts[r.period][r.index];
    const standard = standardFor(r.period).find((s) => s.metric === g.metric)?.target ?? 1;
    patch(r, { target: g.target > 0 ? g.target : standard, active: true });
  }

  function addSession() {
    const name = newSession.trim();
    if (!name) return;
    setDrafts((d) => {
      const at = d.week.findIndex((g) => g.metric === 'active_minutes');
      const next = d.week.slice();
      next.splice(at < 0 ? next.length : at, 0, { name, metric: null, target: 1, unit: 'sessions', active: true });
      return { ...d, week: next };
    });
    setNewSession('');
  }

  function addDaily() {
    const name = newDaily.trim();
    const target = Math.max(1, parseInt(newDailyCount, 10) || 1);
    if (!name) return;
    setDrafts((d) => ({ ...d, day: [...d.day, { name, metric: null, target, unit: 'times', active: true }] }));
    setNewDaily('');
    setNewDailyCount('20');
  }

  function reset() {
    setDrafts({ week: standardDrafts('week'), day: standardDrafts('day') });
    setRenaming(null);
    setConfirming(null);
    showToast('Set to the standard. Save to keep it.');
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    const keep = (d: GoalDraft[]) => d.filter((g) => !(g.id && placeholders.has(g.id) && isRemoved(g)));
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
        group: groupOf(g, period),
        rank:
          ORDER.indexOf(g.metric ?? (period === 'week' ? 'customWeek' : 'customDay')) * 1000 + index,
      })),
    )
    .sort((a, b) => a.rank - b.rank);
  const groups = (Object.keys(GROUP_TITLE) as GoalsSection[]).filter(
    (k) => rows.some((r) => r.group === k) || k === 'sess' || k === 'reps',
  );

  // ---- The standards, checked against the goals as they stand in the sheet --
  const live = (m: GoalMetric) => {
    const all = [...drafts.week, ...drafts.day];
    const g = all.find((x) => x.metric === m);
    return g && !isRemoved(g) ? g.target : null;
  };
  const lower = live('lower') ?? 0;
  const upper = live('upper') ?? 0;
  const full = live('full_body') ?? 0;
  const anyStrength = live('lower') !== null || live('upper') !== null || live('full_body') !== null;
  const strengthDays = lower + upper + full;
  const lowerCovered = lower + full > 0;
  const upperCovered = upper + full > 0;
  const strengthOk = strengthDays >= HEALTH_STANDARD.strength_sessions && lowerCovered && upperCovered;
  const strengthWhy =
    strengthDays < HEALTH_STANDARD.strength_sessions ? '' : !lowerCovered ? ' · no lower body' : !upperCovered ? ' · no upper body' : '';
  const active = live('active_minutes');
  const stretch = live('mobility');

  let tint = false;
  return (
    <BottomSheet onClose={onClose} label="Your goals">
      <p className="eyebrow pr-10">Moving my body</p>
      <h2 className="text-heading text-ink mt-0.5">Your goals</h2>
      <p className="text-label text-muted mt-1 leading-snug">
        Yours to set. Where a health standard exists, it’s listed at the bottom.
      </p>

      {groups.map((k) => {
        tint = !tint;
        const inGroup = rows.filter((r) => r.group === k);
        const current = inGroup.filter((r) => !isRemoved(r.g));
        const removed = inGroup.filter((r) => isRemoved(r.g));
        return (
          <section
            key={k}
            ref={(el) => void (groupRefs.current[k] = el)}
            className={`-mx-4 px-4 pt-2.5 pb-3 scroll-mt-2 ${tint ? '' : 'bg-green-100'}`}
          >
            <p className="eyebrow mb-0.5">{GROUP_TITLE[k]}</p>
            {current.map(({ g, ref }) => {
              const key = keyOf(ref);
              if (confirming === key) {
                return (
                  <Row key={key}>
                    <div className="flex items-center justify-between gap-2 rounded-input bg-amber-tint px-2.5 py-2">
                      <span className="text-label font-semibold text-amber-text">Remove {nameOf(g)}?</span>
                      <span className="flex gap-2 shrink-0">
                        <SmallButton onClick={() => setConfirming(null)}>Keep it</SmallButton>
                        <SmallButton tone="amber" onClick={() => remove(ref)}>
                          Remove
                        </SmallButton>
                      </span>
                    </div>
                  </Row>
                );
              }
              if (renaming === key) {
                return (
                  <Row key={key}>
                    <RenameField
                      initial={nameOf(g)}
                      onDone={(name) => {
                        if (name) patch(ref, { name });
                        setRenaming(null);
                      }}
                    />
                  </Row>
                );
              }
              const isActive = g.metric === 'active_minutes';
              const unit = g.metric ? UNIT[g.metric] : ref.period === 'week' ? 'a week' : 'a day';
              return (
                <Row key={key}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-ink truncate">{nameOf(g)}</p>
                      {isActive && (
                        <MinHours hours={hours} onChange={(h) => void updateUserPreferences({ active_minutes_as_hours: h })} />
                      )}
                      <div className="flex gap-3 mt-0.5">
                        <LinkButton
                          onClick={() => {
                            setConfirming(null);
                            setRenaming(key);
                          }}
                        >
                          Rename
                        </LinkButton>
                        <LinkButton
                          onClick={() => {
                            setRenaming(null);
                            setConfirming(key);
                          }}
                        >
                          Remove
                        </LinkButton>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StepButton label={`Less ${nameOf(g)}`} onClick={() => bump(ref, -1)}>
                        <Minus size={14} strokeWidth={2.5} />
                      </StepButton>
                      <b className="min-w-[52px] text-center text-body font-bold text-ink tabular-nums">
                        {isActive ? activeMinutesLabel(g.target, hours) : g.target.toLocaleString()}
                      </b>
                      <StepButton label={`More ${nameOf(g)}`} onClick={() => bump(ref, 1)}>
                        <Plus size={14} strokeWidth={2.5} />
                      </StepButton>
                      <span className="text-label text-muted w-[64px] leading-tight">
                        {isActive && hours ? 'a week' : unit}
                      </span>
                    </div>
                  </div>
                </Row>
              );
            })}

            {removed.length > 0 && (
              <div className="border-t border-hairline pt-2">
                <p className="text-body font-semibold text-amber">Removed</p>
                {removed.map(({ g, ref }) => (
                  <div key={keyOf(ref)} className="flex items-center gap-2.5 pl-3.5 py-1">
                    <span className="text-body text-muted">• {g.metric ? builtInOrOwn(g) : g.name}</span>
                    <SmallButton onClick={() => addBack(ref)}>Add back</SmallButton>
                  </div>
                ))}
              </div>
            )}

            {k === 'sess' && (
              <div className="flex items-center gap-1.5 border-t border-hairline pt-2 mt-1">
                <input
                  type="text"
                  value={newSession}
                  onChange={(e) => setNewSession(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSession()}
                  placeholder="Add a session type, e.g. Swim"
                  aria-label="New session type"
                  className="input flex-1 min-w-0 h-9"
                />
                <SmallButton onClick={addSession}>Add</SmallButton>
              </div>
            )}
            {k === 'reps' && (
              <div className="flex items-center gap-1.5 border-t border-hairline pt-2 mt-1">
                <input
                  type="text"
                  value={newDaily}
                  onChange={(e) => setNewDaily(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addDaily()}
                  placeholder="Add a daily goal, e.g. Push-ups"
                  aria-label="New daily goal"
                  className="input flex-1 min-w-0 h-9"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={newDailyCount}
                  onChange={(e) => setNewDailyCount(e.target.value)}
                  aria-label="How many a day"
                  className="input w-[58px] h-9 px-2 text-right"
                />
                <SmallButton onClick={addDaily}>Add</SmallButton>
              </div>
            )}
          </section>
        );
      })}

      {/* The Life Coaching standards: one section, just above Save goals. */}
      <section className={`-mx-4 px-4 pt-2.5 pb-3 ${!tint ? '' : 'bg-green-100'}`}>
        <p className="eyebrow">Life Coaching standards</p>
        <p className="text-label text-muted mt-0.5 mb-1.5 leading-snug">
          The lines your goals are measured against in the Intake Flow. Your goals are yours; these are here for
          reference.
        </p>
        <StandardRow
          name="Strength days"
          standard={`${HEALTH_STANDARD.strength_sessions} a week, whole body covered`}
          yours={anyStrength ? `${strengthDays} a week${strengthWhy}` : null}
          ok={strengthOk}
        />
        <StandardRow
          name="Active minutes"
          standard={
            hours
              ? `${activeMinutesLabel(HEALTH_STANDARD.active_minutes, true)} a week`
              : `${HEALTH_STANDARD.active_minutes} min a week`
          }
          yours={active === null ? null : hours ? activeMinutesLabel(active, true) : `${active} min`}
          ok={active !== null && active >= HEALTH_STANDARD.active_minutes}
        />
        <StandardRow
          name="Stretching"
          standard={`${HEALTH_STANDARD.stretch_days} times a week`}
          yours={stretch === null ? null : `${stretch} times a week`}
          ok={stretch !== null && stretch >= HEALTH_STANDARD.stretch_days}
        />
        <button
          type="button"
          onClick={() => setWhyOpen((o) => !o)}
          aria-expanded={whyOpen}
          className="w-full text-left border-t border-hairline pt-2.5 pb-1 text-label font-bold text-green-700"
        >
          Why these? {whyOpen ? '▴' : '▾'}
        </button>
        {whyOpen && <WhyThese />}
        <button
          type="button"
          onClick={reset}
          className="w-full mt-1.5 min-h-[40px] rounded-full border border-green-300 bg-white text-label font-bold text-green-700"
        >
          Reset my goals to these standards
        </button>
      </section>

      <button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full mt-4">
        Save goals
      </button>
    </BottomSheet>
  );
}

// A removed built-in goal keeps the name it had (yours if you'd renamed it).
function builtInOrOwn(g: GoalDraft): string {
  return g.metric ? namesFor({ name: g.name, metric: g.metric }).name || builtInNames(g.metric).name : g.name;
}

function Row({ children }: { children: ReactNode }) {
  return <div className="border-t border-hairline py-2">{children}</div>;
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-label font-semibold text-green-700 min-h-[28px]">
      {children}
    </button>
  );
}

// The one small button on this sheet: "Add", "Add back", "Keep it", and
// (in Bronze Amber) "Remove".
function SmallButton({
  onClick,
  tone = 'plain',
  children,
}: {
  onClick: () => void;
  tone?: 'plain' | 'amber';
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1 text-label font-bold ${
        tone === 'amber'
          ? 'bg-amber text-white border border-amber'
          : 'bg-white text-green-700 border border-green-300'
      }`}
    >
      {children}
    </button>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
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

function RenameField({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onDone(value.trim())}
        aria-label="Goal name"
        className="input flex-1 min-w-0 h-10"
      />
      <button
        type="button"
        onClick={() => onDone(value.trim())}
        className="shrink-0 rounded-full bg-green-700 text-white text-label font-bold px-4 py-2"
      >
        Done
      </button>
    </div>
  );
}

// min | hours: how Active minutes are shown, never what's stored.
function MinHours({ hours, onChange }: { hours: boolean; onChange: (hours: boolean) => void }) {
  const part = (on: boolean) =>
    `px-2.5 py-0.5 text-micro normal-case tracking-normal ${on ? 'bg-green-700 text-white' : 'bg-white text-green-700'}`;
  return (
    <div role="group" aria-label="Show as" className="inline-flex mt-1 rounded-full border border-green-300 overflow-hidden">
      <button type="button" aria-pressed={!hours} onClick={() => onChange(false)} className={part(!hours)}>
        min
      </button>
      <button type="button" aria-pressed={hours} onClick={() => onChange(true)} className={part(hours)}>
        hours
      </button>
    </div>
  );
}

function StandardRow({ name, standard, yours, ok }: { name: string; standard: string; yours: string | null; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-hairline py-2">
      <div className="min-w-0">
        <p className="text-body font-semibold text-ink">{name}</p>
        <p className="text-label text-muted">At least {standard}</p>
      </div>
      <p
        className={`text-label text-right ${
          yours === null ? 'text-hint' : ok ? 'text-green-700 font-semibold' : 'text-amber font-semibold'
        }`}
      >
        {yours === null ? 'Not tracked' : `Yours: ${yours}${ok ? '' : ' · below, for now'}`}
      </p>
    </div>
  );
}

// docs/GOALS_SHEET_AND_STRENGTH_COVERAGE_SPEC.md Part 3, word for word.
function WhyThese() {
  return (
    <div className="text-label text-ink leading-snug space-y-2 pt-1 pb-1">
      <p>
        <b>Strength, 2 days a week, whole body covered.</b> This is the health standard from the WHO (2020) and the
        US Physical Activity Guidelines (2018): strength work on at least 2 days a week, with every major muscle
        group worked somewhere in the week. It keeps muscle and bone as you age and lowers the risk of early death.
      </p>
      <p>
        <b>The major muscle groups:</b> legs, hips, back, abdomen, chest, shoulders and arms. A lower body day covers
        legs and hips. An upper body day covers back, chest, shoulders and arms. The abdomen can go on either.
      </p>
      <p>
        <b>What counts:</b> 2 full body days. 1 lower and 1 upper day. A quad day, a glute day and a back day. A 5
        day split that hits each muscle once. 2 lower days with no upper body work doesn't, because half the body is
        missing.
      </p>
      <p>
        <b>If you're training to build muscle or strength:</b> that's a different goal from health. The American
        College of Sports Medicine (2011) recommends working each muscle group 2 to 3 days a week, with 48 hours of
        rest before working the same group again. Muscle-growth research adds that once a week per muscle works about
        as well, as long as the total work per muscle is the same. Set this in your own goals if it's what you're
        after.
      </p>
      <p>
        <b>150 active minutes a week.</b> 150 to 300 minutes of moderate activity a week, the kind that raises your
        heart rate, cuts the risk of heart disease, type 2 diabetes and depression. Same two sources. Going past 300
        adds more benefit.
      </p>
      <p>
        <b>Stretching, twice a week.</b> The American College of Sports Medicine recommends stretching your major
        muscle groups at least two or three times a week, and says daily brings the biggest gains. What that looks
        like: hold each stretch 10 to 30 seconds (30 to 60 if you're older), repeat it 2 to 4 times, and aim for
        about 60 seconds in total per muscle group. It doesn't need a day of its own; ten minutes after a workout
        counts.
      </p>
    </div>
  );
}
