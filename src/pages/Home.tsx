import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { DumbbellIcon, LeafIcon, HeartPulseIcon } from '../components/dashboard/PillarIcons';
import {
  getLiftingSummary,
  getCardioSummary,
  computeStreak,
} from '../lib/dashboardQueries';
import { getUserPreferences } from '../lib/userPreferences';
import { computeDeliveryStreak, getDeliveryWeek } from '../lib/deliveryHelpers';
import { startOfWeekISODate, currentWeekISODates } from '../lib/dateHelpers';
import {
  DEFAULT_WEEKLY_LIFTING_TARGETS,
  DEFAULT_CARDIO_WEEKLY_TARGET,
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
  DEFAULT_DAILY_NUTRITION_TARGETS,
} from '../lib/defaults';

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

// Weekly progress ring for the Home Fitness card. r=24 → circumference ≈ 150.8;
// the progress arc length scales with count/target. Rendered only when
// target > 0 (the caller guards). Geometry per the dashboard spec.
function ProgressRing({
  count,
  target,
  color,
  label,
}: {
  count: number;
  target: number;
  color: string;
  label: string;
}) {
  const dash = Math.min(count / target, 1) * 150.8;
  return (
    <div className="flex flex-col items-center">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="24" fill="none" stroke="#e8ebe8" strokeWidth="6" />
        <circle
          cx="30"
          cy="30"
          r="24"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} 150.8`}
          transform="rotate(-90 30 30)"
        />
        <text
          x="30"
          y="30"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="500"
          fill="#0d1f18"
        >
          {count}/{target}
        </text>
      </svg>
      <span className="text-[11px]" style={{ color: '#5a7a6e' }}>
        {label}
      </span>
    </div>
  );
}

function FitnessSummary() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const lower = useLiveQuery(() => getLiftingSummary('lower'), []);
  const upper = useLiveQuery(() => getLiftingSummary('upper'), []);
  const threshold =
    prefs?.cardio_threshold_minutes ?? DEFAULT_CARDIO_THRESHOLD_MINUTES;
  const cardio = useLiveQuery(() => getCardioSummary(threshold), [threshold]);
  const streak = useLiveQuery(() => computeStreak(), [], 0) ?? 0;

  const lowerT = prefs?.lifting_target_lower ?? DEFAULT_WEEKLY_LIFTING_TARGETS.lower;
  const upperT = prefs?.lifting_target_upper ?? DEFAULT_WEEKLY_LIFTING_TARGETS.upper;
  const cardioT = prefs?.cardio_target_weekly ?? DEFAULT_CARDIO_WEEKLY_TARGET;

  return (
    <Link to="/fitness" className="block bg-card shadow-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <SummaryLabel>Fitness</SummaryLabel>
        <DumbbellIcon />
      </div>
      <div className="mt-3 flex justify-around">
        {lowerT > 0 && (
          <ProgressRing
            count={lower?.thisWeekCount ?? 0}
            target={lowerT}
            color="#0f3d2e"
            label="Lower"
          />
        )}
        {upperT > 0 && (
          <ProgressRing
            count={upper?.thisWeekCount ?? 0}
            target={upperT}
            color="#1a6b4a"
            label="Upper"
          />
        )}
        {cardioT > 0 && (
          <ProgressRing
            count={cardio?.qualifyingCount ?? 0}
            target={cardioT}
            color="#22c37e"
            label="Cardio"
          />
        )}
      </div>
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
