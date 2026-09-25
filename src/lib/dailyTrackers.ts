// Home's Nutrition, Hygiene, Habits and Checkups cards read from here
// (through lib/bodySignals.ts). Each card has one shared place.
//
// Four sources don't exist yet. Each is a single function below marked
// NOTHING YET that returns "nothing" today. When the feature is built, it
// fills that one function and Home picks it up with no Home changes:
//   getEatenByDay      calories and protein eaten per day (meal logging)
//   getHygieneByDay    brushed and flossed per day (More → Hygiene)
//   getDrinksByDay     drinks per day (More → Habits)
//   getDrinksLimit     the weekly drinks limit (More → Habits)
import { db } from '../db/database';
import { LOCAL_USER_ID } from './constants';
import { currentWeekISODates, todayISODate } from './dateHelpers';
import { getActiveSeason } from './nutritionSeason';
import type { CheckinType } from '../db/types';

// A day against a target, for a row of dots:
//   met    — on target
//   some   — today, something logged but not on target yet
//   missed — a day that's over, something logged but not on target
//   none   — nothing logged, or later this week
export type DayMark = 'met' | 'some' | 'missed' | 'none';

export function markFor(date: string, today: string, logged: number, onTarget: boolean): DayMark {
  if (date > today || logged <= 0) return 'none';
  if (onTarget) return 'met';
  return date === today ? 'some' : 'missed';
}

// ---- Nutrition --------------------------------------------------------------------

// NOTHING YET: meal logging doesn't exist. It fills this map (local date →
// calories and protein grams eaten that day); until then every day reads 0.
export async function getEatenByDay(
  from: string,
  to: string,
): Promise<Map<string, { calories: number; protein: number }>> {
  void from;
  void to;
  return new Map();
}

export type NutritionMetric = 'calories' | 'protein' | 'water';

export interface NutritionTrack {
  today: number;
  target: number | null; // a day's target from the season; null without one
  week: number; // this week so far
  weekTarget: number | null; // the day's target × 7
  days: { date: string; mark: DayMark }[];
  met: number;
}

export interface NutritionWeek {
  hasSeason: boolean;
  tracks: Record<NutritionMetric, NutritionTrack>;
}

// Calories are on target within 10% either side of the day's target (over
// counts as off target as much as under); protein and water at or past it.
const CALORIE_BAND = 0.1;

export async function getNutritionWeek(): Promise<NutritionWeek> {
  const dates = currentWeekISODates();
  const today = todayISODate();
  const [season, eaten, logs] = await Promise.all([
    getActiveSeason(),
    getEatenByDay(dates[0], dates[6]),
    db.nutrition_logs.where('date').anyOf(dates).filter((r) => r.user_id === LOCAL_USER_ID).toArray(),
  ]);
  const bottles = new Map(logs.map((l) => [l.date, l.water_bottles_logged ?? 0]));
  const track = (
    value: (d: string) => number,
    target: number | null,
    onTarget: (v: number, t: number) => boolean,
  ): NutritionTrack => {
    const days = dates.map((date) => {
      const v = value(date);
      return { date, mark: markFor(date, today, v, target !== null && target > 0 && onTarget(v, target)) };
    });
    return {
      today: value(today),
      target,
      week: dates.filter((d) => d <= today).reduce((n, d) => n + value(d), 0),
      weekTarget: target !== null ? target * 7 : null,
      days,
      met: days.filter((d) => d.mark === 'met').length,
    };
  };
  return {
    hasSeason: !!season,
    tracks: {
      calories: track(
        (d) => eaten.get(d)?.calories ?? 0,
        season?.daily_calories_target ?? null,
        (v, t) => Math.abs(v - t) <= t * CALORIE_BAND,
      ),
      protein: track((d) => eaten.get(d)?.protein ?? 0, season?.protein_target_g ?? null, (v, t) => v >= t),
      water: track((d) => bottles.get(d) ?? 0, season?.water_target_bottles ?? null, (v, t) => v >= t),
    },
  };
}

// ---- Hygiene ----------------------------------------------------------------------

// NOTHING YET: Hygiene logging doesn't exist. It fills this map (local date →
// times brushed and whether you flossed); null means it isn't set up.
export async function getHygieneByDay(
  from: string,
  to: string,
): Promise<Map<string, { brushed: number; flossed: boolean }> | null> {
  void from;
  void to;
  return null;
}

