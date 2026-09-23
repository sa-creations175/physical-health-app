import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import HeaderStrip from '../components/ui/HeaderStrip';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import AppleWatchActivityCard from '../components/activity/AppleWatchActivityCard';
import CaloriesBreakdownCard from '../components/activity/CaloriesBreakdownCard';
import FitnessCardManager from '../components/activity/FitnessCardManager';
import AutoSavedNotices from '../components/activity/AutoSavedNotices';
import { useFitnessCardConfig } from '../lib/useFitnessCardConfig';
import { startOfWeekISODate, addDaysISO } from '../lib/dateHelpers';

export default function Fitness() {
  // Only one card expanded at a time — tapping an open card closes it.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  // Per-card show/hide, persisted in user_preferences (Full Body hidden by
  // default). The manage panel below the chart lets the user toggle any card.
  const { isVisible } = useFitnessCardConfig();
  const [managing, setManaging] = useState(false);

  return (
    <div className="pb-4">
      <FitnessHeader />

      <div className="px-4 mt-4 space-y-3">
        <AutoSavedNotices />
        <CaloriesBreakdownCard />
      </div>

      {/* Customize affordance — opens an inline panel of per-card toggles. */}
      <div className="px-4 mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setManaging((v) => !v)}
          className={managing ? 'pill pill-soft' : 'pill'}
          aria-expanded={managing}
        >
          <SettingsIcon aria-hidden="true" size={14} strokeWidth={2} />
          {managing ? 'Done' : 'Customize'}
        </button>
      </div>

      {managing && (
        <div className="px-4 mt-2">
          <FitnessCardManager />
        </div>
      )}

      {/* Default order is the June 5 warm→cool thermal gradient:
          Bundle → Cardio → Lower → Upper → (Full Body) → Mobility. Full Body
          rides with the lifting cards; the Apple Watch row is a data source,
          not a pillar, so it sits last with no color fill. Cards the user has
          hidden via the Customize panel are skipped. */}
      <div className="px-4 mt-3 space-y-3">
        {isVisible('bundle') && (
          <BundleActivityCard expanded={open === 'bundle'} onToggle={() => toggle('bundle')} />
        )}
        {isVisible('cardio') && (
          <CardioActivityCard expanded={open === 'cardio'} onToggle={() => toggle('cardio')} />
        )}
        {isVisible('lower') && (
          <LiftingActivityCard type="lower" label="Lower Body" expanded={open === 'lower'} onToggle={() => toggle('lower')} />
        )}
        {isVisible('upper') && (
          <LiftingActivityCard type="upper" label="Upper Body" expanded={open === 'upper'} onToggle={() => toggle('upper')} />
        )}
        {isVisible('full_body') && (
          <LiftingActivityCard type="full_body" label="Full Body" expanded={open === 'full_body'} onToggle={() => toggle('full_body')} />
        )}
        {isVisible('mobility') && (
          <MobilityActivityCard expanded={open === 'mobility'} onToggle={() => toggle('mobility')} />
        )}
        {isVisible('watch') && (
          <AppleWatchActivityCard expanded={open === 'watch'} onToggle={() => toggle('watch')} />
        )}
      </div>
    </div>
  );
}

function FitnessHeader() {
  const navigate = useNavigate();

  const weekStartISO = startOfWeekISODate();
  const start = new Date(weekStartISO + 'T00:00:00');
  const end = new Date(addDaysISO(weekStartISO, 6) + 'T00:00:00');
  const range = `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <HeaderStrip
      eyebrow="Body · Fitness"
      title="This Week"
      subtitle={`${range} · ${todayStr}`}
    >
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => navigate('/history')} className="pill">
          History
        </button>
        <button type="button" onClick={() => navigate('/library')} className="pill">
          Library
        </button>
      </div>
    </HeaderStrip>
  );
}
