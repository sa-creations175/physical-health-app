import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import HeaderStrip from '../components/ui/HeaderStrip';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import CustomGoalCard from '../components/activity/CustomGoalCard';
import AppleWatchActivityCard from '../components/activity/AppleWatchActivityCard';
import CaloriesBreakdownCard from '../components/activity/CaloriesBreakdownCard';
import AutoSavedNotices from '../components/activity/AutoSavedNotices';
import GoalsSheet from '../components/goals/GoalsSheet';
import MoveStreakPill from '../components/dashboard/MoveStreakPill';
import { getGoals } from '../lib/goals';
import { startOfWeekISODate, addDaysISO } from '../lib/dateHelpers';
import type { BodyGoal, GoalPeriod } from '../db/types';

// The Fitness tab. One card per weekly goal, in the goals' order (edit goals
// here or on Home and both change), then the Apple Watch.
export default function Fitness() {
  // Only one card expanded at a time — tapping an open card closes it.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));
  const weekly = useLiveQuery(() => getGoals('week'), [], [] as BodyGoal[]);

  // The goals sheet edits a snapshot of the goals, loaded before it opens.
  const [sheet, setSheet] = useState<{ period: GoalPeriod; goals: BodyGoal[] } | null>(null);
  const openGoals = async (period: GoalPeriod) => setSheet({ period, goals: await getGoals(period) });

  function card(goal: BodyGoal) {
    const props = { goal, expanded: open === goal.id, onToggle: () => toggle(goal.id) };
    switch (goal.metric) {
      case 'bundle':
        return <BundleActivityCard key={goal.id} {...props} />;
      case 'cardio':
        return <CardioActivityCard key={goal.id} {...props} />;
      case 'lower':
      case 'upper':
      case 'full_body':
        return <LiftingActivityCard key={goal.id} type={goal.metric} {...props} />;
      case 'mobility':
        return <MobilityActivityCard key={goal.id} {...props} />;
      case null:
        return <CustomGoalCard key={goal.id} {...props} />;
      default:
        return null;
    }
  }

  return (
    <div className="pb-4">
      <FitnessHeader onEditGoals={() => void openGoals('week')} />

      <div className="px-4 mt-4 space-y-3">
        <AutoSavedNotices />
        <CaloriesBreakdownCard onEditGoal={() => void openGoals('day')} />
        {weekly.filter((g) => g.active && g.target > 0).map(card)}
        <AppleWatchActivityCard expanded={open === 'watch'} onToggle={() => toggle('watch')} />
      </div>

      {sheet && (
        <GoalsSheet
          key={sheet.period}
          period={sheet.period}
          goals={sheet.goals}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function FitnessHeader({ onEditGoals }: { onEditGoals: () => void }) {
  const navigate = useNavigate();

  const weekStartISO = startOfWeekISODate();
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(addDaysISO(weekStartISO, 6) + 'T00:00:00');
  const range = `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} to ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <HeaderStrip
      eyebrow="Body · Fitness"
      badge={<MoveStreakPill />}
      title="This Week"
      subtitle={`${range} · ${weekday}`}
    >
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => navigate('/history')} className="pill">
          History
        </button>
        <button type="button" onClick={() => navigate('/library')} className="pill">
          Library
        </button>
        <button type="button" onClick={onEditGoals} className="pill pill-soft ml-auto">
          Edit goals
        </button>
      </div>
    </HeaderStrip>
  );
}
