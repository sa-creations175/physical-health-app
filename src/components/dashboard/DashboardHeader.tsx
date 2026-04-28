import { useLiveQuery } from 'dexie-react-hooks';
import { computeStreak } from '../../lib/dashboardQueries';
import { dayName, dateLabel, weekNumber } from '../../lib/dateHelpers';

export default function DashboardHeader() {
  const streak = useLiveQuery(() => computeStreak(), [], 0) ?? 0;
  const now = new Date();

  return (
    <header className="px-5 pt-8 pb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-medium text-ink leading-tight">
          {dayName(now)}
        </h1>
        <p className="text-[12px] text-ink-soft mt-1">
          {dateLabel(now)} · Week {weekNumber(now)}
        </p>
      </div>
      <div
        className="bg-green-deep text-green-light text-[11px] font-medium uppercase tracking-micro rounded-full px-3 py-1.5 whitespace-nowrap"
        title="Consecutive days with at least one strength or cardio session"
      >
        {streak} day{streak === 1 ? '' : 's'}
      </div>
    </header>
  );
}
