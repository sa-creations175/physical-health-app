import { useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, PersonStanding, Plus, Zap } from 'lucide-react';
import { db } from '../../db/database';
import BottomSheet from '../ui/BottomSheet';
import { useToast } from '../ui/Toast';
import { ExerciseLogRow, MobilityRow } from '../activity/bundleLogging';
import { getRepsWeek, getStretchWeek } from '../../lib/bodySignals';
import { getUserPreferences, updateUserPreferences } from '../../lib/userPreferences';
import { parseMobilityLinks, upsertBundleLog, type BundleField, type MobilityLink } from '../../lib/bundleHelpers';
import { addDaysISO, shortDayLabel, todayISODate } from '../../lib/dateHelpers';
import { ringFill } from '../../lib/fitnessFormat';
import { CardHead, DayDots, DotLabel, PairCard, Ring } from './parts';
import { CAPTION, CARD_PAD_ROOMY, DOT_RULE, RING_ROW_GAP, ROW_RING } from '../../lib/cardSizes';

// Quick reps and Recovery, side by side, each with a + to log today
// (body-fitness-options.html, "Collapsed"): the ring with its label beside
// it, then under a thin line the count line with a ⌄. Tap the card to show
// that week's dots; tap again to hide them.

function SmallCard({
  icon,
  title,
  onAdd,
  addLabel,
  ring,
  caption,
  dots,
  count,
  sheet,
}: {
  icon: ReactNode;
  title: string;
  onAdd: () => void;
  addLabel: string;
  ring: ReactNode;
  caption: string;
  dots: ReactNode;
  count: ReactNode;
  sheet: ReactNode; // the log sheet, kept outside the tappable card
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PairCard
        rows={4}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={`card cursor-pointer select-none ${CARD_PAD_ROOMY}`}
      >
        <CardHead
          icon={icon}
          right={
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              aria-label={addLabel}
              className="w-11 h-11 -my-3 -mr-3 flex items-center justify-center shrink-0"
            >
              <span className="w-6 h-6 rounded-full border border-green-300 bg-white text-green-700 flex items-center justify-center">
                <Plus size={14} strokeWidth={2.5} />
              </span>
            </button>
          }
        >
          {title}
        </CardHead>
        <div className={`${RING_ROW_GAP} mb-2 flex items-center justify-center gap-2`}>
          {ring}
          <span className={`${CAPTION} text-left`}>{caption}</span>
        </div>
        {/* The dots row is always one of the pair's rows (empty when closed),
            so the count lines stay level whichever card is open. */}
        <div className={open ? `${DOT_RULE} border-hairline` : ''}>{open && dots}</div>
        <div className={`${DOT_RULE} border-hairline flex items-center justify-between gap-1`}>
          {count}
          <ChevronDown
            aria-hidden="true"
            size={12}
            strokeWidth={2}
            className={`text-hint shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </PairCard>
      {sheet}
    </>
  );
}

// "Reps today": push-ups, ab rolls and calf raises together against the
// daily Reps goal. A day's dot fills at or past the goal and is half filled
// with some reps under it.
export function QuickRepsCard() {
  const reps = useLiveQuery(() => getRepsWeek(), []);
  const [logging, setLogging] = useState(false);
  const today = todayISODate();
  const goal = reps?.goal ?? null;
  return (
    <SmallCard
      icon={<Zap size={16} strokeWidth={2} />}
      title="Quick Reps"
      onAdd={() => setLogging(true)}
      addLabel="Log reps"
      ring={
        <Ring fill={ringFill(reps?.today ?? 0, goal)} {...ROW_RING}>
          {goal === null ? (reps?.today ?? 0) : `${reps?.today ?? 0}/${goal}`}
        </Ring>
      }
      caption="Reps today"
      dots={
        reps && (
          <DayDots
            days={reps.days.map((d) => ({
              date: d.date,
              state: d.state === 'met' ? 'on' : d.state === 'some' ? 'half' : 'none',
            }))}
            today={today}
            small
          />
        )
      }
      count={
        <DotLabel small label="Rep days">
          {reps?.met ?? 0}/7
        </DotLabel>
      }
      sheet={logging && <RepsSheet onClose={() => setLogging(false)} />}
    />
  );
}

// "Stretches this week": days with at least the Mobility minimum, against the
// Stretches goal, and the last day you stretched.
export function RecoveryCard() {
  const week = useLiveQuery(() => getStretchWeek(), []);
  const [logging, setLogging] = useState(false);
  const today = todayISODate();
  const goal = week?.goal ?? null;
  return (
    <SmallCard
      icon={<PersonStanding size={16} strokeWidth={2} />}
      title="Recovery"
      onAdd={() => setLogging(true)}
      addLabel="Log a stretch"
      ring={
        <Ring fill={ringFill(week?.count ?? 0, goal)} {...ROW_RING}>
          {goal === null ? (week?.count ?? 0) : `${week?.count ?? 0}/${goal}`}
        </Ring>
      }
      caption="Stretches this week"
      dots={
        week && (
          <DayDots
            days={week.days.map((d) => ({ date: d.date, state: d.state === 'met' ? 'on' : 'none' }))}
            today={today}
            small
          />
        )
      }
      count={
        <span className="min-w-0 truncate text-[10px] leading-tight">
          <DotLabel small label="Stretch days" />
          {week?.last && (
            <>
              <span className="text-[10px] text-hint"> · </span>
              <DotLabel small label="Last">
                {lastLabel(week.last, today)}
              </DotLabel>
            </>
          )}
        </span>
      }
      sheet={logging && <StretchSheet onClose={() => setLogging(false)} />}
    />
  );
}

// "Today", "Sat" within the last week, else "Sep 12".
function lastLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date > addDaysISO(today, -7)) return shortDayLabel(date);
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// The three rep steppers, for today. Each tap saves straight away.
function RepsSheet({ onClose }: { onClose: () => void }) {
  const today = todayISODate();
  const { showToast } = useToast();
  const row = useLiveQuery(() => db.bundle_logs.where('date').equals(today).first(), [today]);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const log = (field: BundleField, value: number, label: string) =>
    upsertBundleLog(today, field, value).then(() => showToast(`${label}: ${value}`));
  const total = (row?.pushups ?? 0) + (row?.ab_rolls ?? 0) + (row?.calf_raises ?? 0);
  return (
    <BottomSheet onClose={onClose} label="Log reps">
      <p className="eyebrow pr-10">Quick reps</p>
      <h2 className="text-heading text-ink mt-0.5">Reps today: {total.toLocaleString()}</h2>
      {prefs && (
        <div className="mt-2 space-y-1">
          <ExerciseLogRow
            label="Push-ups"
            value={row?.pushups ?? 0}
            increment={prefs.bundle_pushup_increment}
            onChange={(n) => log('pushups', n, 'Push-ups')}
          />
          <ExerciseLogRow
            label="Ab rolls"
            value={row?.ab_rolls ?? 0}
            increment={prefs.bundle_abroll_increment}
            onChange={(n) => log('ab_rolls', n, 'Ab rolls')}
          />
          <ExerciseLogRow
            label="Calf raises"
            value={row?.calf_raises ?? 0}
            increment={prefs.bundle_calfraise_increment}
            onChange={(n) => log('calf_raises', n, 'Calf raises')}
          />
        </div>
      )}
      <button type="button" onClick={onClose} className="btn-primary w-full mt-4">
        Done
      </button>
    </BottomSheet>
  );
}

// Today's stretch minutes, with the saved follow-along videos and the default
// search.
function StretchSheet({ onClose }: { onClose: () => void }) {
  const today = todayISODate();
  const { showToast } = useToast();
  const row = useLiveQuery(() => db.bundle_logs.where('date').equals(today).first(), [today]);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const links = parseMobilityLinks(prefs?.bundle_mobility_youtube_links);
  return (
    <BottomSheet onClose={onClose} label="Log a stretch">
      <p className="eyebrow pr-10">Recovery</p>
      <h2 className="text-heading text-ink mt-0.5">Stretch today</h2>
      {prefs && (
        <p className="text-label text-muted mt-1">
          A day counts once it reaches {prefs.bundle_mobility_min_minutes} minutes.
        </p>
      )}
      {prefs && (
        <div className="mt-2">
          <MobilityRow
            minutes={row?.mobility_minutes ?? 0}
            minMinutes={prefs.bundle_mobility_min_minutes}
            links={links}
            linksOpen
            onChange={(n) =>
              upsertBundleLog(today, 'mobility_minutes', n).then(() => showToast(`Stretch: ${n} min`))
            }
            onAddLink={(label, url) => {
              const next: MobilityLink[] = [...links, { id: Date.now().toString(), label, url }];
              return updateUserPreferences({ bundle_mobility_youtube_links: JSON.stringify(next) });
            }}
            onDeleteLink={(id) =>
              updateUserPreferences({
                bundle_mobility_youtube_links: JSON.stringify(links.filter((l) => l.id !== id)),
              })
            }
          />
        </div>
      )}
      <button type="button" onClick={onClose} className="btn-primary w-full mt-4">
        Done
      </button>
    </BottomSheet>
  );
}
