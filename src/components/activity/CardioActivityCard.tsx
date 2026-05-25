import { useLiveQuery } from 'dexie-react-hooks';
import SharedActivityCard from './SharedActivityCard';
import { CardioIcon } from './activityIcons';
import { ProgressBar } from '../ui/primitives';
import { getCardioSummary } from '../../lib/dashboardQueries';
import { getUserPreferences } from '../../lib/userPreferences';
import {
  DEFAULT_CARDIO_WEEKLY_TARGET,
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../../lib/defaults';
import { cardioDots } from '../../lib/dotHelpers';
import { db } from '../../db/database';
import { LOCAL_USER_ID } from '../../lib/constants';
import { startOfWeekISODate } from '../../lib/dateHelpers';

export default function CardioActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const target = prefs?.cardio_target_weekly ?? DEFAULT_CARDIO_WEEKLY_TARGET;
  const threshold =
    prefs?.cardio_threshold_minutes ?? DEFAULT_CARDIO_THRESHOLD_MINUTES;

  const summary = useLiveQuery(() => getCardioSummary(threshold), [threshold]);
  const qualifying = summary?.qualifyingCount ?? 0;
  const shortCount = summary?.shortCount ?? 0;
  const minutes = summary?.qualifyingMinutes ?? 0;
  const complete = target > 0 && qualifying >= target;
  const remaining = Math.max(0, target - qualifying);

  const dots = cardioDots(summary?.sessions ?? []);

  // How many of this week's cardio logs were auto-imported from Apple Watch —
  // a subtle provenance hint in the expanded panel.
  const watchCount =
    useLiveQuery(async () => {
      const weekStart = startOfWeekISODate();
      const logs = await db.cardio_logs
        .where('user_id')
        .equals(LOCAL_USER_ID)
        .toArray();
      return logs.filter(
        (l) =>
          l.source === 'watch' &&
          new Date(l.started_at).toLocaleDateString('en-CA') >= weekStart,
      ).length;
    }, [], 0) ?? 0;

  return (
    <SharedActivityCard
      label="Cardio"
      badge={
        <>
          {qualifying} / {target}
          {complete && <span className="text-green-mid"> ✓</span>}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<CardioIcon />}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[#5f6b65]">
          {minutes} qualifying min this week
          {shortCount > 0 && <span> · {shortCount} short</span>}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={qualifying}
          max={target}
          color={complete ? 'green-light' : 'green-deep'}
          trackColor="#e7ece8"
        />
      </div>
      <p className="text-[11px] mt-2">
        {complete ? (
          <span className="text-green-mid">You crushed your week</span>
        ) : (
          <span className="text-[#5f6b65]">{remaining} more to hit your week</span>
        )}
      </p>
      {watchCount > 0 && (
        <p className="text-[11px] text-dim mt-2">
          ⌚ {watchCount} from Apple Watch this week
        </p>
      )}
    </SharedActivityCard>
  );
}
