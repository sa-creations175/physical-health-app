import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowDownUp, ArrowUp, Heart } from 'lucide-react';
import {
  getRecentWorkouts,
  getTrainingWeek,
  type RingKey,
  type TrainingType,
  type Workout,
} from '../../lib/bodySignals';
import { formatWorkoutType } from '../../lib/healthkit';
import { toMinutes } from '../../lib/heartRate';
import { shortDayLabel } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';
import { dayDateLabel, detailsId, openPath } from '../../lib/fitnessFormat';
import { CardHead, DumbbellIcon, RunnerIcon } from './parts';

// Details: one card per Fitness score ring, below the first screen. Each
// strength and cardio card lists your last sessions and a button to start
// one; Active minutes lists this week's minutes above your line.

const ARROW: Record<'lower' | 'upper' | 'full_body', ReactNode> = {
  lower: <ArrowDown size={13} strokeWidth={2.4} />,
  upper: <ArrowUp size={13} strokeWidth={2.4} />,
  full_body: <ArrowDownUp size={13} strokeWidth={2.4} />,
};

export default function DetailsCards({ flash, onTop }: { flash: RingKey | null; onTop: () => void }) {
  const week = useLiveQuery(() => getTrainingWeek(), []);
  const ring = (key: RingKey) => week?.rings.find((r) => r.key === key);
  return (
    <>
      <p className="eyebrow text-hint mt-8 pt-3.5 border-t border-hairline">Details</p>
      {/* One card per ring you have: a goal removed takes its card away too. */}
      {(week?.sessionTypes ?? []).map((t) => (
        <SessionDetails
          key={t}
          type={t}
          actual={ring(t)?.actual ?? 0}
          target={ring(t)?.target ?? null}
          heading={week?.names[t].heading ?? ''}
          flash={flash === t}
          onTop={onTop}
        />
      ))}
      {week && ring('active_minutes') && (
        <DetailCard id={detailsId('active_minutes')} flash={flash === 'active_minutes'} onTop={onTop}
          icon={<Heart size={16} strokeWidth={2} />}
          title={week.names.active_minutes.heading}
          count={
            <>
              <b className="font-bold text-ink">
                {week.active.minutes}
                {ring('active_minutes')?.target != null ? ` of ${ring('active_minutes')?.target}` : ''}
              </b>{' '}
              min
            </>
          }
        >
          <ActiveBody week={week} />
        </DetailCard>
      )}
    </>
  );
}

function DetailCard({
  id,
  icon,
  title,
  count,
  flash,
  onTop,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  count: ReactNode;
  flash: boolean;
  onTop: () => void;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="card px-3 py-2.5 mt-2 scroll-mt-4 transition-[outline-color] duration-300"
      style={{ outline: '2px solid', outlineColor: flash ? COLOR.green300 : 'transparent' }}
    >
      <CardHead icon={icon} right={<span className="text-label text-muted whitespace-nowrap">{count}</span>}>
        {title}
      </CardHead>
      {children}
      <div className="text-right">
        <button type="button" onClick={onTop} className="text-label text-green-700 min-h-[32px]">
          Back to top ↑
        </button>
      </div>
    </div>
  );
}

