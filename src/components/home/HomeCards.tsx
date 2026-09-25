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
import { CardHead, DayDots, DayLetters, DotLabel, DumbbellIcon, Ring, type DotState } from '../fitness/parts';

// Home's cards (body-home-shapes.html, B7). Each reads one shared place in
// lib/bodySignals.ts; none queries on its own.

// Sizes and spacing from body-home-headings.html (right phone, "Title Case,
// line under"), so the whole of Home fits one iPhone screen without scrolling:
// cards padded 5px top and bottom, rings 32px (34px on Nutrition) sitting
// clear of the heading line, 10px dots, 10px labels.
const CARD = 'px-3 py-[5px]';
const RING = { size: 32, inner: 24, textClass: 'text-[8.5px]' };
const NUT_RING = { size: 34, inner: 25, textClass: 'text-[8.5px]' };
const CAPTION = 'text-[10px] leading-tight font-semibold text-muted';

const DOT: Record<DayMark, DotState> = { met: 'on', some: 'half', missed: 'miss', none: 'none' };
const dots = (days: { date: string; mark: DayMark }[]) => days.map((d) => ({ date: d.date, state: DOT[d.mark] }));

// The line shown on a card whose feature isn't built yet.
function SetUpLine() {
  return <p className="text-[10px] leading-tight text-hint mt-0.5">Set up in More</p>;
}

// A ring over its caption, centred.
function RingCaption({ fill, value, caption, onMint }: { fill: number; value: ReactNode; caption: string; onMint?: boolean }) {
  return (
    <div className="mt-1 flex flex-col items-center gap-0.5">
      <Ring fill={fill} {...RING} onMint={onMint}>
        {value}
      </Ring>
      <span className={CAPTION}>{caption}</span>
    </div>
  );
}

// A rule, then the dots.
function DotRow({ children, mint }: { children: ReactNode; mint?: boolean }) {
  return <div className={`mt-1 pt-1 border-t ${mint ? 'border-green-300' : 'border-hairline'}`}>{children}</div>;
}

// ---- Movement ---------------------------------------------------------------------

// The four session rings from the Fitness score, the week's average calories a
// day, and Move goal days with the day letters.
export function MovementCard() {
  const week = useLiveQuery(() => getTrainingWeek(), []);
  const score = useLiveQuery(() => getFitnessScore(), []);
  const move = useLiveQuery(() => getMoveGoalWeek(), [], null);
  const today = todayISODate();
  const avg = score?.averages.calories ?? null;
  const SHORT = { lower: 'Lower', upper: 'Upper', full_body: 'Full', cardio: 'Cardio' } as Record<string, string>;
  return (
    <div className={`card ${CARD}`}>
      <CardHead
        icon={<DumbbellIcon />}
        right={
          <span className="text-[12px] text-muted whitespace-nowrap">
            Avg per day: <b className="font-bold text-ink tabular-nums">{avg === null ? '—' : `${avg.toLocaleString()} cals`}</b>
          </span>
        }
      >
        Movement
      </CardHead>
      <div className="mt-1.5 flex justify-between px-1">
        {(week?.rings ?? [])
          .filter((r) => r.key !== 'active_minutes')
          .map((r) => (
            <div key={r.key} className="flex flex-col items-center gap-px">
              <Ring fill={ringFill(r.actual, r.target)} {...RING}>
                {r.target === null ? r.actual : `${r.actual}/${r.target}`}
              </Ring>
              <span className={CAPTION}>{SHORT[r.key]}</span>
            </div>
          ))}
      </div>
      <DotRow>
        {move ? (
          // A day at or past the calories goal fills; B7 shows no misses here.
          <DayDots
            days={move.days.map((d) => ({ date: d.date, state: d.state === 'met' ? 'on' : 'none' }))}
            today={today}
            small
          />
        ) : (
          <DayDots days={(week?.dates ?? []).map((date) => ({ date, state: 'none' as const }))} today={today} small />
        )}
        <DayLetters small />
      </DotRow>
      <p className="mt-0.5">
        <DotLabel small label="Move goal days">{move ? `${move.met}/7` : undefined}</DotLabel>
      </p>
    </div>
  );
}

// ---- Nutrition --------------------------------------------------------------------

const METRIC_LABEL: Record<NutritionMetric, string> = { calories: 'Calories', protein: 'Protein', water: 'Water' };
const WEEK_UNIT: Record<NutritionMetric, string> = { calories: ' cals', protein: 'g', water: ' bottles' };

