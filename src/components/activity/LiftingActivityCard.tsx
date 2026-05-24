import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import SharedActivityCard from './SharedActivityCard';
import { getLiftingSummary, type LiftingType } from '../../lib/dashboardQueries';
import { getUserPreferences } from '../../lib/userPreferences';
import { DEFAULT_WEEKLY_LIFTING_TARGETS } from '../../lib/defaults';
import { liftingDots } from '../../lib/dotHelpers';
import { currentWeekISODates } from '../../lib/dateHelpers';

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

  const badge =
    target === 0 ? (
      <>
        {count} <span className="text-dim">optional</span>
      </>
    ) : (
      <>
        {count} / {target}
        {complete && <span className="text-green-mid"> ✓</span>}
      </>
    );

  return (
    <SharedActivityCard
      label={label}
      badge={badge}
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
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
