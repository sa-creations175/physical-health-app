import { Flame } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMoveStreak } from '../../lib/bodySignals';
import { useToast } from '../ui/Toast';

// "Move goal streak: N" with a flame, on the eyebrow line of the Home and
// Fitness headers. One component, one number: both screens read the same
// move goal streak. Hidden when there's no streak to show (no calories goal,
// no HealthKit, or a streak of 0). Tap to hear what it counts.
export default function MoveStreakPill() {
  const { showToast } = useToast();
  // Live on the goals table, so changing the calories goal re-reads it.
  const streak = useLiveQuery(() => getMoveStreak(), [], null);
  if (!streak) return null;
  return (
    <button
      type="button"
      onClick={() => showToast('Days at or above your calories goal')}
      className="inline-flex items-center gap-1 shrink-0 whitespace-nowrap rounded-full bg-white border border-hairline px-2.5 py-0.5 text-label font-bold text-green-900"
    >
      <Flame aria-hidden="true" size={14} strokeWidth={2} className="text-amber" />
      Move goal streak: {streak}
    </button>
  );
}
