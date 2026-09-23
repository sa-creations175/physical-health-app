import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import HeaderStrip from '../ui/HeaderStrip';
import WeekStrip from './WeekStrip';
import { getMoveStreak } from '../../lib/moveStreak';
import { useToast } from '../ui/Toast';
import { dayName, dateLabel, weekNumber } from '../../lib/dateHelpers';

// Home's header strip: where you are (week), what it is (the day), then the
// date and the move goal streak on the subtitle line, then the week strip.
// Settings sits top right.
export default function DashboardHeader() {
  const { showToast } = useToast();
  // Re-read when the daily goals change (the calories goal drives the streak).
  const streak = useLiveQuery(() => getMoveStreak(), [], null);
  const now = new Date();

  return (
    <HeaderStrip
      eyebrow={`Body · Week ${weekNumber(now)}`}
      title={dayName(now)}
      subtitle={
        <>
          {dateLabel(now)}
          {streak ? (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => showToast('Days at or above your calories goal')}
                className="underline decoration-dotted underline-offset-4"
              >
                {streak}-day move goal streak
              </button>
            </>
          ) : null}
        </>
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
    >
      <WeekStrip />
    </HeaderStrip>
  );
}
