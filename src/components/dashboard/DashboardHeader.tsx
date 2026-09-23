import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import HeaderStrip from '../ui/HeaderStrip';
import { computeStreak } from '../../lib/dashboardQueries';
import { dayName, dateLabel, weekNumber } from '../../lib/dateHelpers';

// Home's header strip: where you are (week), what it is (the day), then the
// date and the streak on the subtitle line. Settings sits top right.
export default function DashboardHeader() {
  const streak = useLiveQuery(() => computeStreak(), [], 0) ?? 0;
  const now = new Date();

  return (
    <HeaderStrip
      eyebrow={`Body · Week ${weekNumber(now)}`}
      title={dayName(now)}
      subtitle={
        <span title="Consecutive days with at least one strength or cardio session">
          {dateLabel(now)} · {streak} day{streak === 1 ? '' : 's'} streak
        </span>
      }
      right={
        <Link
          to="/settings"
          aria-label="Settings"
          className="w-11 h-11 rounded-full bg-white border border-hairline flex items-center justify-center text-green-700"
        >
          <SettingsIcon size={18} strokeWidth={2} />
        </Link>
      }
    />
  );
}
