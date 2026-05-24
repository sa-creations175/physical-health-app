import { currentWeekISODates } from './dateHelpers';
import { getDayIntensity } from './bundleHelpers';
import type { BundleLog, UserPreferences } from '../db/types';

// Shared palette for the 7-day intensity dot rows on the compact activity
// cards (Build 2.7). Greens ramp light → full; ordered-delivery is red.
export const DOT_COLOR = {
  none: '#e0e4e0',
  light: '#a8dfc0',
  medium: '#4db888',
  full: '#22c37e',
  ordered: '#e03b5a',
} as const;

export interface ActivityDot {
  date: string;
  color: string;
}

// Lifting — binary: a completed session that day = full green, else grey.
export function liftingDots(
  weekDots: { date: string; hadSession: boolean }[],
): ActivityDot[] {
  return weekDots.map((d) => ({
    date: d.date,
    color: d.hadSession ? DOT_COLOR.full : DOT_COLOR.none,
  }));
}

// Cardio — qualifying (≥ threshold) = full, any shorter session = light.
export function cardioDots(
  sessions: { date: string; qualifying: boolean }[],
): ActivityDot[] {
  return currentWeekISODates().map((date) => {
    const day = sessions.filter((s) => s.date === date);
    if (day.some((s) => s.qualifying)) return { date, color: DOT_COLOR.full };
    if (day.length > 0) return { date, color: DOT_COLOR.light };
    return { date, color: DOT_COLOR.none };
  });
}

// Mobility — minutes ≥ threshold = full, any logged = light.
export function mobilityDots(
  byDate: Map<string, BundleLog>,
  minMinutes: number,
): ActivityDot[] {
  return currentWeekISODates().map((date) => {
    const m = byDate.get(date)?.mobility_minutes ?? 0;
    if (m >= minMinutes) return { date, color: DOT_COLOR.full };
    if (m > 0) return { date, color: DOT_COLOR.light };
    return { date, color: DOT_COLOR.none };
  });
}

// Daily bundle — maps the existing four intensity bands to the dot ramp.
export function bundleDots(
  byDate: Map<string, BundleLog>,
  prefs: UserPreferences | undefined,
): ActivityDot[] {
  return currentWeekISODates().map((date) => {
    const log = byDate.get(date);
    if (!log || !prefs) return { date, color: DOT_COLOR.none };
    const intensity = getDayIntensity(log, prefs);
    const color =
      intensity === 'full'
        ? DOT_COLOR.full
        : intensity === 'medium'
          ? DOT_COLOR.medium
          : intensity === 'low'
            ? DOT_COLOR.light
            : DOT_COLOR.none;
    return { date, color };
  });
}

// Delivery — clean = full green, ordered = red, unmarked = grey.
export function deliveryDots(
  byStatus: Map<string, 'clean' | 'ordered'>,
): ActivityDot[] {
  return currentWeekISODates().map((date) => {
    const s = byStatus.get(date);
    if (s === 'clean') return { date, color: DOT_COLOR.full };
    if (s === 'ordered') return { date, color: DOT_COLOR.ordered };
    return { date, color: DOT_COLOR.none };
  });
}
