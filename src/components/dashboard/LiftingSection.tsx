import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel, SevenDayDotRow } from '../ui/primitives';
import {
  getLiftingSummary,
  type LiftingType,
} from '../../lib/dashboardQueries';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from '../../lib/defaults';

const LIFTING_CARDS: { type: LiftingType; label: string; optional?: boolean }[] = [
  { type: 'lower', label: 'Lower' },
  { type: 'upper', label: 'Upper' },
  { type: 'full_body', label: 'Full Body', optional: true },
];

const GREEN_STRIPE = {
  borderLeftWidth: '2px',
  borderLeftColor: '#0F6E56',
} as const;

export default function LiftingSection() {
  const [expanded, setExpanded] = useState<LiftingType | null>(null);

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
  isExpanded,
  onToggle,
}: {
  type: LiftingType;
  label: string;
  optional?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const summary = useLiveQuery(() => getLiftingSummary(type), [type]);
  const target = DEFAULT_WEEKLY_LIFTING_TARGETS[type];
  const count = summary?.thisWeekCount ?? 0;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      style={GREEN_STRIPE}
      className={`bg-card border rounded-xl p-3 text-left min-h-[80px] transition-colors ${
        isExpanded ? 'border-green-mint' : 'border-card-edge'
      }`}
    >
      <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
        {label.toUpperCase()}
      </p>
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
