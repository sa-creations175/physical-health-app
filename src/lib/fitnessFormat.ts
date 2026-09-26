// Small formatting and routing helpers the Fitness screen's pieces share.
import type { RingKey, Workout } from './bodySignals';

// How a ring fills against a goal. A goal of 0 is full once there's anything.
export function ringFill(actual: number, target: number | null): number {
  if (target === null) return 0;
  if (target <= 0) return actual > 0 ? 1 : 0;
  return actual / target;
}

// "Mon, Sep 21".
export function dayDateLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// "5:30 PM".
export function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// 6,200 → "6.2k"; under 1,000 as is.
export function compactNumber(n: number): string {
  if (n < 1000) return n.toLocaleString();
  return `${(Math.round(n / 100) / 10).toLocaleString()}k`;
}

// The id of a Details card, for "<Type> details ›" to scroll to.
export const detailsId = (key: RingKey) => `details-${key}`;

// Where tapping a workout goes: a finished session's summary, an unfinished
// one back into the session, a cardio log's saved record in History.
export function openPath(w: Workout): string {
  if (w.kind === 'cardio') return `/history?open=${w.id}`;
  return w.complete ? `/log/strength/complete/${w.id}` : `/log/strength/active/${w.id}`;
}

// "7h12"; whole hours as "7h".
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

// Active minutes as shown: "150" in minutes, or "2h 30m" in hours (the
// Goals sheet's min | hours switch). `tight` drops the space for a ring
// ("2h30m"). Only the display changes; everything is stored in minutes.
export function activeMinutesLabel(minutes: number, asHours: boolean, tight = false): string {
  if (!asHours) return minutes.toLocaleString();
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return tight ? `${h}h${m}m` : `${h}h ${m}m`;
}
