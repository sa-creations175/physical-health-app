import { NavLink } from 'react-router-dom';
import { LayoutGrid, Dumbbell, Apple, ShieldPlus, CirclePlus } from 'lucide-react';

// Five primary tabs. Settings moved off the nav → gear in the Home header.
// Log routes to the existing strength type-select (unchanged).
// Tab bar per PERSONAL_OS_BRAND.md section 6: white, hairline on top, a Lucide
// icon over a sentence-case Label; active Green 700 at 700 weight. Nothing
// under the labels but the iPhone's own home-indicator area (Build 9).
const tabs = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/fitness', label: 'Fitness', icon: Dumbbell, end: false },
  { to: '/nutrition', label: 'Nutrition', icon: Apple, end: false },
  { to: '/health', label: 'Health', icon: ShieldPlus, end: false },
  { to: '/log/strength', label: 'Log', icon: CirclePlus, end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-hairline"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 pt-2.5 pb-0.5 text-label transition-colors ${
                  isActive ? 'text-green-700 font-bold' : 'text-hint font-medium'
                }`
              }
            >
              <Icon size={22} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
