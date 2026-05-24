import { useState } from 'react';
import NutritionSection from '../components/dashboard/NutritionSection';
import DeliveryActivityCard from '../components/activity/DeliveryActivityCard';
import BundleActivityCard from '../components/activity/BundleActivityCard';

export default function Nutrition() {
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  return (
    <div className="pt-8 pb-4">
      <h1 className="px-5 text-[22px] font-medium text-ink">Nutrition</h1>

      {/* Daily logger — kept full (not a compact card). Renders its own
          section padding + "Today — Nutrition" label. */}
      <NutritionSection />

      <div className="px-5 mt-4 space-y-2">
        <DeliveryActivityCard expanded={open === 'delivery'} onToggle={() => toggle('delivery')} />
        <BundleActivityCard expanded={open === 'bundle'} onToggle={() => toggle('bundle')} />
      </div>
    </div>
  );
}
