import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import SharedActivityCard from './SharedActivityCard';
import {
  computeDeliveryStreak,
  toggleDeliveryDay,
} from '../../lib/deliveryHelpers';
import { deliveryDots } from '../../lib/dotHelpers';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { DeliveryDay } from '../../db/types';

const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function DeliveryActivityCard({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const today = todayISODate();
  const weekStart = startOfWeekISODate();
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));

  const rows = useLiveQuery(() => db.delivery_days.toArray(), [], []);
  const summary = useLiveQuery(() => computeDeliveryStreak(), [rows], {
    currentStreak: 0,
    longestStreak: 0,
  });

  const byDate = new Map<string, DeliveryDay>(rows.map((r) => [r.date, r]));
  const byStatus = new Map<string, 'clean' | 'ordered'>(
    rows.map((r) => [r.date, r.status]),
  );
  const dots = deliveryDots(byStatus);

  return (
    <SharedActivityCard
      label="No-Delivery Streak"
      badge={
        <>
          {summary.currentStreak} day{summary.currentStreak === 1 ? '' : 's'}
        </>
      }
      dots={dots}
      expanded={expanded}
      onToggle={onToggle}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[#5f6b65]">
          Tap a day to mark clean / ordered
        </span>
        <span className="text-[12px] text-[#6b756e]">
          Best: {summary.longestStreak} days
        </span>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {weekDates.map((date, i) => (
          <DayCell
            key={date}
            date={date}
            row={byDate.get(date) ?? null}
            isToday={date === today}
            initial={DAY_INITIALS[i]}
          />
        ))}
      </div>
    </SharedActivityCard>
  );
}

function DayCell({
  date,
  row,
  isToday,
  initial,
}: {
  date: string;
  row: DeliveryDay | null;
  isToday: boolean;
  initial: string;
}) {
  const status = row?.status ?? null;
  let bg = '#eef1ef';
  let content: React.ReactNode = (
    <span className="text-[12px] text-[#6b756e] font-medium">{initial}</span>
  );
  let border: string | undefined;
  if (status === 'clean') {
    bg = '#0F6E56';
    content = (
      <span aria-hidden="true" className="text-white text-[16px] leading-none">
        ✓
      </span>
    );
  } else if (status === 'ordered') {
    bg = '#E24B4A';
    content = (
      <span aria-hidden="true" className="text-white text-[16px] leading-none">
        ✗
      </span>
    );
  } else if (isToday) {
    border = '2px solid #0F6E56';
  }

  const aria =
    status === 'clean'
      ? `Clean day, ${date} — tap to mark ordered`
      : status === 'ordered'
        ? `Ordered day, ${date} — tap to clear`
        : `Unmarked day, ${date} — tap to mark clean`;

  return (
    <button
      type="button"
      onClick={() => void toggleDeliveryDay(date)}
      aria-label={aria}
      style={{ background: bg, border }}
      className="w-full h-11 rounded-md flex items-center justify-center"
    >
      {content}
    </button>
  );
}
