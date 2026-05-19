import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel, ProgressBar } from '../ui/primitives';
import { getCardioSummary, type CardioSessionRow } from '../../lib/dashboardQueries';
import {
  DEFAULT_CARDIO_WEEKLY_TARGET,
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../../lib/defaults';
import { getUserPreferences } from '../../lib/userPreferences';
import { shortDayLabel } from '../../lib/dateHelpers';
import type { Intensity } from '../../db/types';

const STRIPE_DEFAULT = '#0F6E56';
const STRIPE_COMPLETE = '#5DCAA5';

const INTENSITY_SHORT: Record<Intensity, string> = {
  low: 'low',
  moderate: 'mod',
  high: 'high',
};

export default function CardioSection() {
  const [expanded, setExpanded] = useState(false);
  const prefs = useLiveQuery(() => getUserPreferences(), []);
  const target = prefs?.cardio_target_weekly ?? DEFAULT_CARDIO_WEEKLY_TARGET;
  const threshold =
    prefs?.cardio_threshold_minutes ?? DEFAULT_CARDIO_THRESHOLD_MINUTES;

  const summary = useLiveQuery(
    () => getCardioSummary(threshold),
    [threshold],
  );

  const qualifying = summary?.qualifyingCount ?? 0;
  const shortCount = summary?.shortCount ?? 0;
  const qualifyingMinutes = summary?.qualifyingMinutes ?? 0;
  const remaining = Math.max(0, target - qualifying);
  const complete = target > 0 && qualifying >= target;
  const overshoot = complete ? Math.max(0, qualifying - target) : 0;

  return (
    <section className="px-5 mt-6">
      <SectionLabel>This week — cardio</SectionLabel>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          borderTopWidth: complete ? '3px' : '1px',
          borderTopColor: complete ? STRIPE_COMPLETE : '#555555',
          borderLeftWidth: '2px',
          borderLeftColor: complete ? STRIPE_COMPLETE : STRIPE_DEFAULT,
        }}
        className={`mt-2 w-full bg-card border rounded-xl p-4 text-left transition-colors ${
          expanded ? 'border-green-mint' : 'border-card-edge'
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-micro uppercase text-green-mint font-semibold flex items-center gap-1">
              Cardio
              {complete && (
                <span aria-label="weekly target met" className="text-green-mint">
                  ✓
                </span>
              )}
            </p>
            <p className="mt-1 leading-none flex items-baseline gap-2">
              <span className="text-[22px] font-medium text-ink">{qualifying}</span>
              <span className="text-[12px] text-card-mute">
                / {target} sessions
              </span>
            </p>
            {/* Qualifying minutes — sessions ≥ threshold only, so this
                stat tracks the same definition of "counts" as the
                headline. Short sessions are excluded here even though
                they still appear in the expanded list below. */}
            <p className="text-[11px] text-card-mute mt-1">
              {qualifyingMinutes} min this week
              {shortCount > 0 && (
                <span> · {shortCount} short</span>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SessionPills done={qualifying} total={target} complete={complete} />
            {overshoot > 0 && (
              <span className="text-[10px] tracking-[0.04em] uppercase text-green-mint font-semibold">
                +{overshoot} over target
              </span>
            )}
          </div>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={qualifying}
            max={target}
            color={complete ? 'green-light' : 'green-deep'}
            trackColor="#1a2e22"
          />
        </div>
        <p className="text-[11px] mt-2">
          {complete ? (
            <span className="text-green-mint">You crushed your week</span>
          ) : (
            <span className="text-card-mute">
              {remaining} more to hit your week
            </span>
          )}
        </p>
      </button>

      {expanded && (
        <div className="bg-card border border-card-edge rounded-xl p-4 mt-2">
          <p className="text-[9px] tracking-micro uppercase text-card-mute font-semibold">
            This week's sessions
          </p>
          {summary && summary.sessions.length > 0 ? (
            <div className="mt-3">
              <SessionList rows={summary.sessions} />
            </div>
          ) : (
            <p className="text-[12px] text-card-mute mt-3 text-center">
              No sessions logged this week yet
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function SessionPills({
  done,
  total,
  complete,
}: {
  done: number;
  total: number;
  complete: boolean;
}) {
  if (total <= 0) return null;
  // When complete (or overshooting), every pill renders as filled.
  const cappedDone = complete ? total : Math.min(done, total);
  const filledColor = complete ? STRIPE_COMPLETE : STRIPE_DEFAULT;
  return (
    <div className="flex gap-1.5 items-center flex-wrap justify-end max-w-[140px]">
      {Array.from({ length: total }, (_, i) => i < cappedDone).map((isDone, i) =>
        isDone ? (
          <span
            key={i}
            className="block w-2.5 h-2.5 rounded-full"
            style={{ background: filledColor }}
            aria-hidden="true"
          />
        ) : (
          <span
            key={i}
            className="block w-2.5 h-2.5 rounded-full border border-dashed"
            style={{ borderColor: '#555' }}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}

function SessionList({ rows }: { rows: CardioSessionRow[] }) {
  // Day label appears only on the first session of each day; subsequent
  // same-day rows leave the column blank but content stays aligned.
  let lastDate: string | null = null;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const showDay = row.date !== lastDate;
        lastDate = row.date;
        return (
          <li
            key={row.id}
            className="flex items-center gap-3 text-[12px]"
            style={{ opacity: row.qualifying ? 1 : 0.65 }}
          >
            <span className="w-9 text-card-mute uppercase tracking-micro text-[10px]">
              {showDay ? shortDayLabel(row.date) : ''}
            </span>
            <span className="flex-1 text-ink-body flex items-center gap-1.5 min-w-0">
              <span className="truncate">{row.type_name}</span>
              {!row.qualifying && <ShortBadge />}
            </span>
            <span className="text-ink-body whitespace-nowrap">
              {row.duration_minutes} min
            </span>
            {row.distance_miles !== null && (
              <span className="text-ink-body whitespace-nowrap">
                {row.distance_miles.toFixed(1)} mi
              </span>
            )}
            <span className="text-card-mute w-10 text-right whitespace-nowrap">
              {INTENSITY_SHORT[row.intensity]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function ShortBadge() {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[9px] tracking-micro uppercase font-semibold text-card-mute border border-card-edge"
      aria-label="Below threshold"
    >
      Short
    </span>
  );
}
