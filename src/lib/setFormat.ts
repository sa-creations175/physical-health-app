import type { SetEntry } from '../db/types';

export function formatDurationSecs(secs: number): string {
  if (secs <= 0) return '0s';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s === 0 ? `${m}:00` : `${m}:${s.toString().padStart(2, '0')}`;
}

// Right-hand side of a "weight × X" set summary — handles both rep and
// duration sets so the LAST history row, completion summaries, and any
// other display surface render uniformly.
export function formatSetMagnitude(set: Pick<SetEntry, 'set_type' | 'reps' | 'duration_seconds'>): string {
  if (set.set_type === 'duration') {
    return formatDurationSecs(set.duration_seconds ?? 0);
  }
  return String(set.reps);
}
