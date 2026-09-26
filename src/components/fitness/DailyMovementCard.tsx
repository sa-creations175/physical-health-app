import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Activity, Flame, Footprints } from 'lucide-react';
import { getFitnessScore } from '../../lib/fitnessScore';
import { getCaloriesByDay, getHealthSnapshot } from '../../lib/healthkit';
import { getMoveGoalWeek } from '../../lib/bodySignals';
import MoveStreak from '../ui/MoveStreak';
import { getGoals, goalFor } from '../../lib/goals';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';
import { CARD_PAD } from '../../lib/cardSizes';
import { compactNumber } from '../../lib/fitnessFormat';
import { CardHead, DayLetters, DotLabel } from './parts';

const CHART_H = 64; // px
const STUB_H = 4; // px

// Daily movement: today's calories and steps as two tiles, this week's
// calories per day against the daily calories goal (a dashed line; Green 700
// at or past it, Bronze Amber under it, Stone for days with nothing yet),
// Move goal days, and the week's average calories and steps a day. The
// calories and steps are the same HealthKit reads as the Fitness score and the
// move goal streak, so every surface agrees.
export default function DailyMovementCard({ onEditGoal }: { onEditGoal: () => void }) {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const dailyGoals = useLiveQuery(() => getGoals('day'), [], []);
  const goal = goalFor(dailyGoals, 'calories')?.target ?? null;
  const moveWeek = useLiveQuery(() => getMoveGoalWeek(), [], null);
  const [perDay, setPerDay] = useState<number[] | null>(null);
  const [stepsToday, setStepsToday] = useState<number | null>(null);

  // HealthKit isn't Dexie-reactive: read once on mount.
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
  const calsAvg = score?.averages.calories ?? null;
  const stepsAvg = score?.averages.steps ?? null;

  return (
    <div className={`card ${CARD_PAD}`}>
      <CardHead
        icon={<Activity size={16} strokeWidth={2} />}
        right={<MoveStreak />}
      >
        Daily Movement
      </CardHead>

      <div className="mt-2 flex gap-2.5">
        <TodayTile
          icon={<Flame size={15} strokeWidth={2} />}
          value={perDay ? (perDay[weekDates.indexOf(today)] ?? 0).toLocaleString() : '—'}
          label="cals today"
        />
        <TodayTile
          icon={<Footprints size={15} strokeWidth={2} />}
          value={stepsToday === null ? '—' : compactNumber(stepsToday)}
          label="steps today"
        />
      </div>

      <div className="relative mt-6" style={{ height: CHART_H }}>
        {goal !== null && (
          <div
            className="absolute inset-x-0 z-10 border-t border-dashed border-green-500"
            style={{ bottom: `${(goal / max) * 100}%` }}
          >
            <button
              type="button"
              onClick={onEditGoal}
              className="absolute right-0 -top-[18px] bg-white pl-1 text-micro font-semibold tracking-normal text-green-700"
            >
              Goal {goal.toLocaleString()}
            </button>
          </div>
        )}
        <div className="absolute inset-0 flex items-end gap-2">
          {weekDates.map((date, i) => {
            const value = perDay?.[i] ?? 0;
            const stub = date > today || value <= 0;
            const under = goal !== null && value < goal;
            return (
              <div key={date} className="flex-1 h-full flex items-end justify-center">
                <div
                  title={stub ? undefined : `${value.toLocaleString()} cal`}
                  className={`w-full max-w-[22px] rounded-t-[5px] rounded-b-sm ${
                    stub ? 'bg-stone' : under ? 'bg-amber' : 'bg-green-700'
                  }`}
                  style={{
                    height: stub ? STUB_H : `${(value / max) * 100}%`,
                    // Today's bar carries a thin Green 300 ring.
                    outline: date === today && !stub ? `1.5px solid ${COLOR.green300}` : undefined,
                    outlineOffset: 2,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-1">
        <DayLetters />
      </div>

      {moveWeek && (
        <p className="mt-1.5">
          <DotLabel label="Move goal days">{moveWeek.met}/7</DotLabel>
        </p>
      )}

      <div className="mt-2 pt-2 border-t border-hairline flex items-baseline justify-between gap-2 text-label text-muted">
        <b className="font-bold">Weekly avg</b>
        <span className="tabular-nums">{calsAvg === null ? '—' : calsAvg.toLocaleString()} cals a day</span>
        <span className="tabular-nums">{stepsAvg === null ? '—' : compactNumber(stepsAvg)} steps a day</span>
      </div>
    </div>
  );
}

// A today tile: an icon in a small white circle, then the number and what it
// counts, on Mint.
function TodayTile({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
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
