import { useEffect, useState } from 'react';
import BottomSheet from '../ui/BottomSheet';
import { COLOR } from '../../lib/brand';
import { useLiveQuery } from 'dexie-react-hooks';
import { getGoals, goalFor } from '../../lib/goals';
import { DOT_COLOR } from '../../lib/dotHelpers';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { App } from '@capacitor/app';
import { formatWorkoutType, getHealthSnapshot, type HealthSnapshot } from '../../lib/healthkit';
import { LAST_IMPORT_KEY } from '../../lib/watchImport';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


// What the Apple Watch card showed, now in a sheet opened from Fitness's
// History / Library / Apple Watch row: connected or not, today's dot, today's
// steps, active calories and this week's workouts, recent workouts, and when
// the Watch import last ran.
export default function AppleWatchSheet({ onClose }: { onClose: () => void }) {
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

  // Targets are the daily goals; a goal that's removed or unticked isn't judged.
  const dailyGoals = useLiveQuery(() => getGoals('day'), [], []);
  const stepsGoal = goalFor(dailyGoals, 'steps')?.target ?? null;
  const caloriesGoal = goalFor(dailyGoals, 'calories')?.target ?? null;

  const connected = !!snapshot;
  const today = todayISODate();

  // Colour today's dot from step progress so the row feels live; the rest of
  // the week stays grey until per-day history is wired up.
  const dots = currentWeekISODates().map((date) => {
    if (date !== today || !snapshot) return { date, color: DOT_COLOR.none };
    if (stepsGoal !== null && snapshot.steps >= stepsGoal) return { date, color: DOT_COLOR.full };
    if (snapshot.steps > 0) return { date, color: DOT_COLOR.light };
    return { date, color: DOT_COLOR.none };
  });

  const badge =
    snapshot === undefined ? (
      <span className="text-hint">checking…</span>
    ) : connected ? (
      <span className="text-label font-bold text-green-700">connected</span>
    ) : (
      <span className="text-hint">not connected</span>
    );

  return (
    <BottomSheet onClose={onClose} label="Apple Watch">
      <div className="flex items-center justify-between gap-2 pr-10">
        <p className="eyebrow">Apple Watch</p>
        <span className="text-body font-bold whitespace-nowrap">{badge}</span>
      </div>
      <div className="mt-3 grid grid-cols-7">
        {dots.map((d) => (
          <div key={d.date} className="flex justify-center">
            <span
              className="rounded-full block"
              style={{
                width: 18,
                height: 18,
                background: d.color,
                outline: d.date === today ? `2px solid ${COLOR.green700}` : undefined,
                outlineOffset: 1,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 mb-3 grid grid-cols-7">
        {DAY_INITIALS.map((letter, i) => (
          <span key={i} className="text-micro text-hint text-center">
            {letter}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Steps"
          value={snapshot ? snapshot.steps.toLocaleString() : null}
          target={stepsGoal !== null ? `/ ${(stepsGoal / 1000).toLocaleString()}k` : ''}
          met={!!snapshot && stepsGoal !== null && snapshot.steps >= stepsGoal}
        />
        <StatTile
          label="Active Cal"
          value={snapshot ? snapshot.activeCalories.toLocaleString() : null}
          target={caloriesGoal !== null ? `/ ${caloriesGoal.toLocaleString()}` : ''}
          met={!!snapshot && caloriesGoal !== null && snapshot.activeCalories >= caloriesGoal}
        />
        <StatTile
          label="Workouts"
          value={snapshot ? String(snapshot.workoutsThisWeek) : null}
          target="this week"
          met={!!snapshot && snapshot.workoutsThisWeek > 0}
        />
      </div>

      {!connected && (
        <p className="mt-3 text-label text-muted">
          {snapshot === undefined
            ? 'Reading Apple Health…'
            : 'Open Body Health on your iPhone and allow Apple Health access to see live data here.'}
        </p>
      )}

      {connected && snapshot.recentWorkouts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-hairline">
          <p className="eyebrow">
            Recent Workouts
          </p>
          <ul className="mt-1.5 space-y-1">
            {snapshot.recentWorkouts.slice(0, 4).map((w, i) => (
              <li
                key={`${w.startDate}-${i}`}
                className="flex items-center justify-between text-label text-ink"
              >
                <span className="truncate">{formatWorkoutType(w.workoutType)}</span>
                <span className="text-muted whitespace-nowrap ml-2">
                  {w.durationMinutes.toLocaleString()} min ·{' '}
                  {w.calories.toLocaleString()} cal
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lastSync && (
        <p className="mt-3 text-label text-hint">
          Last synced:{' '}
          {new Date(lastSync).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      )}
    </BottomSheet>
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
    <div className="tile p-3 min-h-[64px] flex flex-col">
      <p className="micro text-green-700">
        {label}
      </p>
      {value === null ? (
        <p className="mt-1.5 text-label text-muted">no data</p>
      ) : (
        <p className="mt-1.5 leading-none">
          <span
            className={`text-title ${
              met ? 'text-green-700' : 'text-ink'
            }`}
          >
            {value}
          </span>{' '}
          <span className="text-label text-muted">{target}</span>
        </p>
      )}
    </div>
  );
}
