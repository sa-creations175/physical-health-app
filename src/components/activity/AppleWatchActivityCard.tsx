import { useEffect, useState } from 'react';
import SharedActivityCard from './SharedActivityCard';
import { WatchIcon } from './activityIcons';
import { DOT_COLOR } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { App } from '@capacitor/app';
import { getHealthSnapshot, type HealthSnapshot } from '../../lib/healthkit';
import { LAST_IMPORT_KEY } from '../../lib/watchImport';

const STEPS_TARGET = 10000;
const CALORIE_TARGET = 600;

// HealthKit returns workout types as raw HKWorkoutActivityType identifiers
// ("stairClimbing", "traditionalStrengthTraining", "running", …). Map the
// awkward ones explicitly; split the rest from camelCase into Title Case.
const WORKOUT_TYPE_LABELS: Record<string, string> = {
  traditionalStrengthTraining: 'Strength Training',
  functionalStrengthTraining: 'Functional Training',
  highIntensityIntervalTraining: 'HIIT',
  other: 'Workout',
};

function formatWorkoutType(type: string): string {
  if (WORKOUT_TYPE_LABELS[type]) return WORKOUT_TYPE_LABELS[type];
  return type
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase boundaries
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case each word
}

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
  // Last Watch auto-import time (written by importWatchWorkouts on startup).
  const [lastSync, setLastSync] = useState<string | null>(() =>
    localStorage.getItem(LAST_IMPORT_KEY),
  );

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      if (!cancelled) setLastSync(localStorage.getItem(LAST_IMPORT_KEY));
      getHealthSnapshot()
        .then((s) => {
          if (!cancelled) setSnapshot(s);
        })
        .catch((e) => {
          console.error('HK error at AppleWatchActivityCard load:', e);
          if (!cancelled) setSnapshot(null);
        });
    };

    load();

    // Refetch when the app returns to the foreground. Fixes the one-shot
    // problem permanently: e.g. the user grants Health access in Settings
    // while the app is backgrounded, then returns — we re-read instead of
    // staying stale. addListener resolves to a handle we remove on unmount.
    const handle = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) load();
    });

    return () => {
      cancelled = true;
      handle.then((h) => h.remove());
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
                <span className="truncate">{formatWorkoutType(w.workoutType)}</span>
                <span className="text-card-mute whitespace-nowrap ml-2">
                  {w.durationMinutes} min · {w.calories} cal
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastSync && (
        <p className="mt-3 text-[11px] text-dim">
          Last synced:{' '}
          {new Date(lastSync).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
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
