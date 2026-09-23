import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { ProgressBar } from '../components/ui/primitives';
import { getUserPreferences } from '../lib/userPreferences';
import { getFitnessScore, type ScoreMark } from '../lib/fitnessScore';
import { summaryNarrative } from '../lib/pillarNarrative';
import { computeDeliveryStreak, getDeliveryWeek } from '../lib/deliveryHelpers';
import {
  startOfWeekISODate,
  currentWeekISODates,
  todayISODate,
} from '../lib/dateHelpers';
import { DEFAULT_DAILY_NUTRITION_TARGETS } from '../lib/defaults';
import { COLOR } from '../lib/brand';

export default function Home() {
  return (
    <>
      <DashboardHeader />
      <div className="px-4 mt-4 space-y-3">
        <FitnessSummary />
        <NutritionSummary />
        <HealthSummary />
      </div>
    </>
  );
}

// Dial — the week's overall fullness as one %. A conic ring: Green 700 for
// the filled share, Stone for the rest.
function ScoreDial({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <div
      className="w-[84px] h-[84px] rounded-full flex items-center justify-center shrink-0"
      style={{
        background: `conic-gradient(${COLOR.green700} ${clamped}%, ${COLOR.stone} 0)`,
      }}
    >
      <span className="w-[66px] h-[66px] rounded-full bg-white flex items-center justify-center text-title text-ink tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// One mark's honest breakdown: actual/target over a Green 700 bar.
function ScoreBar({ mark }: { mark: ScoreMark }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-muted">{mark.label}</span>
        <span className="text-label font-semibold text-ink tabular-nums">
          {mark.actual}/{mark.target}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={mark.fraction} max={1} height={6} />
      </div>
    </div>
  );
}

function StripStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 text-center">
      <p className="text-title text-ink tabular-nums">{value}</p>
      <p className="text-label text-muted mt-0.5">{label}</p>
    </div>
  );
}

function FitnessSummary() {
  const score = useLiveQuery(() => getFitnessScore(), []);

  // Bars for participating marks only (target 0 / no data drop out).
  const bars = score?.marks.filter((m) => m.participates) ?? [];
  const strip = score?.strip;

  // Four-state hype summary (win + nudge / all-clear / early-days / all-low).
  const narrative = score
    ? summaryNarrative(
        score.marks.map((m) => ({
          key: m.key,
          fraction: m.fraction,
          participates: m.participates,
        })),
        score.daysElapsed,
        todayISODate(),
      )
    : null;

  return (
    <Link to="/fitness" className="card block p-4">
      <p className="eyebrow">Fitness Score</p>

      <div className="mt-3 flex items-center gap-4">
        <ScoreDial pct={score?.dialPct ?? 0} />
        <div className="flex-1 space-y-2">
          {bars.length === 0 ? (
            <p className="text-label text-muted">
              Set weekly targets in Settings to see your score.
            </p>
          ) : (
            bars.map((m) => <ScoreBar key={m.key} mark={m} />)
          )}
        </div>
      </div>

      {narrative && (
        <div className="callout mt-3 space-y-0.5">
          {narrative.message && (
            <p className="font-semibold text-green-900">{narrative.message}</p>
          )}
          {narrative.win && (
            <p className="font-semibold text-green-900">{narrative.win}</p>
          )}
          {narrative.nudge && <p className="text-muted">→ {narrative.nudge}</p>}
          {narrative.allClear && (
            <p className="font-semibold text-green-900">{narrative.allClear}</p>
          )}
        </div>
      )}

      {strip && (
        <div className="mt-3 pt-3 border-t border-hairline flex">
          <StripStat
            label="cal/day"
            value={strip.calories === null ? '—' : strip.calories.toLocaleString()}
          />
          <StripStat
            label="exercise min/day"
            value={strip.exerciseMinutes.toLocaleString()}
          />
          <StripStat
            label="steps/day"
            value={strip.steps === null ? '—' : strip.steps.toLocaleString()}
          />
        </div>
      )}
    </Link>
  );
}

function NutritionSummary() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const delivery = useLiveQuery(() => computeDeliveryStreak(), [], {
    currentStreak: 0,
    longestStreak: 0,
  });
  const protein =
    prefs?.protein_grams_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.protein_grams;
  const water =
    prefs?.water_glasses_daily ?? DEFAULT_DAILY_NUTRITION_TARGETS.water_glasses;

  // This week's delivery status, Sun→Sat — clean/ordered/unmarked dots that
  // mirror the delivery card's colors (Green 700 clean, Bronze Amber ordered).
  const weekStart = startOfWeekISODate();
  const deliveryWeek = useLiveQuery(() => getDeliveryWeek(weekStart), [weekStart]);
  const weekDates = currentWeekISODates();

  return (
    <Link to="/nutrition" className="card block p-4">
      <p className="eyebrow">Nutrition</p>
      <p className="mt-2 text-body text-ink">
        Protein {protein}g · Water {water} glasses · {delivery.currentStreak} day delivery streak
      </p>
      <div className="mt-3 grid grid-cols-7">
        {weekDates.map((date) => {
          const status = deliveryWeek?.get(date)?.status ?? null;
          const bg =
            status === 'clean'
              ? COLOR.green700
              : status === 'ordered'
                ? COLOR.amber
                : COLOR.stone;
          return (
            <div key={date} className="flex justify-center">
              <span
                className="rounded-full block"
                style={{ width: 10, height: 10, background: bg }}
              />
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function HealthSummary() {
  return (
    <Link to="/health" className="tile block p-4">
      <p className="eyebrow">Health</p>
      <p className="mt-2 text-body text-hint">No check-ins configured yet</p>
    </Link>
  );
}
