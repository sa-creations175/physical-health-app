import type { BodyGoal } from '../../db/types';
import { Watch } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import SharedActivityCard from './SharedActivityCard';
import { CardioIcon } from './activityIcons';
import { ProgressBar } from '../ui/primitives';
import { getCardioSummary } from '../../lib/dashboardQueries';
import { getUserPreferences } from '../../lib/userPreferences';
import {
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../../lib/defaults';
import { cardioDots } from '../../lib/dotHelpers';
import { db } from '../../db/database';
import { LOCAL_USER_ID } from '../../lib/constants';
import { startOfWeekISODate, todayISODate } from '../../lib/dateHelpers';
import { fillFraction } from '../../lib/progress';
import { pillarCallout } from '../../lib/pillarNarrative';

export default function CardioActivityCard({
  goal,
  expanded,
  onToggle,
}: {
  goal: BodyGoal; // the weekly goal this card shows: its name and target
  expanded: boolean;
  onToggle: () => void;
}) {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const target = goal.target;
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

  const callout =
    target > 0
      ? pillarCallout('cardio', fillFraction(qualifying, target), todayISODate())
      : undefined;

  return (
    <SharedActivityCard
      label={goal.name}
      badge={
        <>
          {qualifying}
          <span className="text-label font-medium text-muted"> / {target}</span>
          {complete && <span className="text-green-700"> ✓</span>}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<CardioIcon />}
      pillar="cardio"
      callout={callout}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-label text-muted">
          {minutes} qualifying min this week
          {shortCount > 0 && <span> · {shortCount} short</span>}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={qualifying} max={target} />
      </div>
      <p className="text-label mt-2">
        {complete ? (
          <span className="text-green-700">You crushed your week</span>
        ) : (
          <span className="text-muted">{remaining} more to hit your week</span>
        )}
      </p>
      {watchCount > 0 && (
        <p className="text-label text-hint mt-2">
          <Watch aria-hidden="true" size={12} strokeWidth={2} className="inline -mt-0.5" /> {watchCount} from Apple Watch this week
        </p>
      )}
    </SharedActivityCard>
  );
}
