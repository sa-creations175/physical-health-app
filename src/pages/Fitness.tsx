import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { History as HistoryIcon, Library, Watch } from 'lucide-react';
import HeaderStrip from '../components/ui/HeaderStrip';
import BottomSheet from '../components/ui/BottomSheet';
import MoveStreakPill from '../components/dashboard/MoveStreakPill';
import DailyMovementCard from '../components/fitness/DailyMovementCard';
import FitnessScoreCard from '../components/fitness/FitnessScoreCard';
import { QuickRepsCard, RecoveryCard } from '../components/fitness/RepsAndRecovery';
import TrainingDaySheet from '../components/fitness/TrainingDaySheet';
import DetailsCards from '../components/fitness/DetailsCards';
import { detailsId } from '../lib/fitnessFormat';
import YourGoalsSheet, { type GoalsSection } from '../components/fitness/YourGoalsSheet';
import AppleWatchSheet from '../components/activity/AppleWatchSheet';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import CustomGoalCard from '../components/activity/CustomGoalCard';
import AutoSavedNotices from '../components/activity/AutoSavedNotices';
import { getGoals, goalFor } from '../lib/goals';
import { getFitnessScore } from '../lib/fitnessScore';
import { getStandardsWeek, type RingKey } from '../lib/bodySignals';
import { weekNumber } from '../lib/dateHelpers';
import type { BodyGoal } from '../db/types';

// The Fitness tab (body-fitness-proto.html, with the Fitness score card and
// day sheet from body-fitness-dayview-proto.html): Daily movement, the
// Fitness score, Start a session and Goals, Quick reps and Recovery,
// History / Library / Apple Watch, then one Details card per ring. What the
// old tab showed that the new one doesn't place yet sits at the bottom under
// "Still to place", working as before.
export default function Fitness() {
  const navigate = useNavigate();
  const topRef = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<RingKey | null>(null);
  const [flash, setFlash] = useState<RingKey | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [watchOpen, setWatchOpen] = useState(false);
  const [standardsOpen, setStandardsOpen] = useState(false);

  // The goals sheet edits a snapshot of the goals, loaded before it opens.
  const [goals, setGoals] = useState<{ week: BodyGoal[]; day: BodyGoal[]; section?: GoalsSection } | null>(null);
  const openGoals = async (section?: GoalsSection) =>
    setGoals({ week: await getGoals('week'), day: await getGoals('day'), section });

  // "<Type> details ›": scroll down to that ring's card and outline it briefly.
  function showDetails(key: RingKey) {
    document.getElementById(detailsId(key))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlash(key);
    window.setTimeout(() => setFlash((f) => (f === key ? null : f)), 1200);
  }
  const backToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <div className="pb-4" ref={topRef}>
      <FitnessHeader onSeeStandards={() => setStandardsOpen(true)} />

      <div className="px-4 mt-3 space-y-2.5">
        <DailyMovementCard onEditGoal={() => void openGoals('daily')} />
        <FitnessScoreCard
          selected={ring}
          onSelect={setRing}
          onOpenDay={setDay}
          onOpenGoals={() => void openGoals('sess')}
          onShowDetails={showDetails}
        />
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate('/log/strength')} className="btn-primary flex-1">
            Start a session
          </button>
          <button type="button" onClick={() => void openGoals()} className="btn tile text-green-700 px-5">
            Goals
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <QuickRepsCard />
          <RecoveryCard />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ToolTile icon={<HistoryIcon size={20} strokeWidth={2} />} label="History" onClick={() => navigate('/history')} />
          <ToolTile icon={<Library size={20} strokeWidth={2} />} label="Library" onClick={() => navigate('/library')} />
          <ToolTile icon={<Watch size={20} strokeWidth={2} />} label="Apple Watch" onClick={() => setWatchOpen(true)} />
        </div>
      </div>

      <div className="px-4">
        <DetailsCards flash={flash} onTop={backToTop} />
        <StillToPlace />
      </div>

      {day && <TrainingDaySheet date={day} onClose={() => setDay(null)} />}
      {watchOpen && <AppleWatchSheet onClose={() => setWatchOpen(false)} />}
      {standardsOpen && <StandardsSheet onClose={() => setStandardsOpen(false)} />}
      {goals && (
        <YourGoalsSheet week={goals.week} day={goals.day} section={goals.section} onClose={() => setGoals(null)} />
      )}
    </div>
  );
}

