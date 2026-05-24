import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import AppleWatchActivityCard from '../components/activity/AppleWatchActivityCard';
import { startOfWeekISODate, addDaysISO } from '../lib/dateHelpers';

export default function Fitness() {
  // Only one card expanded at a time — tapping an open card closes it.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  return (
    <div className="pb-4">
      <FitnessHeader />

      <div className="px-5 mt-4 space-y-1.5">
        <LiftingActivityCard type="lower" label="Lower Body" expanded={open === 'lower'} onToggle={() => toggle('lower')} />
        <LiftingActivityCard type="upper" label="Upper Body" expanded={open === 'upper'} onToggle={() => toggle('upper')} />
        <LiftingActivityCard type="full_body" label="Full Body" expanded={open === 'full_body'} onToggle={() => toggle('full_body')} />
        <CardioActivityCard expanded={open === 'cardio'} onToggle={() => toggle('cardio')} />
        <MobilityActivityCard expanded={open === 'mobility'} onToggle={() => toggle('mobility')} />
        <BundleActivityCard expanded={open === 'bundle'} onToggle={() => toggle('bundle')} />
        <AppleWatchActivityCard expanded={open === 'watch'} onToggle={() => toggle('watch')} />
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
        paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
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
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="border border-white text-white rounded-full px-3 py-1 text-[13px] font-medium"
        >
          Library
        </button>
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
