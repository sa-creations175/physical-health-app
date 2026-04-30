import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel, SevenDayDotRow } from '../ui/primitives';
import {
  getLiftingSummary,
  type LiftingType,
} from '../../lib/dashboardQueries';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from '../../lib/defaults';
import { getUserPreferences } from '../../lib/userPreferences';

const LIFTING_CARDS: { type: LiftingType; label: string; optional?: boolean }[] = [
  { type: 'lower', label: 'Lower Body' },
  { type: 'upper', label: 'Upper Body' },
  { type: 'full_body', label: 'Full Body', optional: true },
];

// Two stripe colors signal pillar progress at a glance: deep green is the
// default accent, mint marks "weekly target hit" — same green family, just
// brighter, like a coach's nod for good work.
const STRIPE_DEFAULT = '#0F6E56';
const STRIPE_COMPLETE = '#5DCAA5';

export default function LiftingSection() {
  const [expanded, setExpanded] = useState<LiftingType | null>(null);
  const prefs = useLiveQuery(() => getUserPreferences(), []);

  // Targets fall back to module defaults during the brief first-render window
  // before the live query resolves. After that, the live query drives the
  // numbers and the cards re-render whenever Settings edits land.
  const targets = {
    lower: prefs?.lifting_target_lower ?? DEFAULT_WEEKLY_LIFTING_TARGETS.lower,
    upper: prefs?.lifting_target_upper ?? DEFAULT_WEEKLY_LIFTING_TARGETS.upper,
    full_body:
      prefs?.lifting_target_full_body ?? DEFAULT_WEEKLY_LIFTING_TARGETS.full_body,
  };

  return (
    <section className="px-5 mt-2">
      <SectionLabel>This week — lifting</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mt-2">
        {LIFTING_CARDS.map(({ type, label, optional }) => (
          <LiftingCard
            key={type}
            type={type}
            label={label}
            optional={optional}
            target={targets[type]}
            isExpanded={expanded === type}
            onToggle={() =>
              setExpanded((cur) => (cur === type ? null : type))
            }
          />
        ))}
      </div>
      {expanded && <ExpandedDetail key={expanded} type={expanded} />}
    </section>
  );
}

function LiftingCard({
  type,
  label,
  optional,
  target,
  isExpanded,
  onToggle,
}: {
  type: LiftingType;
  label: string;
  optional?: boolean;
  target: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const summary = useLiveQuery(() => getLiftingSummary(type), [type]);
  const count = summary?.thisWeekCount ?? 0;
  // Optional cards have target 0 — guard so we don't celebrate a goal that
  // wasn't set. Full Body never celebrates unless the user raises its target.
  const complete = target > 0 && count >= target;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      style={{
        borderLeftWidth: '2px',
        borderLeftColor: complete ? STRIPE_COMPLETE : STRIPE_DEFAULT,
      }}
      className={`bg-card border rounded-xl p-3 text-left min-h-[80px] transition-colors ${
        isExpanded ? 'border-green-mint' : 'border-card-edge'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
          {label.toUpperCase()}
        </p>
        {complete && (
          <span
            aria-label="weekly target met"
            className="text-[12px] text-green-mint leading-none"
          >
            ✓
          </span>
        )}
      </div>
      <p className="mt-1.5 leading-none">
        <span className="text-[19px] font-medium text-ink">{count}</span>
        <span className="text-[12px] text-card-mute"> / {target}</span>
      </p>
      {optional && (
        <p className="text-[9px] text-card-mute mt-1.5 lowercase">optional</p>
      )}
    </button>
  );
}

function ExpandedDetail({ type }: { type: LiftingType }) {
  const summary = useLiveQuery(() => getLiftingSummary(type), [type]);
  if (!summary) return null;

  return (
    <div className="bg-card border border-card-edge rounded-xl p-4 mt-2">
      <SevenDayDotRow dots={summary.weekDots} />
      <div className="mt-3 pt-3 border-t border-divider">
        {summary.lastSession ? (
          <p className="text-[12px] text-card-mute">
            <span className="text-card-mute">Last:</span> {summary.lastSession.summary}
          </p>
        ) : (
          <p className="text-[12px] text-card-mute">no data yet</p>
        )}
      </div>
    </div>
  );
}
