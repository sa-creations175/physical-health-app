import { useState } from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StandardsSheet from '../components/fitness/StandardsSheet';
import { PairRow } from '../components/fitness/parts';
import { HOME_MARGIN_ABOVE_TAB_BAR } from '../lib/cardSizes';
import {
  CheckupsCard,
  HabitsCard,
  HomeRecoveryCard,
  HygieneCard,
  MovementCard,
  NutritionCard,
  SleepCard,
} from '../components/home/HomeCards';

// Home (B7): one screen, no scrolling. It's exactly the height of the screen
// frame's content area (100cqh: between the locked header and the tab bar), and the
// cards spread evenly down it, ending a 15px margin above the tab bar, so
// they breathe on a tall phone and pack closer on a shorter one. The margin
// is shared with Fitness (lib/cardSizes.ts).

export default function Home() {
  const [standardsOpen, setStandardsOpen] = useState(false);
  return (
    <div className="flex flex-col" style={{ height: '100cqh' }}>
      <DashboardHeader onSeeStandards={() => setStandardsOpen(true)} />
      <div
        className="flex-1 min-h-0 px-4 pt-2 flex flex-col justify-between gap-1.5"
        style={{ paddingBottom: HOME_MARGIN_ABOVE_TAB_BAR }}
      >
        <MovementCard />
        <NutritionCard />
        <PairRow rows={4}>
          <SleepCard />
          <HomeRecoveryCard />
        </PairRow>
        <PairRow rows={4}>
          <HygieneCard />
          <HabitsCard />
        </PairRow>
        <CheckupsCard />
      </div>
      {standardsOpen && <StandardsSheet onClose={() => setStandardsOpen(false)} />}
    </div>
  );
}
