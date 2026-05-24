import SharedActivityCard from './SharedActivityCard';
import { WatchIcon } from './activityIcons';
import { DOT_COLOR } from '../../lib/dotHelpers';
import { currentWeekISODates } from '../../lib/dateHelpers';

const STATS = [
  { key: 'steps', label: 'Steps' },
  { key: 'active_cal', label: 'Active Cal' },
  { key: 'rest_hr', label: 'Rest HR' },
];

export default function AppleWatchActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  // No HealthKit data yet — every day reads grey.
  const dots = currentWeekISODates().map((date) => ({
    date,
    color: DOT_COLOR.none,
  }));

  return (
    <SharedActivityCard
      label="Apple Watch"
      badge={<span className="text-dim">not connected</span>}
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
      icon={<WatchIcon />}
    >
      <div className="grid grid-cols-3 gap-2">
        {STATS.map(({ key, label }) => (
          <div
            key={key}
            className="bg-[#eef1ef] rounded-xl p-3 min-h-[64px] flex flex-col"
          >
            <p className="text-[9px] tracking-micro uppercase text-green-mint font-semibold">
              {label}
            </p>
            <p className="mt-1.5 text-[12px] text-card-mute">no data yet</p>
          </div>
        ))}
      </div>
    </SharedActivityCard>
  );
}
