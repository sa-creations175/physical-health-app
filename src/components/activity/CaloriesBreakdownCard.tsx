import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getFitnessScore } from '../../lib/fitnessScore';
import { Flame, Footprints } from 'lucide-react';
import { getCaloriesByDay, getHealthSnapshot } from '../../lib/healthkit';
import { getMoveGoalWeek } from '../../lib/moveStreak';
import { getGoals, goalFor } from '../../lib/goals';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';

// Calories burned per day this week (S to S) against the daily calories goal:
// today's calories and steps as two tiles, then a dashed goal line with green
// bars at or past it, Bronze Amber bars under it and Stone stubs for days with
// nothing yet, then the week's move goal days as dots. Below a hairline, the
// week's average exercise minutes and steps. All numbers come from the same source as Home's
// Fitness Score, so the two surfaces never disagree.

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CHART_H = 120; // px
const STUB_H = 5; // px

export default function CaloriesBreakdownCard({ onEditGoal }: { onEditGoal: () => void }) {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const dailyGoals = useLiveQuery(() => getGoals('day'), [], []);
  const goal = goalFor(dailyGoals, 'calories')?.target ?? null;
  const [perDay, setPerDay] = useState<number[] | null>(null);

  const [stepsToday, setStepsToday] = useState<number | null>(null);

  // HealthKit isn't Dexie-reactive: fetch the per-day calories and today's
  // steps once on mount.
  useEffect(() => {
    let cancelled = false;
    getCaloriesByDay()
      .then((d) => {
        if (!cancelled) setPerDay(d);
      })
      .catch((e) => console.error('Failed to load daily calories:', e));
    getHealthSnapshot()
      .then((snap) => {
        if (!cancelled) setStepsToday(snap ? snap.steps : null);
      })
      .catch((e) => console.error('Failed to load steps:', e));
    return () => {
      cancelled = true;
    };
  }, []);

  const weekDates = currentWeekISODates();
  const today = todayISODate();
  const max = Math.max(1, goal ?? 0, ...(perDay ?? [])) * 1.05;
  // Days this week at or above the calories goal: the shared count.
  const moveWeek = useLiveQuery(() => getMoveGoalWeek(), [], null);
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

      {/* Today, from HealthKit: active calories (this week's per-day read) and
          steps (the same snapshot the Apple Watch card reads). */}
      <div className="mt-3 flex gap-2.5">
        <TodayTile
          icon={<Flame size={15} strokeWidth={2} />}
          value={perDay ? (perDay[weekDates.indexOf(today)] ?? 0).toLocaleString() : '—'}
          label="cals today"
        />
        <TodayTile
          icon={<Footprints size={15} strokeWidth={2} />}
          value={stepsToday === null ? '—' : compactSteps(stepsToday)}
          label="steps today"
        />
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

      {moveWeek && (
        <div className="mt-3 pt-3 border-t border-hairline">
          <div className="flex gap-2.5" aria-hidden="true">
            {moveWeek.days.map((d) => (
              <span key={d.date} className="flex-1 flex justify-center">
                <span
                  className={`block w-3 h-3 rounded-full ${
                    d.state === 'met' ? 'bg-green-700' : d.state === 'missed' ? 'bg-amber' : 'bg-stone'
                  }`}
                  // Today is ringed in Green 300 (an outline, not a shadow).
                  style={
                    d.date === today
                      ? { outline: `1.5px solid ${COLOR.green300}`, outlineOffset: 2 }
                      : undefined
                  }
                />
              </span>
            ))}
          </div>
          <p className="text-label text-hint mt-2">
            <b className="font-bold text-muted">Move goal days</b> {moveWeek.met}/7
          </p>
        </div>
      )}

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

// 6,200 → "6.2k"; under 1,000 as is.
function compactSteps(n: number): string {
  if (n < 1000) return n.toLocaleString();
  return `${(Math.round(n / 100) / 10).toLocaleString()}k`;
}

// A today tile: an icon in a small white circle, then the number and what it
// counts, on Mint.
function TodayTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="tile flex-1 flex items-center justify-center gap-2 rounded-input px-2.5 py-1.5">
      <span className="w-7 h-7 rounded-full bg-white text-green-700 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <p>
        <span className="block text-title text-ink tabular-nums leading-tight">{value}</span>
        <span className="block text-label font-semibold text-muted leading-tight">{label}</span>
      </p>
    </div>
  );
}
