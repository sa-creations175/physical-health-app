import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import SharedActivityCard from './SharedActivityCard';
import { LowerBodyIcon, UpperBodyIcon, FullBodyIcon } from './activityIcons';
import { getLiftingSummary, type LiftingType } from '../../lib/dashboardQueries';
import type { BodyGoal } from '../../db/types';
import { liftingDots } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { fillFraction } from '../../lib/progress';
import { pillarCallout } from '../../lib/pillarNarrative';

export default function LiftingActivityCard({
  type,
  goal,
  expanded,
  onToggle,
}: {
  type: LiftingType;
  goal: BodyGoal; // the weekly goal this card shows: its name and target
  expanded: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const summary = useLiveQuery(() => getLiftingSummary(type), [type]);
  const label = goal.name;
  const target = goal.target;
  const count = summary?.thisWeekCount ?? 0;
  const complete = target > 0 && count >= target;

  const weekDots = summary?.weekDots ??
    currentWeekISODates().map((date) => ({ date, hadSession: false }));
  const dots = liftingDots(weekDots);

  // Full Body has no narrative bank (not in the June 5 design) — it stays
  // silent. Lower/Upper get a hype callout when their target is active.
  const callout =
    (type === 'lower' || type === 'upper') && target > 0
      ? pillarCallout(type, fillFraction(count, target), todayISODate())
      : undefined;
  const badge = <>
          {count}
          <span className="text-label font-medium text-muted"> / {target}</span>
          {complete && <span className="text-green-700"> ✓</span>}
        </>;

  const icon =
    type === 'lower' ? (
      <LowerBodyIcon />
    ) : type === 'upper' ? (
      <UpperBodyIcon />
    ) : (
      <FullBodyIcon />
    );

  return (
    <SharedActivityCard
      label={label}
      badge={badge}
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={icon}
      pillar={type}
      callout={callout}
    >
      <p className="text-label text-muted">
        {summary?.lastSession
          ? `Last: ${summary.lastSession.summary}`
          : 'No sessions logged yet.'}
      </p>
      <button
        type="button"
        onClick={() => navigate(`/log/strength?type=${type}`)}
        className="mt-2 text-green-700 text-label font-bold min-h-[44px]"
      >
        Log {label} →
      </button>
    </SharedActivityCard>
  );
}