export interface HygieneWeek {
  setUp: boolean;
  brushed: { days: { date: string; mark: DayMark }[]; count: number }; // 2× a day; once is half
  flossed: { days: { date: string; mark: DayMark }[]; count: number };
}

export async function getHygieneWeek(): Promise<HygieneWeek> {
  const dates = currentWeekISODates();
  const today = todayISODate();
  const byDay = await getHygieneByDay(dates[0], dates[6]);
  const brushedDays = dates.map((date) => {
    const n = byDay?.get(date)?.brushed ?? 0;
    // Brushed once is half a day, whether today or past.
    const mark: DayMark = date > today || n <= 0 ? 'none' : n >= 2 ? 'met' : 'some';
    return { date, mark };
  });
  const flossedDays = dates.map((date) => ({
    date,
    mark: (date <= today && byDay?.get(date)?.flossed ? 'met' : 'none') as DayMark,
  }));
  return {
    setUp: byDay !== null,
    brushed: { days: brushedDays, count: brushedDays.filter((d) => d.mark === 'met').length },
    flossed: { days: flossedDays, count: flossedDays.filter((d) => d.mark === 'met').length },
  };
}

// ---- Habits: drinks ---------------------------------------------------------------

// NOTHING YET: drinks logging doesn't exist. It fills this map (local date →
// drinks that day); null means it isn't set up.
export async function getDrinksByDay(from: string, to: string): Promise<Map<string, number> | null> {
  void from;
  void to;
  return null;
}

// NOTHING YET: the weekly drinks limit (7 in the prototype) is set in
// More → Habits; null until it exists.
export async function getDrinksLimit(): Promise<number | null> {
  return null;
}

export interface DrinksWeek {
  setUp: boolean;
  count: number; // drinks this week
  limit: number | null;
  // A day with no drink is on; a day with a drink is a miss.
  days: { date: string; mark: DayMark }[];
  drinkFreeDays: number;
}

export async function getDrinksWeek(): Promise<DrinksWeek> {
  const dates = currentWeekISODates();
  const today = todayISODate();
  const [byDay, limit] = await Promise.all([getDrinksByDay(dates[0], dates[6]), getDrinksLimit()]);
  const days = dates.map((date) => {
    if (!byDay || date > today) return { date, mark: 'none' as DayMark };
    const n = byDay.get(date) ?? 0;
    return { date, mark: (n > 0 ? 'missed' : 'met') as DayMark };
  });
  return {
    setUp: byDay !== null,
    count: dates.reduce((n, d) => n + (byDay?.get(d) ?? 0), 0),
    limit,
    days,
    drinkFreeDays: days.filter((d) => d.mark === 'met').length,
  };
}

// ---- Checkups ---------------------------------------------------------------------

// Reads the existing checkups table (health_checkins: type, last visit, how
// often in months). Nothing writes to it yet; More → Checkups will.
const CHECKUP_LABEL: Record<CheckinType, string> = {
  doctor: 'Physical',
  dental: 'Dental',
  derm: 'Skin check',
  custom: 'Checkup',
};

export interface CheckupItem {
  label: string;
  lastVisit: string | null; // YYYY-MM-DD
  due: string | null; // last visit + how often; null without a last visit
}

export interface CheckupsSummary {
  setUp: boolean;
  items: CheckupItem[];
  next: CheckupItem | null; // the soonest due
}

export async function getCheckups(): Promise<CheckupsSummary> {
  const rows = await db.health_checkins.where('user_id').equals(LOCAL_USER_ID).toArray();
  const items = rows.map((r) => {
    let due: string | null = null;
    if (r.last_visit_date && r.frequency_months > 0) {
      const d = new Date(r.last_visit_date + 'T00:00:00');
      d.setMonth(d.getMonth() + r.frequency_months);
      due = d.toLocaleDateString('en-CA');
    }
    return {
      label: r.type === 'custom' && r.custom_label ? r.custom_label : CHECKUP_LABEL[r.type],
      lastVisit: r.last_visit_date,
      due,
    };
  });
  const next = items.filter((i) => i.due).sort((a, b) => a.due!.localeCompare(b.due!))[0] ?? null;
  return { setUp: rows.length > 0, items, next };
}
