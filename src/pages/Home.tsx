import { useState } from 'react';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StandardsSheet from '../components/fitness/StandardsSheet';
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
// back the difference with a negative bottom margin.
const TAB_BAR = 57;
const MARGIN_ABOVE_TAB_BAR = 15;
const LAYOUT_BOTTOM_PAD = 96;

export default function Home() {
  const [standardsOpen, setStandardsOpen] = useState(false);
  const reserve = TAB_BAR + MARGIN_ABOVE_TAB_BAR;
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
        <div className="grid grid-cols-2 gap-2">
          <SleepCard />
          <HomeRecoveryCard />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <HygieneCard />
          <HabitsCard />
        </div>
        <CheckupsCard />
      </div>
      {standardsOpen && <StandardsSheet onClose={() => setStandardsOpen(false)} />}
    </div>
  );
}
