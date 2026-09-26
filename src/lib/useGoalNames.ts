import { useLiveQuery } from 'dexie-react-hooks';
import { getGoals } from './goals';
import { ringNames } from './training';
import type { GoalNames } from './goalNames';
import type { RingKey } from './training';

// The weekly goals' names (renamed or built in), live, for screens that show
// a session type outside the Fitness cards: the session picker, a session in
// progress, Session Saved and the exercise sheet. Built-in names until the
// goals have loaded.
export function useRingNames(): Record<RingKey, GoalNames> {
  const weekly = useLiveQuery(() => getGoals('week'), []);
  return ringNames(weekly ?? []);
}
