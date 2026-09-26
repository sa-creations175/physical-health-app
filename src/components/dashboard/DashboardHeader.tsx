import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Settings as SettingsIcon } from 'lucide-react';
import HeaderStrip from '../ui/HeaderStrip';
import { getStandardsWeek } from '../../lib/bodySignals';
import { weekNumber } from '../../lib/dateHelpers';

// Home's header strip (B7): where you are (the week), the date, and "Standards this week: N of M met · see which ›",
// counted from the shared standards list, so a standard added there changes
// this line too. Settings sits top right until the More tab exists.
export default function DashboardHeader({ onSeeStandards }: { onSeeStandards: () => void }) {
  const now = new Date();
  const standards = useLiveQuery(() => getStandardsWeek(), []);
  const met = standards?.filter((s) => s.met).length ?? 0;

  return (
    <HeaderStrip
      compact
      eyebrow={`Body · Week ${weekNumber(now)}`}
      title={now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      subtitle={
        standards && (
          <button type="button" onClick={onSeeStandards} className="text-left">
            Standards this week:{' '}
            <b className="font-bold text-ink">
              {met} of {standards.length}
            </b>{' '}
            met · see which ›
          </button>
        )
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
