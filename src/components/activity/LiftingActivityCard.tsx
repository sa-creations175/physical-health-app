import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import SharedActivityCard from './SharedActivityCard';
import { LowerBodyIcon, UpperBodyIcon, FullBodyIcon } from './activityIcons';
import { getLiftingSummary, type LiftingType } from '../../lib/dashboardQueries';
import { getUserPreferences } from '../../lib/userPreferences';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from '../../lib/defaults';
import { liftingDots } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { fillFraction } from '../../lib/progress';
import { pillarCallout } from '../../lib/pillarNarrative';

const TARGET_FIELD: Record<LiftingType, 'lifting_target_lower' | 'lifting_target_upper' | 'lifting_target_full_body'> = {
  lower: 'lifting_target_lower',
  upper: 'lifting_target_upper',
  full_body: 'lifting_target_full_body',
};
const TARGET_DEFAULT: Record<LiftingType, number> = {
  lower: DEFAULT_WEEKLY_LIFTING_TARGETS.lower,
  upper: DEFAULT_WEEKLY_LIFTING_TARGETS.upper,
  full_body: DEFAULT_WEEKLY_LIFTING_TARGETS.full_body,
};

export default function LiftingActivityCard({
  type,
  label,
  expanded,
  onToggle,
}: {
  type: LiftingType;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const summary = useLiveQuery(() => getLiftingSummary(type), [type]);
  const prefs = useLiveQuery(() => getUserPreferences(), []);

  const target = prefs?.[TARGET_FIELD[type]] ?? TARGET_DEFAULT[type];
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
  const badge =
    target === 0 ? (
      <>
        {count} <span className="text-hint">optional</span>
      </>
    ) : (
      <>
        {count} / {target}
        {complete && <span className="text-green-700"> ✓</span>}
      </>
    );

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
        className="mt-2 text-green-700 text-label font-medium"
      >
        Log {label} →
      </button>
    </SharedActivityCard>
  );
}
