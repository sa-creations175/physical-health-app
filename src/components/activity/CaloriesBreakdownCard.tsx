import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getFitnessScore } from '../../lib/fitnessScore';
import { getCaloriesByDay } from '../../lib/healthkit';
import { getGoals, goalFor } from '../../lib/goals';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';

// Calories burned per day this week (S to S) against the daily calories goal:
// a dashed goal line, green bars at or past it, Bronze Amber bars under it,
// Stone stubs for days with nothing yet. Below a hairline, the week's average
// exercise minutes and steps. All numbers come from the same source as Home's
// Fitness Score, so the two surfaces never disagree.

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CHART_H = 120; // px
const STUB_H = 5; // px

export default function CaloriesBreakdownCard({ onEditGoal }: { onEditGoal: () => void }) {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const dailyGoals = useLiveQuery(() => getGoals('day'), [], []);
  const goal = goalFor(dailyGoals, 'calories')?.target ?? null;
  const [perDay, setPerDay] = useState<number[] | null>(null);

  // HealthKit isn't Dexie-reactive: fetch the per-day calories once on mount.
  useEffect(() => {
    let cancelled = false;
    getCaloriesByDay()
      .then((d) => {
        if (!cancelled) setPerDay(d);
      })
      .catch((e) => console.error('Failed to load daily calories:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const weekDates = currentWeekISODates();
  const today = todayISODate();
  const max = Math.max(1, goal ?? 0, ...(perDay ?? [])) * 1.05;
  const stepsAvg = score?.averages.steps ?? null;
  const exerciseMin = score?.averages.exercise_minutes ?? 0;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Calories Burned</p>
        <button type="button" onClick={onEditGoal} className="pill pill-soft py-1 px-2.5">
          {goal !== null ? `Goal ${goal.toLocaleString()}` : 'Set a goal'}
        </button>
      </div>

      <div className="relative mt-4" style={{ height: CHART_H }}>
        {goal !== null && (
          <div
            className="absolute inset-x-0 border-t border-dashed border-green-300"
            style={{ bottom: `${(goal / max) * 100}%` }}
          >
            <span className="absolute right-0 -top-4 text-micro font-normal tracking-normal text-hint">
              goal {goal.toLocaleString()}
            </span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-2.5">
          {weekDates.map((date, i) => {
            const value = perDay?.[i] ?? 0;
            const stub = date > today || value <= 0;
            const under = goal !== null && value < goal;
            return (
              <div key={date} className="flex-1 h-full flex items-end">
                <div
                  title={stub ? undefined : `${value.toLocaleString()} cal`}
                  className={`w-full rounded-t-md rounded-b-sm ${
                    stub ? 'bg-stone' : under ? 'bg-amber' : 'bg-green-700'
                  }`}
                  style={{ height: stub ? STUB_H : `${(value / max) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2.5 mt-1.5">
        {DAY_INITIALS.map((d, i) => (
          <span key={i} className="flex-1 text-center text-micro text-hint">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-hairline flex">
        <div className="flex-1 text-center">
          <p className="text-title text-ink tabular-nums">{exerciseMin.toLocaleString()}</p>
          <p className="text-label text-muted">exercise minutes a day</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-title text-ink tabular-nums">
            {stepsAvg === null ? '—' : stepsAvg.toLocaleString()}
          </p>
          <p className="text-label text-muted">steps a day</p>
        </div>
      </div>
    </div>
  );
}