// Calories, protein and water today against the season's targets. Tap a ring
// and the dots follow that one's days on target (calories to start).
export function NutritionCard() {
  const week = useLiveQuery(() => getNutritionWeek(), []);
  const [pick, setPick] = useState<NutritionMetric>('calories');
  const today = todayISODate();
  const track = week?.tracks[pick];
  return (
    <div className={`tile ${CARD}`}>
      <CardHead icon={<Apple size={16} strokeWidth={2} />} right={<span className="text-[12px] text-muted">Today</span>}>
        Nutrition
      </CardHead>
      <div className="mt-1.5 flex justify-around">
        {(['calories', 'protein', 'water'] as NutritionMetric[]).map((m) => {
          const t = week?.tracks[m];
          const on = pick === m;
          const value =
            m === 'water'
              ? t?.target != null ? `${t.today}/${t.target}` : `${t?.today ?? 0}`
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
      {week && !week.hasSeason && <p className="text-[10px] leading-tight text-hint mt-0.5">Set up your plan in Nutrition</p>}
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
    <div className={`card min-w-0 ${CARD}`}>
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
      <p className="mt-0.5">
        <DotLabel small label={goal ? `Nights ${hoursLabel(goal)}+` : 'Nights'}>{`${week?.met ?? 0}/7`}</DotLabel>
      </p>
    </div>
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
    <div className={`card min-w-0 ${CARD}`}>
      <CardHead icon={<PersonStanding size={16} strokeWidth={2} />}>Recovery</CardHead>
      <RingCaption
        fill={ringFill(week?.count ?? 0, goal)}
        value={goal === null ? (week?.count ?? 0) : `${week?.count ?? 0}/${goal}`}
        caption="Stretches this week"
      />
      <DotRow>
        <DayDots
          days={(week?.days ?? []).map((d) => ({ date: d.date, state: d.state === 'met' ? 'on' : 'none' }))}
          today={today}
          small
        />
      </DotRow>
      <p className="mt-0.5 flex justify-between gap-1">
        <DotLabel small label="Stretch days" />
        {week?.last && (
          <DotLabel small label="Last">
            {lastStretchLabel(week.last, today)}
          </DotLabel>
        )}
      </p>
    </div>
  );
}

// "Today", "Sat" within the last week, else "Sep 12".
function lastStretchLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date > addDaysISO(today, -7)) return shortDayLabel(date);
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---- Hygiene ----------------------------------------------------------------------

// Brushed twice (once is half a dot) and flossed, labels above the dots.
export function HygieneCard() {
  const week = useLiveQuery(() => getHygieneWeek(), []);
  const today = todayISODate();
  const setUp = !!week?.setUp;
  return (
    <div className={`tile min-w-0 flex flex-col ${CARD}`}>
      <CardHead icon={<Droplets size={16} strokeWidth={2} />}>Hygiene</CardHead>
      <div className="flex-1 flex flex-col justify-center gap-1 mt-1.5">
        <DotLabel small label="Brushed 2×">{setUp ? `${week!.brushed.count}/7` : undefined}</DotLabel>
        <DayDots days={dots(week?.brushed.days ?? [])} today={today} small />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1 mt-1 pt-1 border-t border-green-300">
        <DotLabel small label="Flossed">{setUp ? `${week!.flossed.count}/7` : undefined}</DotLabel>
        <DayDots days={dots(week?.flossed.days ?? [])} today={today} small />
      </div>
      {week && !setUp && <SetUpLine />}
    </div>
  );
}

// ---- Habits -----------------------------------------------------------------------

// Drinks this week against your limit; a dot fills on a day with no drink.
export function HabitsCard() {
  const week = useLiveQuery(() => getDrinksWeek(), []);
  const today = todayISODate();
  const setUp = !!week?.setUp;
  return (
    <div className={`tile min-w-0 ${CARD}`}>
      <CardHead icon={<Wine size={16} strokeWidth={2} />}>Habits</CardHead>
      <RingCaption
        onMint
        fill={setUp && week!.limit ? week!.count / week!.limit : 0}
        value={setUp ? (week!.limit ? `${week!.count}/${week!.limit}` : week!.count) : ''}
        caption="Drinks this week"
      />
      <DotRow mint>
        <DayDots days={dots(week?.days ?? [])} today={today} small />
      </DotRow>
      <p className="mt-0.5">
        <DotLabel small label="No-drink days">{setUp ? `${week!.drinkFreeDays}/7` : undefined}</DotLabel>
      </p>
      {week && !setUp && <SetUpLine />}
    </div>
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
          // B7 shows a checkup coming due in Bronze Amber.
          next &&
          days !== null && (
            <span className={`text-[12px] font-semibold ${days <= 31 ? 'text-amber' : 'text-muted'}`}>
              {next.label}{' '}
              {days < 0 ? `overdue by ${spanLabel(-days)}` : days === 0 ? 'due today' : `due in ${spanLabel(days)}`}
            </span>
          )
        }
      >
        Checkups
      </CardHead>
      {c && c.setUp ? (
        <p className="text-[10px] leading-tight text-hint mt-[3px]">
          {c.items
            .map((i) => (i.lastVisit ? `${i.label} ${agoLabel(i.lastVisit, today)}` : `${i.label} not yet`))
            .join(' · ')}
        </p>
      ) : (
        c && <SetUpLine />
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
