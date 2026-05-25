import { useEffect, useState } from 'react';
import SharedActivityCard from './SharedActivityCard';
import { WatchIcon } from './activityIcons';
import { DOT_COLOR } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { getHealthSnapshot, type HealthSnapshot } from '../../lib/healthkit';

const STEPS_TARGET = 10000;
const CALORIE_TARGET = 600;

export default function AppleWatchActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  // null = not connected (web / non-iOS / no permission); a snapshot = live
  // HealthKit data. undefined while the first read is in flight.
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    getHealthSnapshot()
      .then((s) => {
        if (!cancelled) setSnapshot(s);
      })
      .catch(() => {
        if (!cancelled) setSnapshot(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = !!snapshot;
  const today = todayISODate();

  // Colour today's dot from step progress so the row feels live; the rest of
  // the week stays grey until per-day history is wired up.
  const dots = currentWeekISODates().map((date) => {
    if (date !== today || !snapshot) return { date, color: DOT_COLOR.none };
    if (snapshot.steps >= STEPS_TARGET) return { date, color: DOT_COLOR.full };
    if (snapshot.steps > 0) return { date, color: DOT_COLOR.light };
    return { date, color: DOT_COLOR.none };
  });

  const badge =
    snapshot === undefined ? (
      <span className="text-dim">checking…</span>
    ) : connected ? (
      <span className="text-green-mid">connected</span>
    ) : (
      <span className="text-dim">not connected</span>
    );

  return (
    <SharedActivityCard
      label="Apple Watch"
      badge={badge}
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<WatchIcon />}
    >
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Steps"
          value={snapshot ? snapshot.steps.toLocaleString() : null}
          target={`/ ${(STEPS_TARGET / 1000).toFixed(0)}k`}
          met={!!snapshot && snapshot.steps >= STEPS_TARGET}
        />
        <StatTile
          label="Active Cal"
          value={snapshot ? String(snapshot.activeCalories) : null}
          target={`/ ${CALORIE_TARGET}`}
          met={!!snapshot && snapshot.activeCalories >= CALORIE_TARGET}
        />
        <StatTile
          label="Workouts"
          value={snapshot ? String(snapshot.workoutsThisWeek) : null}
          target="this week"
          met={!!snapshot && snapshot.workoutsThisWeek > 0}
        />
      </div>

      {!connected && (
        <p className="mt-3 text-[11px] text-card-mute">
          {snapshot === undefined
            ? 'Reading Apple Health…'
            : 'Open Body Health on your iPhone and allow Apple Health access to see live data here.'}
        </p>
      )}

      {connected && snapshot.recentWorkouts.length > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0f2f0' }}>
          <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
            Recent workouts
          </p>
          <ul className="mt-1.5 space-y-1">
            {snapshot.recentWorkouts.slice(0, 4).map((w, i) => (
              <li
                key={`${w.startDate}-${i}`}
                className="flex items-center justify-between text-[12px] text-ink"
              >
                <span className="truncate">{w.workoutType}</span>
                <span className="text-card-mute whitespace-nowrap ml-2">
                  {w.durationMinutes} min · {w.calories} cal
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SharedActivityCard>
  );
}

function StatTile({
  label,
  value,
  target,
  met,
}: {
  label: string;
  value: string | null;
  target: string;
  met: boolean;
}) {
  return (
    <div className="bg-[#eef1ef] rounded-xl p-3 min-h-[64px] flex flex-col">
      <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
        {label}
      </p>
      {value === null ? (
        <p className="mt-1.5 text-[12px] text-card-mute">no data</p>
      ) : (
        <p className="mt-1.5 leading-none">
          <span
            className={`text-[18px] font-display font-semibold ${
              met ? 'text-green-mid' : 'text-ink'
            }`}
          >
            {value}
          </span>{' '}
          <span className="text-[10px] text-card-mute">{target}</span>
        </p>
      )}
    </div>
  );
}
