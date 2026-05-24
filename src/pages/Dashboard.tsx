import { useState, type ComponentType } from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import LiftingSection from '../components/dashboard/LiftingSection';
import CardioSection from '../components/dashboard/CardioSection';
import NutritionSection from '../components/dashboard/NutritionSection';
import DeliveryStreakCard from '../components/dashboard/DeliveryStreakCard';
import DailyBundleCard from '../components/dashboard/DailyBundleCard';
import AppleWatchSection from '../components/dashboard/AppleWatchSection';
import DashboardCTAs from '../components/dashboard/DashboardCTAs';
import DashboardReorder from '../components/dashboard/DashboardReorder';
import { useDashboardConfig } from '../hooks/useDashboardConfig';

// Section key → component. Each section component takes a `label` so renames
// from the reorder view render immediately. Keys match DASHBOARD_SECTION_KEYS.
const SECTION_COMPONENTS: Record<string, ComponentType<{ label: string }>> = {
  lifting: LiftingSection,
  cardio: CardioSection,
  nutrition: NutritionSection,
  delivery_streak: DeliveryStreakCard,
  daily_bundle: DailyBundleCard,
  apple_watch: AppleWatchSection,
};

export default function Dashboard() {
  const [reordering, setReordering] = useState(false);
  const { orderedSections, allSections, config, updateOrder, updateSection } =
    useDashboardConfig();

  return (
    <>
      <DashboardHeader
        onReorder={() => setReordering(true)}
        reordering={reordering}
      />

      {reordering ? (
        <DashboardReorder
          allSections={allSections}
          config={config}
          updateOrder={updateOrder}
          updateSection={updateSection}
          onDone={() => setReordering(false)}
        />
      ) : (
        <>
          <DashboardCTAs />
          {orderedSections.map((key) => {
            const Section = SECTION_COMPONENTS[key];
            if (!Section) return null;
            return <Section key={key} label={config[key]?.label ?? ''} />;
          })}
          <div className="px-5 mt-6">
            <button
              type="button"
              onClick={() => setReordering(true)}
              className="w-full bg-card text-green-mid border border-green-mid rounded-xl py-3 text-[14px] font-medium min-h-[48px]"
            >
              Reorder sections
            </button>
          </div>
        </>
      )}
    </>
  );
}
