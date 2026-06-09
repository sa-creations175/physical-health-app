import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getFitnessScore } from '../../lib/fitnessScore';
import { getCaloriesByDay } from '../../lib/healthkit';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';

// Per-day calorie breakdown for the Fitness page. A week of calories-burned
// bars (S–S) in pillar orange, scaled to the week's max, with future/empty
// days as faint grey stubs; below a hairline, the week's average exercise
// minutes and steps. All numbers come from the same source as the Home
// Fitness Score (calories + steps = HealthKit; exercise minutes = the score's
// app-logged daily average) so the two surfaces never disagree.

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const BAR_AREA_H = 56; // px — tallest bar; others scale to the week's max
const STUB_H = 4; // px — faint grey stub for empty / future days
const SCALE_LABEL_H = 12; // px — headroom above the bars for the max-value cap

const ORANGE = '#e0742f';
const STUB_GREY = '#e8ebe8';

export default function CaloriesBreakdownCard() {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const [perDay, setPerDay] = useState<number[] | null>(null);

  // HealthKit isn't Dexie-reactive — fetch the per-day calories once on mount.
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
  const max = Math.max(1, ...(perDay ?? []));
  const stepsAvg = score?.strip.steps ?? null;
  const exerciseMin = score?.strip.exerciseMinutes ?? 0;

  return (
    <div className="bg-card shadow-card rounded-2xl p-4">
      <p
        className="text-[10px] font-display uppercase tracking-micro"
        style={{ color: '#0f3d2e' }}
      >
        Calories Burned
      </p>

      {/* Bars — one per day, scaled to the week's max. A labeled hairline caps
          the top of the tallest bar so the scale has a concrete number; each
          bar also carries its exact value as a hover/long-press title. */}
      <div className="mt-3 relative" style={{ paddingTop: SCALE_LABEL_H }}>
        {perDay && max > 1 && (
          <div className="absolute inset-x-0 top-0 flex items-center gap-1.5">
            <span
              className="text-[9px] leading-none whitespace-nowrap"
              style={{ color: '#a8b3ad' }}
            >
              {max.toLocaleString()} cal
            </span>
            <div className="flex-1" style={{ borderTop: '0.5px dashed #e0e4e0' }} />
          </div>
        )}
        <div className="flex items-end gap-1.5" style={{ height: BAR_AREA_H }}>
        {weekDates.map((date, i) => {
          const value = perDay?.[i] ?? 0;
          const isFuture = date > today;
          const isStub = isFuture || value <= 0;
          const height = isStub
            ? STUB_H
            : Math.max(STUB_H, Math.round((value / max) * BAR_AREA_H));
          return (
            <div
              key={date}
              className="flex-1 flex items-end justify-center h-full"
            >
              <div
                title={isStub ? undefined : `${value.toLocaleString()} cal`}
                style={{
                  width: '68%',
                  height,
                  borderRadius: 3,
                  background: isStub ? STUB_GREY : ORANGE,
                }}
              />
            </div>
          );
        })}
        </div>
      </div>

      {/* Day labels — future days muted. */}
      <div className="mt-1 flex gap-1.5">
        {weekDates.map((date, i) => (
          <span
            key={date}
            className="flex-1 text-center text-[10px]"
            style={{ color: date > today ? '#c2ccc6' : '#5a7a6e' }}
          >
            {DAY_INITIALS[i]}
          </span>
        ))}
      </div>

      <div className="mt-3" style={{ borderTop: '0.5px solid #e0e4e0' }} />

      <div className="mt-3 flex">
        <div className="flex-1 text-center">
          <p className="text-[15px] font-medium text-ink">
            {exerciseMin.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#5a7a6e] mt-0.5">avg exercise min/day</p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-[15px] font-medium text-ink">
            {stepsAvg === null ? '—' : stepsAvg.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#5a7a6e] mt-0.5">avg steps/day</p>
        </div>
      </div>
    </div>
  );
}