function Row({ title, sub, right, onClick }: { title: string; sub: string; right: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="min-w-0">
        <b className="block text-label font-bold text-ink">{title}</b>
        <span className="block text-label text-muted">{sub}</span>
      </span>
      <span className="text-label text-muted whitespace-nowrap text-right tabular-nums">
        {right}
        {onClick && <span className="text-hint"> ›</span>}
      </span>
    </>
  );
  const cls = 'w-full flex items-center justify-between gap-2 py-1.5 border-t border-hairline text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// "42 min · 118 bpm"; a part with nothing is left off.
function minBpm(w: Workout): string {
  return [w.minutes ? `${w.minutes} min` : null, w.hr?.avgBpm ? `${w.hr.avgBpm} bpm` : null]
    .filter(Boolean)
    .join(' · ');
}

function SessionDetails({
  type,
  actual,
  target,
  heading,
  flash,
  onTop,
}: {
  type: TrainingType;
  actual: number;
  target: number | null;
  heading: string; // the goal's name (renamed or built in)
  flash: boolean;
  onTop: () => void;
}) {
  const navigate = useNavigate();
  const recent = useLiveQuery(() => getRecentWorkouts(type, 3), [type]);
  const strength = type !== 'cardio';
  return (
    <DetailCard
      id={detailsId(type)}
      flash={flash}
      onTop={onTop}
      icon={
        strength ? (
          <span className="inline-flex items-center gap-0.5">
            <DumbbellIcon />
            {ARROW[type]}
          </span>
        ) : (
          <RunnerIcon />
        )
      }
      title={heading}
      count={
        <>
          <b className="font-bold text-ink">
            {actual}
            {target !== null ? ` of ${target}` : ''}
          </b>{' '}
          this week
        </>
      }
    >
      <div className="mt-1.5">
        {recent && recent.length === 0 && <p className="text-label text-hint py-1">Nothing logged yet.</p>}
        {(recent ?? []).map((w) => (
          <Row
            key={w.id}
            title={dayDateLabel(w.date)}
            sub={
              strength
                ? w.exercises.length === 0
                  ? 'No exercises logged'
                  : w.exercises.slice(0, 3).join(', ') +
                    (w.exercises.length > 3 ? ` + ${w.exercises.length - 3} more` : '')
                : [w.name, w.distance].filter(Boolean).join(' · ')
            }
            right={minBpm(w)}
            onClick={() => navigate(openPath(w))}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => navigate(strength ? `/log/strength?type=${type}` : '/log/cardio')}
        className="pill pill-soft border-hairline mt-1.5"
      >
        {strength ? `Start ${heading}` : 'Log cardio'}
      </button>
    </DetailCard>
  );
}

function ActiveBody({ week }: { week: NonNullable<Awaited<ReturnType<typeof getTrainingWeek>>> }) {
  const navigate = useNavigate();
  const line = week.active.line;
  // This week's workouts with Active minutes, and Watch workouts no session
  // matched, newest first. Together they add up to the total above.
  const rows = [
    ...week.workouts
      .filter((w) => w.hr)
      .map((w) => ({
        key: w.id,
        at: w.time ?? w.date,
        title: `${shortDayLabel(w.date)} · ${w.name}`,
        sub:
          w.hr!.basis === 'said-so'
            ? `${w.hr!.activeMinutes} min, you said so`
            : `${w.hr!.activeMinutes} of ${w.hr!.workoutMinutes ?? w.minutes ?? 0} min above your line`,
        right: w.hr!.avgBpm ? `${w.hr!.avgBpm} bpm avg` : '',
        open: () => navigate(openPath(w)),
      })),
    ...week.activeData.unmatched.map(({ workout, activeSeconds }) => ({
      key: workout.id,
      at: workout.workout_start,
      title: `${shortDayLabel(workout.date)} · ${formatWorkoutType(workout.workout_type)}`,
      sub: `${toMinutes(activeSeconds)} of ${workout.duration_minutes} min above your line`,
      right: workout.avg_bpm ? `${workout.avg_bpm} bpm avg` : '',
      open: undefined,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="mt-1">
      <p className="text-label text-muted">
        {line ? (
          <>
            Your line: <b className="font-bold text-ink">{line.line} bpm</b> (64% of your{' '}
            {line.method === 'measured' ? 'measured ' : ''}max, {line.max})
          </>
        ) : (
          'No line yet: it comes from your age, set in the nutrition setup.'
        )}
      </p>
      <div className="mt-1.5">
        {rows.length === 0 && <p className="text-label text-hint py-1">Nothing this week yet.</p>}
        {rows.map((r) => (
          <Row key={r.key} title={r.title} sub={r.sub} right={r.right} onClick={r.open} />
        ))}
      </div>
    </div>
  );
}
