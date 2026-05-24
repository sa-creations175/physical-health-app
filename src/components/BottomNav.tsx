import { NavLink } from 'react-router-dom';
import { LayoutGrid, Dumbbell, Leaf, Heart, PlusCircle } from 'lucide-react';

// Five primary tabs. Settings moved off the nav → gear in the Home header.
// Log routes to the existing strength type-select (unchanged).
const tabs = [
  { to: '/', label: 'Home', icon: LayoutGrid, end: true },
  { to: '/fitness', label: 'Fitness', icon: Dumbbell, end: false },
  { to: '/nutrition', label: 'Nutrition', icon: Leaf, end: false },
  { to: '/health', label: 'Health', icon: Heart, end: false },
  { to: '/log/strength', label: 'Log', icon: PlusCircle, end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-charcoal border-t border-divider"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-colors ${
                  isActive ? 'text-green-mint' : 'text-ink-hint'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span className="text-[10px] tracking-micro uppercase font-medium">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
