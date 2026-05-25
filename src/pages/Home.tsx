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
import { computeDeliveryStreak } from '../lib/deliveryHelpers';
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
      <p className="mt-2 text-[13px] text-ink">
        Lower {lower?.thisWeekCount ?? 0}/{lowerT} · Upper {upper?.thisWeekCount ?? 0}/{upperT} · Cardio {cardio?.qualifyingCount ?? 0}/{cardioT}
      </p>
      <span className="mt-2 inline-block bg-[#edf7f2] text-green-mid text-[11px] font-medium rounded-full px-2.5 py-1">
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

  return (
    <Link to="/nutrition" className="block bg-card shadow-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <SummaryLabel>Nutrition</SummaryLabel>
        <LeafIcon />
      </div>
      <p className="mt-2 text-[13px] text-ink">
        Protein {protein}g · Water {water} glasses · {delivery.currentStreak} day delivery streak
      </p>
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
