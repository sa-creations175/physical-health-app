import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Apple, Droplets, Moon, PersonStanding, Stethoscope, Wine } from 'lucide-react';
import {
  getCheckups,
  getDrinksWeek,
  getHygieneWeek,
  getMoveGoalWeek,
  getNutritionWeek,
  getSleepWeek,
  getStretchWeek,
  getTrainingWeek,
  type DayMark,
  type NutritionMetric,
} from '../../lib/bodySignals';
import { getFitnessScore } from '../../lib/fitnessScore';
import { addDaysISO, shortDayLabel, todayISODate } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';
import { hoursLabel, ringFill } from '../../lib/fitnessFormat';
import {
  CAPTION,
  CARD_PAD as CARD,
  CORNER,
  DOT_RULE,
  RING,
  RING_GAP,
  RING_ROW_GAP,
  SMALL_TEXT,
  WIDE_RING as NUT_RING,
} from '../../lib/cardSizes';
import {
  CardHead,
  DayDots,
  DayLetters,
  DotLabel,
  DumbbellIcon,
  BottomLine,
  PairCard,
  Ring,
  RingRow,
  type DotState,
} from '../fitness/parts';
import MoveStreak from '../ui/MoveStreak';

// Home's cards (body-home-shapes.html, B7). Each reads one shared place in
// lib/bodySignals.ts; none queries on its own.

const DOT: Record<DayMark, DotState> = {
  met: 'on',
  some: 'half',
  missed: 'miss',
  none: 'none',
};
const dots = (days: { date: string; mark: DayMark }[]) =>
  days.map((d) => ({ date: d.date, state: DOT[d.mark] }));

// Shown in the heading corner of a card whose feature isn't built yet.
function SetUpCorner() {
  return <span className={`${SMALL_TEXT} text-hint whitespace-nowrap`}>Set up in More</span>;
}

// A ring over its caption, centred.
function RingCaption({
  fill,
  value,
  caption,
  onMint,
}: {
  fill: number;
  value: ReactNode;
  caption: string;
  onMint?: boolean;
}) {
  return (
    <div className={`${RING_GAP} flex flex-col items-center gap-0.5`}>
      <Ring fill={fill} {...RING} onMint={onMint}>
        {value}
      </Ring>
      <span className={CAPTION}>{caption}</span>
    </div>
  );
}

// A rule, then the dots.
function DotRow({ children, mint }: { children: ReactNode; mint?: boolean }) {
  return <div className={`${DOT_RULE} ${mint ? 'border-green-300' : 'border-hairline'}`}>{children}</div>;
}

// ---- Movement ---------------------------------------------------------------------

// The four session rings from the Fitness score, the week's average calories a
// day, and Move goal days with the day letters (and the move streak, when
// it's switched on in Settings).
export function MovementCard() {
  const week = useLiveQuery(() => getTrainingWeek(), []);
  const score = useLiveQuery(() => getFitnessScore(), []);
  const move = useLiveQuery(() => getMoveGoalWeek(), [], null);
  const today = todayISODate();
  const avg = score?.averages.calories ?? null;
  // The session rings you have goals for (Active minutes lives on Fitness).
  const sessionRings = (week?.rings ?? []).filter((r) => r.key !== 'active_minutes');
  const SHORT = {
    lower: 'Lower',
    upper: 'Upper',
    full_body: 'Full',
    cardio: 'Cardio',
  } as Record<string, string>;
  return (
    <div className={`card ${CARD}`}>
      <CardHead
        icon={<DumbbellIcon />}
        right={
          <span className={CORNER}>
            Avg per day:{' '}
            <b className="font-bold text-ink tabular-nums">
              {avg === null ? '—' : `${avg.toLocaleString()} cals`}
            </b>
          </span>
        }
      >
        Movement
      </CardHead>
      <RingRow count={sessionRings.length} className={RING_ROW_GAP}>
        {sessionRings.map((r) => (
          <div key={r.key} className="flex flex-col items-center gap-px">
            <Ring fill={ringFill(r.actual, r.target)} {...RING}>
              {`${r.actual}/${r.target}`}
            </Ring>
            <span className={CAPTION}>{SHORT[r.key]}</span>
          </div>
        ))}
      </RingRow>
      <DotRow>
        {move ? (
          // A day at or past the calories goal fills; B7 shows no misses here.
          <DayDots
            days={move.days.map((d) => ({
              date: d.date,
              state: d.state === 'met' ? 'on' : 'none',
            }))}
            today={today}
            small
          />
        ) : (
          <DayDots
            days={(week?.dates ?? []).map((date) => ({
              date,
              state: 'none' as const,
            }))}
            today={today}
            small
          />
        )}
        <DayLetters small />
      </DotRow>
      {/* With "Show move streak" on, the streak sits at the right of this line. */}
      <p className="mt-0.5 flex items-center justify-between gap-2">
        <DotLabel small label="Move goal days">
          {move ? `${move.met}/7` : undefined}
        </DotLabel>
        <MoveStreak />
      </p>
    </div>
  );
}

