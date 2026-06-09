import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import AppleWatchActivityCard from '../components/activity/AppleWatchActivityCard';
import CaloriesBreakdownCard from '../components/activity/CaloriesBreakdownCard';
import FitnessCardManager from '../components/activity/FitnessCardManager';
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

      <div className="px-5 mt-4">
        <CaloriesBreakdownCard />
      </div>

      {/* Customize affordance — opens an inline panel of per-card toggles. */}
      <div className="px-5 mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => setManaging((v) => !v)}
          className="flex items-center gap-1 text-[12px] font-medium text-[#5a7a6e]"
          aria-expanded={managing}
        >
          <span aria-hidden="true">⚙</span>
          {managing ? 'Done' : 'Customize'}
        </button>
      </div>

      {managing && (
        <div className="px-5 mt-2">
          <FitnessCardManager />
        </div>
      )}

      {/* Default order is the June 5 warm→cool thermal gradient:
          Bundle → Cardio → Lower → Upper → (Full Body) → Mobility. Full Body
          rides with the lifting cards; the Apple Watch row is a data source,
          not a pillar, so it sits last with no color fill. Cards the user has
          hidden via the Customize panel are skipped. */}
      <div className="px-5 mt-3 space-y-1.5">
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

  // Deep-green hero band matching the Home treatment: full-bleed, arc rings,
  // and a negative top margin that re-bleeds the band behind the status bar.
  return (
    <header
      style={{
        marginTop: 'calc(-1 * env(safe-area-inset-top))',
        // Extra top clearance vs. the Home header: the small "Fitness" eyebrow
        // label sits right at the top edge, so it needs more room below the
        // notch / Dynamic Island than Home's larger first line. The
        // env(safe-area-inset-top) reading is unreliable inside the WebView
        // (it can resolve to 0 before the viewport-fit=cover metas settle), so
        // floor it with max(...) against a physical fallback that already
        // clears the Dynamic Island, then add the eyebrow's own clearance.
        paddingTop:
          'calc(max(env(safe-area-inset-top), 59px) + 2.75rem)',
        background: '#0f3d2e',
      }}
      className="relative overflow-hidden px-5 pb-5 flex items-start justify-between gap-3"
    >
      <FitnessArcs />
      <div className="relative min-w-0">
        <p className="text-[10px] font-display uppercase tracking-micro text-white/60">
          Fitness
        </p>
        <h1 className="text-[22px] font-display font-semibold text-white leading-tight mt-0.5">
          This Week
        </h1>
        <p className="text-[12px] text-white/70 mt-1">{range}</p>
      </div>
      <div className="relative flex flex-col items-end gap-2">
        <span className="text-[12px] text-white/70 whitespace-nowrap">
          {todayStr}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="border border-white text-white rounded-full px-3 py-1 text-[13px] font-medium"
          >
            History
          </button>
          <button
            type="button"
            onClick={() => navigate('/library')}
            className="border border-white text-white rounded-full px-3 py-1 text-[13px] font-medium"
          >
            Library
          </button>
        </div>
      </div>
    </header>
  );
}

// Concentric partial rings, white at ~9% opacity, anchored off the right edge
// so the band's overflow-hidden clips them — same decoration as the Home hero.
function FitnessArcs() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2"
      width="230"
      height="230"
      viewBox="0 0 230 230"
      fill="none"
    >
      <g stroke="#ffffff" strokeOpacity="0.09" fill="none">
        <circle cx="150" cy="115" r="46" strokeWidth="2.5" />
        <circle cx="150" cy="115" r="80" strokeWidth="2.5" />
        <circle cx="150" cy="115" r="114" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
