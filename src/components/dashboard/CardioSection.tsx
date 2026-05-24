import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel, ProgressBar } from '../ui/primitives';
import { PulseIcon } from './PillarIcons';
import { getCardioSummary } from '../../lib/dashboardQueries';
import {
  DEFAULT_CARDIO_WEEKLY_TARGET,
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
} from '../../lib/defaults';
import { getUserPreferences } from '../../lib/userPreferences';

const STRIPE_DEFAULT = '#0F6E56';
const STRIPE_COMPLETE = '#5DCAA5';

export default function CardioSection({
  label = 'This Week — Cardio',
}: {
  label?: string;
}) {
  const navigate = useNavigate();
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
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <PulseIcon />
      </div>
      {/* Tap routes straight to the cardio logger (same pattern as the
          lifting tiles). No expand-in-place — the card is a summary + entry. */}
      <button
        type="button"
        onClick={() => navigate('/log/cardio')}
        aria-label="Log cardio"
        style={{
          borderTopWidth: complete ? '3px' : '1px',
          borderTopColor: complete ? STRIPE_COMPLETE : '#e3e8e4',
          borderLeftWidth: '2px',
          borderLeftColor: complete ? STRIPE_COMPLETE : STRIPE_DEFAULT,
        }}
        className="mt-2 w-full bg-card border border-card-edge rounded-xl p-4 text-left transition-colors"
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
            trackColor="#e7ece8"
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
            style={{ borderColor: '#cdd5cf' }}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}

