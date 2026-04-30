import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { SectionLabel, ProgressBar, SevenDayDotRow } from '../ui/primitives';
import { getCardioSummary } from '../../lib/dashboardQueries';
import { DEFAULT_CARDIO_WEEKLY_TARGET } from '../../lib/defaults';

// Two stripe colors signal pillar progress at a glance: deep green is the
// default accent, mint marks "weekly target hit" — same green family, just
// brighter, like a coach's nod for good work.
const STRIPE_DEFAULT = '#0F6E56';
const STRIPE_COMPLETE = '#5DCAA5';

export default function CardioSection() {
  const [expanded, setExpanded] = useState(false);
  const summary = useLiveQuery(() => getCardioSummary(), []);
  const count = summary?.thisWeekCount ?? 0;
  const target = DEFAULT_CARDIO_WEEKLY_TARGET;
  const remaining = Math.max(0, target - count);
  const complete = target > 0 && count >= target;

  return (
    <section className="px-5 mt-6">
      <SectionLabel>This week — cardio</SectionLabel>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          borderLeftWidth: '2px',
          borderLeftColor: complete ? STRIPE_COMPLETE : STRIPE_DEFAULT,
        }}
        className={`mt-2 w-full bg-card border rounded-xl p-4 text-left transition-colors ${
          expanded ? 'border-green-mint' : 'border-card-edge'
        }`}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="leading-none flex items-baseline gap-2">
              <span className="text-[19px] font-medium text-ink">{count}</span>
              <span className="text-[12px] text-card-mute">of {target} target</span>
              {complete && (
                <span
                  aria-label="weekly target met"
                  className="text-[12px] text-green-mint leading-none"
                >
                  ✓
                </span>
              )}
            </p>
            <p className="text-[11px] text-card-mute mt-1">
              {count === 0
                ? 'no data yet'
                : remaining > 0
                ? `${remaining} more to hit your week`
                : 'caught up'}
            </p>
          </div>
          <SessionPills done={count} total={target} complete={complete} />
        </div>
        <div className="mt-3">
          <ProgressBar
            value={count}
            max={target}
            color={complete ? 'green-light' : 'green-leaf'}
            trackColor="#0a2a1e"
          />
        </div>
      </button>

      {expanded && (
        <div className="bg-card border border-card-edge rounded-xl p-4 mt-2">
          {summary && <SevenDayDotRow dots={summary.weekDots} />}
          <div className="mt-3 pt-3 border-t border-divider">
            {summary?.lastSession ? (
              <p className="text-[12px] text-card-mute capitalize">
                <span className="text-card-mute normal-case">Last:</span>{' '}
                {summary.lastSession.summary}
              </p>
            ) : (
              <p className="text-[12px] text-card-mute">no data yet</p>
            )}
          </div>
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
  const cappedDone = Math.min(done, total);
  const pills = Array.from({ length: total }, (_, i) => i < cappedDone);
  const filledColor = complete ? '#5DCAA5' : '#0F6E56';
  return (
    <div className="flex gap-1.5 items-center flex-wrap justify-end max-w-[140px]">
      {pills.map((isDone, i) =>
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
            className="block w-3 h-[2px] rounded-full"
            style={{ background: '#555' }}
            aria-hidden="true"
          />
        ),
      )}
    </div>
  );
}
