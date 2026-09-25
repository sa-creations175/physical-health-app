import { useLiveQuery } from 'dexie-react-hooks';
import BottomSheet from '../ui/BottomSheet';
import { getStandardsWeek } from '../../lib/bodySignals';

// The health standards this week and whether each is met. Opened from the
// standards line on Home and on Fitness; both read getStandardsWeek(), so a
// standard added to that list shows up in both lines and here.
export default function StandardsSheet({ onClose }: { onClose: () => void }) {
  const standards = useLiveQuery(() => getStandardsWeek(), []);
  return (
    <BottomSheet onClose={onClose} label="Moving my body standards">
      <p className="eyebrow pr-10">Moving my body</p>
      <h2 className="text-heading text-ink mt-0.5">Standards this week</h2>
      <p className="text-label text-muted mt-1 leading-snug">
        Health standards, the same whatever goals you set. Your own goals are under Goals.
      </p>
      <div className="mt-2">
        {(standards ?? []).map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-2 py-2.5 border-t border-hairline">
            <div>
              <p className="text-body font-semibold text-ink">{s.label}</p>
              <p className="text-label text-muted tabular-nums">
                {s.actual.toLocaleString()} of {s.standard} {s.unit} this week
              </p>
            </div>
            <span className={`text-label font-bold ${s.met ? 'text-green-700' : 'text-amber-text'}`}>
              {s.met ? 'At or past the line' : 'Short of the line'}
            </span>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
