import { Flame } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMoveStreak } from '../../lib/bodySignals';
import { getUserPreferences } from '../../lib/userPreferences';

// "Move streak: 3" with a small Bronze Amber flame. One piece, shown wherever
// the streak appears (Fitness's Daily Movement heading, Home's Movement card),
// and only when Settings → Movement → "Show move streak" is on and there is a
// streak to show. Otherwise it renders nothing.
export default function MoveStreak() {
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const streak = useLiveQuery(() => getMoveStreak(), [], null);
  if (prefs?.show_move_streak !== true || !streak) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted whitespace-nowrap">
      <Flame aria-hidden="true" size={12} strokeWidth={2} className="text-amber" />
      Move streak: <b className="font-bold text-ink">{streak}</b>
    </span>
  );
}
