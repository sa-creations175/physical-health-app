import { useLiveQuery } from 'dexie-react-hooks';
import SharedActivityCard from './SharedActivityCard';
import { db } from '../../db/database';
import { LOCAL_USER_ID } from '../../lib/constants';
import { DOT_COLOR } from '../../lib/dotHelpers';
import { currentWeekISODates } from '../../lib/dateHelpers';
import type { BodyGoal } from '../../db/types';

// A weekly goal the person added themselves ("Swim, 2 a week"). It counts this
// week's cardio logs whose activity has the goal's name, the same rule the
// Fitness Score uses.
export default function CustomGoalCard({
  goal,
  expanded,
  onToggle,
}: {
  goal: BodyGoal;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dates = currentWeekISODates();
  const byDay = useLiveQuery(
    async () => {
      const [logs, types] = await Promise.all([
        db.cardio_logs.where('user_id').equals(LOCAL_USER_ID).toArray(),
        db.cardio_types.toArray(),
      ]);
      const want = goal.name.trim().toLowerCase();
      const ids = new Set(types.filter((t) => t.name.trim().toLowerCase() === want).map((t) => t.id));
      const out = new Map<string, number>();
      for (const l of logs) {
        if (!ids.has(l.cardio_type_id)) continue;
        const d = new Date(l.started_at).toLocaleDateString('en-CA');
        out.set(d, (out.get(d) ?? 0) + 1);
      }
      return out;
    },
    [goal.name],
    new Map<string, number>(),
  );
  const count = dates.reduce((n, d) => n + (byDay.get(d) ?? 0), 0);
  const done = count >= goal.target;

  return (
    <SharedActivityCard
      label={goal.name}
      badge={
        <>
          {count}
          <span className="text-label font-medium text-muted"> / {goal.target}</span>
          {done && <span className="text-green-700"> ✓</span>}
        </>
      }
      dots={dates.map((date) => ({
        date,
        color: byDay.has(date) ? DOT_COLOR.full : DOT_COLOR.none,
      }))}
      expanded={expanded}
      onToggle={onToggle}
    >
      <p className="text-label text-muted">
        Counts cardio you log as “{goal.name}”.
      </p>
    </SharedActivityCard>
  );
}
