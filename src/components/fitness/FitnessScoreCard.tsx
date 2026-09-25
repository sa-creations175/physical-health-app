import { useLiveQuery } from 'dexie-react-hooks';
import { COLOR } from '../../lib/brand';
import { CAPTION, CARD_PAD, DOT_RULE, RING_ROW_GAP, SMALL_TEXT, WIDE_RING } from '../../lib/cardSizes';
import { getTrainingWeek, RING_LABEL, type RingKey } from '../../lib/bodySignals';
import { dayDateLabel, ringFill } from '../../lib/fitnessFormat';
import { CardHead, DayDots, DayLetters, DotLabel, DumbbellIcon, Ring } from './parts';

const RING_SHORT: Record<RingKey, string> = {
  lower: 'Lower',
  upper: 'Upper',
  full_body: 'Full',
  cardio: 'Cardio',
  active_minutes: 'Active min',
};

const DAYS_LABEL: Record<RingKey | 'all', string> = {
  all: 'Training days',
  lower: 'Lower body days',
  upper: 'Upper body days',
  full_body: 'Full body days',
  cardio: 'Cardio days',
  active_minutes: 'Days with active minutes',
};

// The Fitness score: your sessions against your own split, and Active
// minutes. Tap a ring to show only its days (and a link down to its details);
// tap it again to go back to every training day. Tap a day's dot, Sunday to
// today, to see that day.
export default function FitnessScoreCard({
  selected,
  onSelect,
  onOpenDay,
  onOpenGoals,
  onShowDetails,
}: {
  selected: RingKey | null;
  onSelect: (key: RingKey | null) => void;
  onOpenDay: (date: string) => void;
  onOpenGoals: () => void;
  onShowDetails: (key: RingKey) => void;
}) {
  const week = useLiveQuery(() => getTrainingWeek(), []);
  const which = selected ?? 'all';
  const days = week?.days[which] ?? new Set<string>();

  return (
    <div className={`tile ${CARD_PAD}`}>
      <CardHead
        icon={<DumbbellIcon />}
        right={
          <button type="button" onClick={onOpenGoals} className="text-label text-muted whitespace-nowrap min-h-[32px]">
              Sessions:{' '}
              <b className="font-bold text-ink tabular-nums">
                {week ? `${week.sessions.done} of ${week.sessions.target}` : '—'}
              </b>
            </button>
        }
      >
        Fitness Score
      </CardHead>

      <div className={`${RING_ROW_GAP} flex justify-between`}>
        {(week?.rings ?? []).map((r) => {
          const on = selected === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => onSelect(on ? null : r.key)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-1 rounded-input px-0.5 transition-opacity ${
                selected && !on ? 'opacity-[.55]' : ''
              }`}
            >
              <span
                className="rounded-full"
                style={on ? { outline: `2px solid ${COLOR.green300}`, outlineOffset: 1 } : undefined}
              >
                <Ring fill={ringFill(r.actual, r.target)} {...WIDE_RING} onMint>
                  {r.key === 'active_minutes' || r.target === null ? r.actual : `${r.actual}/${r.target}`}
                </Ring>
              </span>
              <span className={`${CAPTION} whitespace-nowrap`}>
                {RING_SHORT[r.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`${DOT_RULE} border-hairline`}>
        {week && (
          <DayDots
            days={week.dates.map((date) => ({ date, state: days.has(date) ? 'on' : 'none' }))}
            today={week.today}
            onTap={onOpenDay}
            label={(date) => `See ${dayDateLabel(date)}`}
            small
          />
        )}
        <DayLetters small />
      </div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <DotLabel small label={DAYS_LABEL[which]}>{days.size}/7</DotLabel>
        {selected ? (
          <button
            type="button"
            onClick={() => onShowDetails(selected)}
            className={`${SMALL_TEXT} font-bold text-green-700 whitespace-nowrap`}
          >
            {RING_LABEL[selected]} details ›
          </button>
        ) : (
          <span className={`${SMALL_TEXT} text-hint whitespace-nowrap`}>Tap a ring or a day</span>
        )}
      </div>
    </div>
  );
}
