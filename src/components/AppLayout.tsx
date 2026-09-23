import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  // The workout session screen is a focus screen: its own footer (Save for
  // later / Finish session) takes the tab bar's place.
  const { pathname } = useLocation();
  const inSession = pathname.startsWith('/log/strength/active/');
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <main className="flex-1 pb-24 w-full max-w-md mx-auto">
        <Outlet />
      </main>
      {!inSession && <BottomNav />}
    </div>
  );
}
