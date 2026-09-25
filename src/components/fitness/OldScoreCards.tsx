import { useLiveQuery } from 'dexie-react-hooks';
import { ProgressBar } from '../ui/primitives';
import { getFitnessScore, type WeeklyProgress } from '../../lib/fitnessScore';
import { summaryNarrative, type NarrativeKey } from '../../lib/pillarNarrative';
import { todayISODate } from '../../lib/dateHelpers';
import { COLOR } from '../../lib/brand';

// Two cards from the old Home, kept under Fitness's "Still to place" (Build 8)
// because parts of them aren't shown anywhere else yet: the Fitness Score as
// one % with a bar per weekly goal and the one-liner across all goals, and the
// average per day against each daily goal (reps a day included). Each keeps
// its "Edit goals" button, which opens the old goals sheet (rename, untick,
// remove).

// Dial — the week's overall fullness as one %. A conic ring: Green 700 for
// the filled share, Stone for the rest.
function ScoreDial({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(pct, 100));
  return (
    <div
      className="w-[84px] h-[84px] rounded-full flex items-center justify-center shrink-0"
      style={{
        background: `conic-gradient(${COLOR.green700} ${clamped}%, ${COLOR.stone} 0)`,
      }}
    >
      <span className="w-[66px] h-[66px] rounded-full bg-white flex items-center justify-center text-title text-ink tabular-nums">
        {pct}%
      </span>
    </div>
  );
}

// One weekly goal's honest breakdown: done/goal over a Green 700 bar.
function ScoreBar({ row }: { row: WeeklyProgress }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-muted truncate">{row.goal.name}</span>
        <span className="text-label font-semibold text-ink tabular-nums">
          {row.actual}/{row.goal.target}
        </span>
      </div>
      <div className="mt-1">
        <ProgressBar value={row.fraction} max={1} height={6} />
      </div>
    </div>
  );
}

const NARRATIVE_KEYS: readonly string[] = ['lower', 'upper', 'cardio', 'bundle', 'mobility'];

export function FitnessSummary({ onEditGoals }: { onEditGoals: () => void }) {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const rows = score?.weekly ?? [];

  // Four-state hype summary (win + nudge / all-clear / early-days / all-low),
  // over the goals that have a phrase bank.
  const narrative = score
    ? summaryNarrative(
        score.weekly
          .filter((w) => w.goal.metric && NARRATIVE_KEYS.includes(w.goal.metric))
          .map((w) => ({
            key: w.goal.metric as NarrativeKey,
            fraction: w.fraction,
            participates: true,
          })),
        score.daysElapsed,
        todayISODate(),
      )
    : null;

  return (
    <div className="card p-4">
      <div className="card-head">
        <p className="card-heading">Fitness Score</p>
        <button type="button" onClick={onEditGoals} className="pill pill-soft py-1 px-2.5">
          Edit goals
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <ScoreDial pct={score?.dialPct ?? 0} />
        <div className="flex-1 min-w-0 space-y-2">
          {rows.length === 0 ? (
            <p className="text-label text-muted">
              No weekly goals yet. Tap Edit goals to add one.
            </p>
          ) : (
            rows.map((r) => <ScoreBar key={r.goal.id} row={r} />)
          )}
        </div>
      </div>

      {narrative && (
        <div className="callout mt-3 space-y-0.5">
          {narrative.message && (
            <p className="font-semibold text-green-900">{narrative.message}</p>
          )}
          {narrative.win && (
            <p className="font-semibold text-green-900">{narrative.win}</p>
          )}
          {narrative.nudge && <p className="text-muted">→ {narrative.nudge}</p>}
          {narrative.allClear && (
            <p className="font-semibold text-green-900">{narrative.allClear}</p>
          )}
        </div>
      )}
    </div>
  );
}

// "cal/day" under the calories number, and so on. A goal the person added
// themselves is labelled with its own name.
const DAILY_LABEL: Record<string, string> = {
  calories: 'cal/day',
  exercise_minutes: 'exercise min/day',
  steps: 'steps/day',
  reps: 'reps/day',
};

// This week's average per day against each daily goal: the number, a label,
// a mini-bar (green at or past the goal, Bronze Amber under it) and the goal.
// An unticked goal keeps its number and drops the bar and the goal line.
export function DailyAverages({ onEditGoals }: { onEditGoals: () => void }) {
  const score = useLiveQuery(() => getFitnessScore(), []);
  const daily = score?.daily ?? [];
  return (
    <div className="tile p-4">
      <div className="card-head">
        <p className="card-heading">This Week, Average Per Day</p>
        <button type="button" onClick={onEditGoals} className="pill pill-soft py-1 px-2.5 shrink-0">
          Edit goals
        </button>
      </div>
      {daily.length === 0 ? (
        <p className="text-label text-muted mt-3">No daily goals yet. Tap Edit goals to add one.</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-y-3">
          {daily.map(({ goal, average, met }) => {
            const judged = goal.active && goal.target > 0;
            const pct = judged && average !== null ? Math.min(100, (average / goal.target) * 100) : 0;
            return (
              <div key={goal.id} className="text-center">
                <p className="text-title text-ink tabular-nums">
                  {average === null ? '—' : Math.round(average).toLocaleString()}
                </p>
                <p className="text-label text-muted">
                  {goal.metric ? DAILY_LABEL[goal.metric] : goal.name.toLowerCase()}
                </p>
                {judged && (
                  <>
                    <div className="mx-auto mt-1.5 h-1 w-14 rounded-full bg-white overflow-hidden">
                      <div
                        className={`h-full rounded-full ${met === false ? 'bg-amber' : 'bg-green-700'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-micro font-normal tracking-normal text-hint mt-1">
                      goal {goal.target.toLocaleString()}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
