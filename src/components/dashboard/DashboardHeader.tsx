import { Link } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import HeaderStrip from '../ui/HeaderStrip';
import WeekStrip from './WeekStrip';
import MoveStreakPill from './MoveStreakPill';
import { dayName, dateLabel, weekNumber } from '../../lib/dateHelpers';

// Home's header strip: where you are (week) with the move goal streak pill,
// what it is (the day), the date, then the week strip. Settings sits top
// right.
export default function DashboardHeader() {
  const now = new Date();

  return (
    <HeaderStrip
      eyebrow={`Body · Week ${weekNumber(now)}`}
      title={dayName(now)}
      badge={<MoveStreakPill />}
      subtitle={dateLabel(now)}
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
