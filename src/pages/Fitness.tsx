import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LiftingActivityCard from '../components/activity/LiftingActivityCard';
import CardioActivityCard from '../components/activity/CardioActivityCard';
import MobilityActivityCard from '../components/activity/MobilityActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';
import AppleWatchActivityCard from '../components/activity/AppleWatchActivityCard';

export default function Fitness() {
  const navigate = useNavigate();
  // Only one card expanded at a time — tapping an open card closes it.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  return (
    <div className="px-5 pt-8 pb-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-medium text-ink">Fitness</h1>
        <button
          type="button"
          onClick={() => navigate('/library')}
          className="text-green-mid border border-green-mid rounded-full px-3 py-1 text-[13px] font-medium"
        >
          Library
        </button>
      </header>

      <div className="mt-4 space-y-2">
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
