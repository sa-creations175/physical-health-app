import { useState } from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StandardsSheet from '../components/fitness/StandardsSheet';
import { PairRow } from '../components/fitness/parts';
import { HOME_MARGIN_ABOVE_TAB_BAR, LAYOUT_BOTTOM_PAD, TAB_BAR } from '../lib/cardSizes';
import {
  CheckupsCard,
  HabitsCard,
  HomeRecoveryCard,
  HygieneCard,
  MovementCard,
  NutritionCard,
  SleepCard,
} from '../components/home/HomeCards';

// Home (B7): one screen, no scrolling. The page is exactly the height left
// between the top of the screen and the tab bar (safe areas included), less a
// 15px margin above the tab bar, and the cards spread evenly down it, so they
// breathe on a tall phone and pack closer on a shorter one. The layout keeps
// 96px under every page for the tab bar; the tab bar is 57px, so Home takes
// back the difference with a negative bottom margin. The sizes are shared
// with Fitness (lib/cardSizes.ts).

export default function Home() {
  const [standardsOpen, setStandardsOpen] = useState(false);
  const reserve = TAB_BAR + HOME_MARGIN_ABOVE_TAB_BAR;
  return (
    <div
      className="flex flex-col"
      style={{
        height: `calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${reserve}px)`,
        marginBottom: reserve - LAYOUT_BOTTOM_PAD,
      }}
    >
      <DashboardHeader onSeeStandards={() => setStandardsOpen(true)} />
      <div className="flex-1 min-h-0 px-4 pt-2 flex flex-col justify-between gap-1.5">
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
