import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { DumbbellIcon, LeafIcon, HeartPulseIcon } from '../components/dashboard/PillarIcons';
import { computeStreak } from '../lib/dashboardQueries';
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

export default function Home() {
  return (
    <>
      <DashboardHeader />
      <div className="px-5 mt-5 space-y-4">
        <FitnessSummary />
        <NutritionSummary />
        <HealthSummary />
      </div>
    </>
  );
}

function SummaryLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-display uppercase tracking-micro text-green-mid">
      {children}
    </span>
  );
}

// Big dial — the week's overall fullness as one %. SVG ring, r=28 →
// circumference ≈ 175.9; the arc scales with pct/100.
function ScoreDial({ pct }: { pct: number }) {
  const dash = (Math.max(0, Math.min(pct, 100)) / 100) * 175.9;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r="28" fill="none" stroke="#e8ebe8" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r="28"
        fill="none"
        stroke="#0f3d2e"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} 175.9`}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="18"
        fontWeight="600"
        fill="#0d1f18"
      >
        {pct}%
      </text>
    </svg>
  );
}

// One mark's honest breakdown: a fill bar in the mark's color + actual/target.
function ScoreBar({ mark }: { mark: ScoreMark }) {
  const width = Math.round(mark.fraction * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] text-[#5a7a6e]">{mark.label}</span>
        <span className="text-[10px] text-ink tabular-nums">
          {mark.actual}/{mark.target}
        </span>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full" style={{ background: '#e8ebe8' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, background: mark.color }}
        />
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
      <p className="text-[14px] font-medium text-ink">{value}</p>
      <p className="text-[10px] text-[#5a7a6e] mt-0.5">{label}</p>
    </div>
  );
}

function FitnessSummary() {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const streak = useLiveQuery(() => computeStreak(), [], 0) ?? 0;

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
    <Link to="/fitness" className="block bg-card shadow-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <SummaryLabel>Fitness Score</SummaryLabel>
        <DumbbellIcon />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <ScoreDial pct={score?.dialPct ?? 0} />
        <div className="flex-1 space-y-1.5">
          {bars.length === 0 ? (
            <p className="text-[12px] text-card-mute">
              Set weekly targets in Settings to see your score.
            </p>
          ) : (
            bars.map((m) => <ScoreBar key={m.key} mark={m} />)
          )}
        </div>
      </div>

      {narrative && (
        <div className="mt-3 space-y-0.5">
          {narrative.message && (
            <p className="text-[12px] text-ink leading-snug">{narrative.message}</p>
          )}
          {narrative.win && (
            <p className="text-[12px] text-ink leading-snug">{narrative.win}</p>
          )}
          {narrative.nudge && (
            <p className="text-[12px] text-ink-soft leading-snug">
              → {narrative.nudge}
            </p>
          )}
          {narrative.allClear && (
            <p className="text-[12px] text-green-mid leading-snug">
              {narrative.allClear}
            </p>
          )}
        </div>
      )}

      {strip && (
        <div
          className="mt-3 pt-3 border-t flex"
          style={{ borderColor: '#f0f2f0' }}
        >
          <StripStat
            label="Cal/day"
            value={strip.calories === null ? '—' : strip.calories.toLocaleString()}
          />
          <StripStat
            label="Exercise min/day"
            value={strip.exerciseMinutes.toLocaleString()}
          />
          <StripStat
            label="Steps/day"
            value={strip.steps === null ? '—' : strip.steps.toLocaleString()}
          />
        </div>
      )}

      <span className="mt-3 inline-block bg-[#edf7f2] text-green-mid text-[11px] font-medium rounded-full px-2.5 py-1">
        {streak} day{streak === 1 ? '' : 's'} streak
      </span>
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
  // mirror the delivery card's colors (#0F6E56 clean, #E24B4A ordered).
  const weekStart = startOfWeekISODate();
  const deliveryWeek = useLiveQuery(() => getDeliveryWeek(weekStart), [weekStart]);
  const weekDates = currentWeekISODates();

  return (
    <Link to="/nutrition" className="block bg-card shadow-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <SummaryLabel>Nutrition</SummaryLabel>
        <LeafIcon />
      </div>
      <p className="mt-2 text-[13px] text-ink">
        Protein {protein}g · Water {water} glasses · {delivery.currentStreak} day delivery streak
      </p>
      <div className="mt-3 grid grid-cols-7">
        {weekDates.map((date) => {
          const status = deliveryWeek?.get(date)?.status ?? null;
          const bg =
            status === 'clean'
              ? '#0F6E56'
              : status === 'ordered'
                ? '#E24B4A'
                : '#e0e4e0';
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
    <Link
      to="/health"
      className="block shadow-card rounded-2xl p-4"
      style={{ background: '#edf7f2' }}
    >
      <div className="flex items-center justify-between">
        <SummaryLabel>Health</SummaryLabel>
        <HeartPulseIcon />
      </div>
      <p className="mt-2 text-[13px] text-dim">No check-ins configured yet</p>
    </Link>
  );
}
