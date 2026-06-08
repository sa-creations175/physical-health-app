import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import SharedActivityCard from './SharedActivityCard';
import { LowerBodyIcon, UpperBodyIcon, FullBodyIcon } from './activityIcons';
import { getLiftingSummary, type LiftingType } from '../../lib/dashboardQueries';
import { getUserPreferences } from '../../lib/userPreferences';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from '../../lib/defaults';
import { liftingDots } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { PILLAR_COLORS, fillFraction } from '../../lib/pillarColors';
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

  const pillar = PILLAR_COLORS[type];
  // Full Body has no narrative bank (not in the June 5 design) — it stays
  // silent. Lower/Upper get a hype callout when their target is active.
  const callout =
    (type === 'lower' || type === 'upper') && target > 0
      ? {
          text: pillarCallout(type, fillFraction(count, target), todayISODate()),
          color: pillar.fill,
        }
      : undefined;
  const badge =
    target === 0 ? (
      <>
        {count} <span className="text-dim">optional</span>
      </>
    ) : (
      <>
        {count} / {target}
        {complete && <span style={{ color: pillar.text }}> ✓</span>}
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
      fill={{
        color: pillar.fill,
        fraction: fillFraction(count, target),
        complete,
        accent: pillar.text,
      }}
      pillar={{ key: type, color: pillar.fill }}
      callout={callout}
    >
      <p className="text-[12px] text-[#5f6b65]">
        {summary?.lastSession
          ? `Last: ${summary.lastSession.summary}`
          : 'No sessions logged yet.'}
      </p>
      <button
        type="button"
        onClick={() => navigate(`/log/strength?type=${type}`)}
        className="mt-2 text-green-mid text-[13px] font-medium"
      >
        Log {label} →
      </button>
    </SharedActivityCard>
  );
}
