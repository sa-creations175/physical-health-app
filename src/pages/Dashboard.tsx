import DashboardHeader from '../components/dashboard/DashboardHeader';
import LiftingSection from '../components/dashboard/LiftingSection';
import CardioSection from '../components/dashboard/CardioSection';
import NutritionSection from '../components/dashboard/NutritionSection';
import DeliveryStreakCard from '../components/dashboard/DeliveryStreakCard';
import AppleWatchSection from '../components/dashboard/AppleWatchSection';
import DashboardCTAs from '../components/dashboard/DashboardCTAs';

export default function Dashboard() {
  return (
    <>
      <DashboardHeader />
      <DashboardCTAs />
      <LiftingSection />
      <CardioSection />
      <NutritionSection />
      <DeliveryStreakCard />
      <AppleWatchSection />
    </>
  );
}
