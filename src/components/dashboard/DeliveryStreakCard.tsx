import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Card, SectionLabel } from '../ui/primitives';
import { FlameIcon } from './PillarIcons';
import {
  computeDeliveryStreak,
  toggleDeliveryDay,
} from '../../lib/deliveryHelpers';
import {
  startOfWeekISODate,
  addDaysISO,
  todayISODate,
} from '../../lib/dateHelpers';
import type { DeliveryDay } from '../../db/types';

// Single-letter weekday initials, Sunday-first to match the rest of the
// app's week math. Duplicate letters (S, T) are fine here — the grid's
// position carries the meaning, the initials are just a hint.
const DAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function DeliveryStreakCard() {
  const weekStart = startOfWeekISODate();
  const today = todayISODate();
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDaysISO(weekStart, i),
  );

  // Live-query the whole table — at ~365 rows/year this is cheap and
  // lets the streak + week grid share a single subscription that
  // refreshes the moment a tap mutates a row.
  const rows = useLiveQuery(() => db.delivery_days.toArray(), [], []);
  const summary = useLiveQuery(() => computeDeliveryStreak(), [rows], {
    currentStreak: 0,
    longestStreak: 0,
  });

  const byDate = new Map<string, DeliveryDay>(
    rows.map((r) => [r.date, r]),
  );
  const hasAnyHistory = rows.length > 0;

  return (
    <section className="px-5 mt-6">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>No-delivery streak</SectionLabel>
        <FlameIcon />
      </div>
      <Card className="mt-2 p-4">
        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-medium leading-none text-[#0d1f18]">
              {summary.currentStreak}
            </span>
            <span className="text-[12px] text-[#6b756e]">days</span>
          </div>
          <span className="text-[12px] text-[#6b756e]">
            Best: {summary.longestStreak} days
          </span>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5">
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

        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {DAY_INITIALS.map((letter, i) => (
            <div
              key={i}
              className="text-[9px] text-[#6b756e] text-center tracking-micro"
            >
              {letter}
            </div>
          ))}
        </div>

        {!hasAnyHistory && (
          <p className="mt-3 text-[12px] text-[#6b756e] text-center">
            Tap each day you skipped delivery
          </p>
        )}
      </Card>
    </section>
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
  // Three visual states. `today + unmarked` gets a 2px mint border on
  // top of the grey fill — a passive "you haven't decided yet" nudge,
  // explicitly without animation per spec.
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
      onClick={() => {
        void toggleDeliveryDay(date);
      }}
      aria-label={aria}
      style={{
        background: bg,
        border,
        // Border eats from the inner content area; keep the visual
        // square crisp by centering content via flex regardless.
      }}
      className="w-full h-11 rounded-md flex items-center justify-center"
    >
      {content}
    </button>
  );
}
