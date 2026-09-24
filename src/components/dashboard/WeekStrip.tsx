import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useToast } from '../ui/Toast';
import { currentWeekISODates, todayISODate } from '../../lib/dateHelpers';
import { getWeekSessionCounts } from '../../lib/bodySignals';
import { getCaloriesByDay } from '../../lib/healthkit';

const INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// The week under Home's title: one segment per day, Green 300 for days gone,
// Green 700 for today, Stone for days to come. Tap a day to hear what you did.
export default function WeekStrip() {
  const { showToast } = useToast();
  const dates = currentWeekISODates();
  const today = todayISODate();
  const counts = useLiveQuery(() => getWeekSessionCounts(), [], new Map<string, number>());
  const [calories, setCalories] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCaloriesByDay()
      .then((c) => {
        if (!cancelled) setCalories(c);
      })
      .catch(() => {
        /* no HealthKit: the day notes just leave calories out */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function describe(date: string, i: number): string {
    const name = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    if (date === today) return 'Today, in progress';
    if (date > today) return `${name} hasn't happened yet`;
    const n = counts.get(date) ?? 0;
    const parts = [n === 0 ? 'nothing logged' : `${n} session${n === 1 ? '' : 's'}`];
    const cal = calories?.[i];
    if (cal) parts.push(`${cal.toLocaleString()} calories burned`);
    return `${name}: ${parts.join(', ')}`;
  }

  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {dates.map((date, i) => (
          <button
            key={date}
            type="button"
            onClick={() => showToast(describe(date, i))}
            aria-label={describe(date, i)}
            className="flex-1 py-2 -my-2"
          >
            <span
              className={`block h-[5px] rounded-full ${
                date === today ? 'bg-green-700' : date < today ? 'bg-green-300' : 'bg-stone'
              }`}
            />
          </button>
        ))}
      </div>
      <div className="flex mt-1" aria-hidden="true">
        {INITIALS.map((d, i) => (
          <span key={i} className="flex-1 text-center text-micro text-hint">
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}