// ---- Nutrition --------------------------------------------------------------------

const METRIC_LABEL: Record<NutritionMetric, string> = {
  calories: 'Calories',
  protein: 'Protein',
  water: 'Water',
};
const WEEK_UNIT: Record<NutritionMetric, string> = {
  calories: ' cals',
  protein: 'g',
  water: ' bottles',
};

// Calories, protein and water today against the season's targets. Tap a ring
// and the dots follow that one's days on target (calories to start).
export function NutritionCard() {
  const week = useLiveQuery(() => getNutritionWeek(), []);
  const [pick, setPick] = useState<NutritionMetric>('calories');
  const today = todayISODate();
  const track = week?.tracks[pick];
  return (
    <div className={`tile ${CARD}`}>
      <CardHead icon={<Apple size={16} strokeWidth={2} />} right={<span className={CORNER}>Today</span>}>
        Nutrition
      </CardHead>
      <div className={`${RING_ROW_GAP} flex justify-around`}>
        {(['calories', 'protein', 'water'] as NutritionMetric[]).map((m) => {
          const t = week?.tracks[m];
          const on = pick === m;
          const value =
            m === 'water'
              ? t?.target != null
                ? `${t.today}/${t.target}`
                : `${t?.today ?? 0}`
              : m === 'protein'
                ? `${(t?.today ?? 0).toLocaleString()}g`
                : (t?.today ?? 0).toLocaleString();
          return (
            <button
              key={m}
              type="button"
              onClick={() => setPick(m)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-0.5 transition-opacity ${on ? '' : 'opacity-75'}`}
            >
              <span
                className="rounded-full"
                style={on ? { outline: `2px solid ${COLOR.green300}` } : undefined}
              >
                <Ring fill={ringFill(t?.today ?? 0, t?.target ?? null)} {...NUT_RING} onMint>
                  {value}
                </Ring>
              </span>
              <span className={CAPTION}>{METRIC_LABEL[m]}</span>
            </button>
          );
        })}
      </div>
      <DotRow mint>
        <DayDots days={dots(track?.days ?? [])} today={today} small />
      </DotRow>
      <p className="mt-0.5 flex justify-between gap-2">
        <DotLabel small label="Days on target">
          · <i>{METRIC_LABEL[pick].toLowerCase()}</i>
        </DotLabel>
        {track?.weekTarget != null && (
          <DotLabel small label="Week">
            {track.week.toLocaleString()} / {track.weekTarget.toLocaleString()}
            {WEEK_UNIT[pick]}
          </DotLabel>
        )}
      </p>
      {week && !week.hasSeason && (
        <p className={`${SMALL_TEXT} text-hint mt-0.5`}>Set up your plan in Nutrition</p>
      )}
    </div>
  );
}

// ---- Sleep ------------------------------------------------------------------------

// Last night against the sleep goal, nights at or past it, and the week's
// average, all from the nights Build 2 imports.
export function SleepCard() {
  const week = useLiveQuery(() => getSleepWeek(), []);
  const today = todayISODate();
  const last = week?.lastNight?.asleep_minutes ?? null;
  const goal = week?.goal ?? null;
  return (
    <PairCard rows={4} className={`card ${CARD}`}>
      <CardHead
        icon={<Moon size={16} strokeWidth={2} />}
        right={
          week?.average != null && (
            <span className="text-[10px] font-medium text-muted whitespace-nowrap">
              Avg: <b className="font-bold text-ink">{hoursLabel(week.average)}</b>
            </span>
          )
        }
      >
        Sleep
      </CardHead>
      <RingCaption
        fill={last !== null && goal ? last / goal : 0}
        value={last !== null ? hoursLabel(last) : ''}
        caption="Last night"
      />
      <DotRow>
        <DayDots days={dots(week?.days ?? [])} today={today} small />
      </DotRow>
      <BottomLine>
        <DotLabel
          small
          label={goal ? `Nights ${hoursLabel(goal)}+` : 'Nights'}
        >{`${week?.met ?? 0}/7`}</DotLabel>
      </BottomLine>
    </PairCard>
  );
}

// ---- Recovery ---------------------------------------------------------------------

// Stretches this week and stretch days, from the same shared place as
// Fitness's Recovery card, at Home's size (no +; logging stays on Fitness).
export function HomeRecoveryCard() {
  const week = useLiveQuery(() => getStretchWeek(), []);
  const today = todayISODate();
  const goal = week?.goal ?? null;
  return (
    <PairCard rows={4} className={`card ${CARD}`}>
      <CardHead icon={<PersonStanding size={16} strokeWidth={2} />}>Recovery</CardHead>
      <RingCaption
        fill={ringFill(week?.count ?? 0, goal)}
        value={goal === null ? (week?.count ?? 0) : `${week?.count ?? 0}/${goal}`}
        caption="Stretches this week"
      />
      <DotRow>
        <DayDots
          days={(week?.days ?? []).map((d) => ({
            date: d.date,
            state: d.state === 'met' ? 'on' : 'none',
          }))}
          today={today}
          small
        />
      </DotRow>
      <BottomLine>
        <DotLabel small label="Stretch days" />
        {week?.last && (
          <DotLabel small label="Last">
            {lastStretchLabel(week.last, today)}
          </DotLabel>
        )}
      </BottomLine>
    </PairCard>
  );
}

// "Today", "Sat" within the last week, else "Sep 12".
function lastStretchLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date > addDaysISO(today, -7)) return shortDayLabel(date);
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ---- Hygiene ----------------------------------------------------------------------

// Brushed twice (once is half a dot) and flossed, labels above the dots.
export function HygieneCard() {
  const week = useLiveQuery(() => getHygieneWeek(), []);
  const today = todayISODate();
  const setUp = !!week?.setUp;
  return (
    <PairCard rows={4} className={`tile ${CARD}`}>
      <CardHead icon={<Droplets size={16} strokeWidth={2} />} right={week && !setUp && <SetUpCorner />}>
        Hygiene
      </CardHead>
      <div className="flex flex-col justify-center gap-1 mt-1.5">
        <DotLabel small label="Brushed 2×">
          {setUp ? `${week!.brushed.count}/7` : undefined}
        </DotLabel>
        <DayDots days={dots(week?.brushed.days ?? [])} today={today} small />
      </div>
      {/* Flossed takes the pair's last two rows and sits at their bottom, so
          its dots end level with Habits' bottom line. */}
      <div className="row-span-2 self-end flex flex-col gap-1 mt-1 pt-1 border-t border-green-300">
        <DotLabel small label="Flossed">
          {setUp ? `${week!.flossed.count}/7` : undefined}
        </DotLabel>
        <DayDots days={dots(week?.flossed.days ?? [])} today={today} small />
      </div>
    </PairCard>
  );
}

// ---- Habits -----------------------------------------------------------------------

// Drinks this week against your limit; a dot fills on a day with no drink.
export function HabitsCard() {
  const week = useLiveQuery(() => getDrinksWeek(), []);
  const today = todayISODate();
  const setUp = !!week?.setUp;
  return (
    <PairCard rows={4} className={`tile ${CARD}`}>
      <CardHead icon={<Wine size={16} strokeWidth={2} />} right={week && !setUp && <SetUpCorner />}>
        Habits
      </CardHead>
      <RingCaption
        onMint
        fill={setUp && week!.limit ? week!.count / week!.limit : 0}
        value={setUp ? (week!.limit ? `${week!.count}/${week!.limit}` : week!.count) : ''}
        caption="Drinks this week"
      />
      <DotRow mint>
        <DayDots days={dots(week?.days ?? [])} today={today} small />
      </DotRow>
      <BottomLine>
        <DotLabel small label="No-drink days">
          {setUp ? `${week!.drinkFreeDays}/7` : undefined}
        </DotLabel>
      </BottomLine>
    </PairCard>
  );
}

// ---- Checkups ---------------------------------------------------------------------

// "Dental due in 3 weeks", then when each was last done.
export function CheckupsCard() {
  const c = useLiveQuery(() => getCheckups(), []);
  const today = todayISODate();
  const next = c?.next ?? null;
  const days = next?.due ? Math.round((Date.parse(next.due) - Date.parse(today)) / 86_400_000) : null;
  return (
    <div className={`card ${CARD}`}>
      <CardHead
        icon={<Stethoscope size={16} strokeWidth={2} />}
        right={
          c && !c.setUp ? (
            <SetUpCorner />
          ) : (
            // B7 shows a checkup coming due in Bronze Amber.
            next &&
            days !== null && (
              <span className={`text-[12px] font-semibold ${days <= 31 ? 'text-amber' : 'text-muted'}`}>
                {next.label}{' '}
                {days < 0
                  ? `overdue by ${spanLabel(-days)}`
                  : days === 0
                    ? 'due today'
                    : `due in ${spanLabel(days)}`}
              </span>
            )
          )
        }
      >
        Checkups
      </CardHead>
      {c?.setUp && (
        <p className={`${SMALL_TEXT} text-hint mt-[3px]`}>
          {c.items
            .map((i) => (i.lastVisit ? `${i.label} ${agoLabel(i.lastVisit, today)}` : `${i.label} not yet`))
            .join(' · ')}
        </p>
      )}
    </div>
  );
}

// 21 → "3 weeks"; 150 → "5 months".
function spanLabel(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30.4)} months`;
}

function agoLabel(date: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(date)) / 86_400_000);
  return days <= 0 ? 'today' : `${spanLabel(days)} ago`;
}
