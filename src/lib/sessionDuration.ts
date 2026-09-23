// Session length comes from the Apple Watch, never an in-app clock: the
// strength workout the Watch recorded on the session's day. Read-only; the
// Watch import itself is untouched.
import { isHealthKitAvailable, ensureHealthPermissions, getRecentWorkouts } from './healthkit';
import { classifyWatchWorkout } from './watchImport';
import type { Session } from '../db/types';

// Minutes, or null when there's no matching Watch workout (or no HealthKit).
export async function getWatchDurationForSession(
  session: Pick<Session, 'date' | 'source' | 'duration_minutes'>,
): Promise<number | null> {
  // The Watch import already merged a strength workout into this session.
  if (session.source === 'merged' && session.duration_minutes) return session.duration_minutes;
  if (!(await isHealthKitAvailable()) || !(await ensureHealthPermissions())) return null;
  const sessionDay = new Date(session.date + 'T00:00:00');
  const daysBack = Math.max(
    1,
    Math.ceil((Date.now() - sessionDay.getTime()) / 86_400_000) + 1,
  );
  const workouts = await getRecentWorkouts(daysBack);
  const sameDay = workouts.filter(
    (w) =>
      new Date(w.startDate).toLocaleDateString('en-CA') === session.date &&
      classifyWatchWorkout(w.workoutType, w.durationMinutes).category === 'strength',
  );
  if (sameDay.length === 0) return null;
  return Math.max(...sameDay.map((w) => w.durationMinutes));
}
