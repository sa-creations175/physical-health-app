import { useLiveQuery } from 'dexie-react-hooks';
import AutoSavedNotices from '../activity/AutoSavedNotices';
import { COLOR } from '../../lib/brand';
import { CAPTION, CARD_PAD, DOT_RULE, RING_ROW_GAP, SMALL_TEXT, WIDE_RING } from '../../lib/cardSizes';
import { getTrainingWeek, type RingKey } from '../../lib/bodySignals';
import { activeMinutesLabel, dayDateLabel, ringFill } from '../../lib/fitnessFormat';
import { getUserPreferences } from '../../lib/userPreferences';
import { CardHead, DayDots, DayLetters, DotLabel, DumbbellIcon, Ring, RingRow } from './parts';

// "Lower body days" when a ring is picked: the goal's own name (renamed or
// built in), from the week's ring names.
function daysLabel(which: RingKey | 'all', names: Record<RingKey, { name: string }> | undefined): string {
  if (which === 'all') return 'Training days';
  if (which === 'active_minutes') return 'Days with active minutes';
  return `${names?.[which].name ?? ''} days`;
}

// The Fitness score: your sessions against your own split, and Active
// minutes. Tap a ring to show only its days (and a link down to its details);
// tap it again to go back to every training day. Tap a day's dot, Sunday to
// today, to see that day. A session the app saved for you gets a line above
// Start a session, which sits at the bottom of the card.
export default function FitnessScoreCard({
  selected,
  onSelect,
  onOpenDay,
  onOpenGoals,
  onShowDetails,
  onStart,
}: {
  selected: RingKey | null;
  onSelect: (key: RingKey | null) => void;
  onOpenDay: (date: string) => void;
  onOpenGoals: () => void;
  onShowDetails: (key: RingKey) => void;
  onStart: () => void; // "Start a session": the session picker
}) {
  const week = useLiveQuery(() => getTrainingWeek(), []);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const hours = prefs?.active_minutes_as_hours === true;
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

      <RingRow count={week?.rings.length ?? 0} className={RING_ROW_GAP}>
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
                  {r.key === 'active_minutes' ? activeMinutesLabel(r.actual, hours, true) : `${r.actual}/${r.target}`}
                </Ring>
              </span>
              <span className={`${CAPTION} whitespace-nowrap`}>
                {r.names.short}
              </span>
            </button>
          );
        })}
      </RingRow>

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
        <DotLabel small label={daysLabel(which, week?.names)}>{days.size}/7</DotLabel>
        {selected ? (
          <button
            type="button"
            onClick={() => onShowDetails(selected)}
            className={`${SMALL_TEXT} font-bold text-green-700 whitespace-nowrap`}
          >
            {week?.names[selected].name} details ›
          </button>
        ) : (
          <span className={`${SMALL_TEXT} text-hint whitespace-nowrap`}>Tap a ring or a day</span>
        )}
      </div>
      <AutoSavedNotices names={week?.names} />
      <button type="button" onClick={onStart} className="btn-primary w-full mt-2 mb-0.5 min-h-[40px] py-2">
        Start a session
      </button>
    </div>
  );
}