function FitnessHeader({ onSeeStandards }: { onSeeStandards: () => void }) {
  const now = new Date();
  const standards = useLiveQuery(() => getStandardsWeek(), []);
  const met = standards?.filter((s) => s.met).length ?? 0;
  return (
    <HeaderStrip
      eyebrow={`Fitness · Week ${weekNumber(now)}`}
      badge={<MoveStreakPill />}
      title={now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      subtitle={
        <button type="button" onClick={onSeeStandards} className="text-left">
          Moving my body standards:{' '}
          <b className="font-bold text-ink">
            {met} of {standards?.length ?? 3}
          </b>{' '}
          met · see which ›
        </button>
      }
    />
  );
}

// The three health standards this week, and whether each is met.
function StandardsSheet({ onClose }: { onClose: () => void }) {
  const standards = useLiveQuery(() => getStandardsWeek(), []);
  return (
    <BottomSheet onClose={onClose} label="Moving my body standards">
      <p className="eyebrow pr-10">Moving my body</p>
      <h2 className="text-heading text-ink mt-0.5">Standards this week</h2>
      <p className="text-label text-muted mt-1 leading-snug">
        Health standards, the same whatever goals you set. Your own goals are under Goals.
      </p>
      <div className="mt-2">
        {(standards ?? []).map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2 py-2.5 border-t border-hairline">
            <div>
              <p className="text-body font-semibold text-ink">{s.label}</p>
              <p className="text-label text-muted tabular-nums">
                {s.actual.toLocaleString()} of {s.standard} {s.unit} this week
              </p>
            </div>
            <span className={`text-label font-bold ${s.met ? 'text-green-700' : 'text-amber-text'}`}>
              {s.met ? 'At or past the line' : 'Short of the line'}
            </span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}

function ToolTile({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card flex flex-col items-center justify-center gap-1 py-2.5 min-h-[64px] text-green-700"
    >
      {icon}
      <span className="text-label font-semibold text-ink">{label}</span>
    </button>
  );
}

// Everything the old Fitness tab showed that the new screen doesn't place
// yet, working exactly as it did: the "saved for you" notices, one card per
// weekly goal (with its one-liner, its day dots and per-day editing, the
// Daily Bundle's day grid and weekly totals, Cardio's qualifying minutes,
// short sessions and Watch count, a card for a goal you added such as Swim),
// and the average exercise minutes a day.
function StillToPlace() {
  const weekly = useLiveQuery(() => getGoals('week'), [], [] as BodyGoal[]);
  const daily = useLiveQuery(() => getGoals('day'), [], [] as BodyGoal[]);
  const score = useLiveQuery(() => getFitnessScore(), []);
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));
  const exerciseGoal = goalFor(daily, 'exercise_minutes')?.target ?? null;

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
    <section className="mt-8 pt-3.5 border-t border-hairline">
      <p className="eyebrow text-hint">Still to place</p>
      <p className="text-label text-muted mt-1">From the old Fitness tab, working as before, until each has a place.</p>
      <div className="mt-3 space-y-3">
        <AutoSavedNotices />
        {weekly.filter((g) => g.active && g.target > 0).map(card)}
        <div className="card px-4 py-3 flex items-baseline justify-between gap-2">
          <span className="text-label text-muted">Exercise minutes a day</span>
          <span className="text-label text-muted">
            <b className="text-title text-ink tabular-nums">{(score?.averages.exercise_minutes ?? 0).toLocaleString()}</b>
            {exerciseGoal !== null && <> · goal {exerciseGoal}</>}
          </span>
        </div>
      </div>
    </section>
  );
}
