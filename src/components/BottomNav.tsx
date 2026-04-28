import { NavLink } from 'react-router-dom';
import { LayoutGrid, Dumbbell, BookOpen, Settings as SettingsIcon } from 'lucide-react';

const tabs = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/log/strength', label: 'Log', icon: Dumbbell, end: false },
  { to: '/library', label: 'Library', icon: BookOpen, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-charcoal border-t border-divider"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
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
