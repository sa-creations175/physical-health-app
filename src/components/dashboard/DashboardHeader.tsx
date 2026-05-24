import { useLiveQuery } from 'dexie-react-hooks';
import { computeStreak } from '../../lib/dashboardQueries';
import { dayName, dateLabel, weekNumber } from '../../lib/dateHelpers';

export default function DashboardHeader() {
  const streak = useLiveQuery(() => computeStreak(), [], 0) ?? 0;
  const now = new Date();

  // Deep-green hero band. overflow-hidden clips the decorative arcs against
  // the band edges; every foreground element is `relative` so it stacks
  // above the arc layer. Text + streak pill flip to on-green treatments
  // (white / mint / translucent-white) since the charcoal-era colors would
  // wash out on the green.
  return (
    <header className="relative overflow-hidden bg-green-deep px-5 pt-8 pb-5 flex items-start justify-between gap-3">
      <HeroArcs />
      <div className="relative min-w-0">
        <h1 className="text-[22px] font-medium text-white leading-tight">
          {dayName(now)}
        </h1>
        <p className="text-[12px] text-green-light mt-1">
          {dateLabel(now)} · Week {weekNumber(now)}
        </p>
      </div>
      <div
        className="relative bg-white/15 text-white text-[11px] font-medium uppercase tracking-micro rounded-full px-3 py-1.5 whitespace-nowrap"
        title="Consecutive days with at least one strength or cardio session"
      >
        {streak} day{streak === 1 ? '' : 's'}
      </div>
    </header>
  );
}

// Decorative concentric partial rings — purely geometric "energy" behind the
// header text. White at ~9% opacity, anchored off the right edge so the band's
// overflow-hidden clips them into partial rings. Sized to stay clear of the
// day/date text on a 390px viewport. Non-interactive, hidden from a11y.
function HeroArcs() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -right-10 -translate-y-1/2"
      width="230"
      height="230"
      viewBox="0 0 230 230"
      fill="none"
    >
      <g stroke="#ffffff" strokeOpacity="0.09" fill="none">
        <circle cx="150" cy="115" r="46" strokeWidth="2.5" />
        <circle cx="150" cy="115" r="80" strokeWidth="2.5" />
        <circle cx="150" cy="115" r="114" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
