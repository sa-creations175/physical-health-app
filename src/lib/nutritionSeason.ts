import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { getActiveCaloriesDailyAverage } from './healthkit';
import type {
  BiologicalSex,
  NutritionSeason,
  SeasonType,
} from '../db/types';

// Layer 2 — Season + Targets. The macro calculator. Goal-first questions map to
// a season recommendation; the season's math + the user's lean mass + a
// personalized TDEE (BMR + real Watch active calories) generate every target.

// ---- Goal questions ---------------------------------------------------------
// The three questions, asked instead of "Cut / Maintain / Build?" directly.
export type LookAnswer = 'leaner' | 'bigger' | 'both' | 'maintain';
export type TimelineAnswer = 'slow' | 'moderate' | 'fast';
export type FocusAnswer =
  | 'leanness'
  | 'upper_size'
  | 'lower_strength'
  | 'conditioning'
  | 'balanced';

export interface GoalAnswers {
  look: LookAnswer;
  timeline: TimelineAnswer;
  focus: FocusAnswer;
}

export const LOOK_OPTIONS: { value: LookAnswer; label: string }[] = [
  { value: 'leaner', label: 'Leaner' },
  { value: 'bigger', label: 'Bigger' },
  { value: 'both', label: 'Both — lean + muscular' },
  { value: 'maintain', label: 'Just maintain what I’ve built' },
];

export const TIMELINE_OPTIONS: { value: TimelineAnswer; label: string }[] = [
  { value: 'slow', label: 'Slow and sustainable' },
  { value: 'moderate', label: 'Moderately urgent' },
  { value: 'fast', label: 'As fast as responsibly possible' },
];

export const FOCUS_OPTIONS: { value: FocusAnswer; label: string }[] = [
  { value: 'leanness', label: 'Overall leanness' },
  { value: 'upper_size', label: 'Upper body size' },
  { value: 'lower_strength', label: 'Lower body strength' },
  { value: 'conditioning', label: 'Athletic conditioning' },
  { value: 'balanced', label: 'Balanced' },
];

// ---- Season math ------------------------------------------------------------
// Each season's numbers, from the spec's season table. calorie_adjustment is
// the daily delta off TDEE; protein_per_lb_lean is the hard protein anchor;
// fat_pct sets the fat share of calories (which encodes the carb descriptor —
// fewer carbs ⇒ a higher fat share); carbs are the remainder.
interface SeasonMath {
  label: string;
  calorie_adjustment: number;
  protein_per_lb_lean: number;
  fat_pct: number;
  // Plain-language fragment used in the recommendation reasoning.
  blurb: string;
}

export const SEASON_MATH: Record<SeasonType, SeasonMath> = {
  cut_aggressive: {
    label: 'Aggressive cut',
    calorie_adjustment: -500,
    protein_per_lb_lean: 1.05,
    fat_pct: 0.3,
    blurb:
      '~500 calorie daily deficit with protein kept very high to protect muscle and carbs pulled back',
  },
  cut_moderate: {
    label: 'Moderate cut',
    calorie_adjustment: -325,
    protein_per_lb_lean: 1.0,
    fat_pct: 0.27,
    blurb:
      '~325 calorie daily deficit, protein stays high to protect your muscle, carbs moderate',
  },
  maintain: {
    label: 'Maintain',
    calorie_adjustment: 0,
    protein_per_lb_lean: 0.9,
    fat_pct: 0.25,
    blurb:
      'eating right at maintenance with higher carbs to fuel training and recomp slowly',
  },
  build_lean: {
    label: 'Lean build',
    calorie_adjustment: 250,
    protein_per_lb_lean: 1.0,
    fat_pct: 0.25,
    blurb:
      '~250 calorie daily surplus with higher carbs to build muscle while staying lean',
  },
  build_aggressive: {
    label: 'Aggressive build',
    calorie_adjustment: 450,
    protein_per_lb_lean: 0.9,
    fat_pct: 0.23,
    blurb:
      '~450 calorie daily surplus with high carbs to drive maximum muscle gain',
  },
};

export function seasonLabel(type: SeasonType): string {
  return SEASON_MATH[type].label;
}

// Map the goal answers to a recommended season. Look + timeline drive the
// cut/maintain/build axis and its intensity; focus is directional and rides
// along in the reasoning rather than changing the numbers in v1.
export function recommendSeason(answers: GoalAnswers): SeasonType {
  const { look, timeline } = answers;
  if (look === 'maintain') return 'maintain';
  if (look === 'leaner') {
    return timeline === 'fast' ? 'cut_aggressive' : 'cut_moderate';
  }
  if (look === 'bigger') {
    return timeline === 'fast' ? 'build_aggressive' : 'build_lean';
  }
  // 'both' — lean + muscular: recomp at maintenance when unhurried, a lean
  // build when there's some urgency, a moderate cut when they want it fast
  // (lean out first, then build).
  if (timeline === 'slow') return 'maintain';
  if (timeline === 'moderate') return 'build_lean';
  return 'cut_moderate';
}

// ---- TDEE -------------------------------------------------------------------
// Revised Harris-Benedict BMR (metric inputs converted from lbs / inches).
export function computeBMR(
  sex: BiologicalSex,
  weightLbs: number,
  heightInches: number,
  age: number,
): number {
  const kg = weightLbs / 2.2046;
  const cm = heightInches * 2.54;
  const bmr =
    sex === 'male'
      ? 88.362 + 13.397 * kg + 4.799 * cm - 5.677 * age
      : 447.593 + 9.247 * kg + 3.098 * cm - 4.33 * age;
  return Math.round(bmr);
}

export interface TdeeResult {
  tdee: number;
  bmr: number;
  activeCaloriesAvg: number;
  daysOfData: number; // 0 when no Watch data was available
  // True when HealthKit gave us no data and we fell back to a default activity
  // estimate (web build, or Watch not connected). Surfaced as a note in the UI.
  estimatedActivity: boolean;
}

// When the Watch can't supply active calories (web build / not connected), fall
// back to a single conservative daily active-calorie figure so the calculator
// still produces targets — flagged so the UI can say so honestly.
const FALLBACK_ACTIVE_CALORIES = 450;

export async function computeTDEE(
  sex: BiologicalSex,
  weightLbs: number,
  heightInches: number,
  age: number,
): Promise<TdeeResult> {
  const bmr = computeBMR(sex, weightLbs, heightInches, age);
  const watch = await getActiveCaloriesDailyAverage(90);
  if (watch && watch.daysOfData > 0) {
    return {
      tdee: bmr + watch.avgPerDay,
      bmr,
      activeCaloriesAvg: watch.avgPerDay,
      daysOfData: watch.daysOfData,
      estimatedActivity: false,
    };
  }
  return {
    tdee: bmr + FALLBACK_ACTIVE_CALORIES,
    bmr,
    activeCaloriesAvg: FALLBACK_ACTIVE_CALORIES,
    daysOfData: 0,
    estimatedActivity: true,
  };
}

// ---- Target generation ------------------------------------------------------
export interface GeneratedTargets {
  daily_calories_target: number;
  protein_target_g: number;
  carbs_target_g: number;
  fat_target_g: number;
  fiber_guideline_g: number;
  sodium_guideline_mg: number;
  sugar_guideline_g: number;
  water_target_bottles: number;
}

// Build every target from the season, the lean mass (protein anchor + water),
// and the personalized TDEE. Protein is fixed first, fat takes its share of
// calories, carbs are whatever calories remain.
export function generateTargets(
  seasonType: SeasonType,
  leanMassLbs: number,
  tdee: number,
): GeneratedTargets {
  const m = SEASON_MATH[seasonType];
  const calories = Math.max(1200, Math.round(tdee + m.calorie_adjustment));

  const protein = Math.round(m.protein_per_lb_lean * leanMassLbs);
  const proteinCal = protein * 4;
  const fatCal = calories * m.fat_pct;
  const fat = Math.round(fatCal / 9);
  const carbs = Math.max(0, Math.round((calories - proteinCal - fatCal) / 4));

  // Secondary nutrients — awareness guidelines, not hard targets.
  const fiber = Math.round((calories / 1000) * 14); // ≥ 14g per 1000 kcal
  const sodium = 2300; // stay under (standard daily guideline)
  const sugar = Math.round((calories * 0.1) / 4); // ≤ ~10% of calories as sugar

  // Hydration in 1000ml bottles (~33.8 oz): ~0.6 oz per lb lean mass, nudged up
  // for higher activity, clamped to the spec's typical 3–4 (allow up to 5).
  const waterOz = leanMassLbs * 0.6;
  const bottles = Math.min(
    5,
    Math.max(3, Math.round(waterOz / 33.8)),
  );

  return {
    daily_calories_target: calories,
    protein_target_g: protein,
    carbs_target_g: carbs,
    fat_target_g: fat,
    fiber_guideline_g: fiber,
    sodium_guideline_mg: sodium,
    sugar_guideline_g: sugar,
    water_target_bottles: bottles,
  };
}

// One human-readable sentence explaining the recommendation, surfaced before
// the user confirms (never a blind switch).
export function recommendationReasoning(
  seasonType: SeasonType,
  targets: GeneratedTargets,
): string {
  const m = SEASON_MATH[seasonType];
  return `Based on your goals, we recommend a ${m.label.toLowerCase()} — ${m.blurb}. That works out to about ${targets.daily_calories_target.toLocaleString()} calories a day with ${targets.protein_target_g}g protein, ${targets.carbs_target_g}g carbs, and ${targets.fat_target_g}g fat.`;
}

// ---- Season read / write ----------------------------------------------------

export async function getActiveSeason(): Promise<NutritionSeason | null> {
  const rows = await db.nutrition_seasons
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .toArray();
  const active = rows.filter((s) => s.ended_at === null);
  // Newest active row wins if somehow more than one is open.
  active.sort((a, b) => b.started_at.localeCompare(a.started_at));
  return active[0] ?? null;
}

export async function getSeasonHistory(): Promise<NutritionSeason[]> {
  const rows = await db.nutrition_seasons
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .toArray();
  return rows.sort((a, b) => b.started_at.localeCompare(a.started_at));
}

// Days the active season has been running (inclusive), for the season strip.
export function daysInSeason(season: NutritionSeason, now = new Date()): number {
  const start = new Date(season.started_at).getTime();
  return Math.max(1, Math.floor((now.getTime() - start) / 86400000) + 1);
}

// Open a new season. Closes any currently-active season first (sets ended_at)
// so exactly one is live and the full history of past targets is preserved.
export async function startSeason(input: {
  season_type: SeasonType;
  goal_answers: GoalAnswers;
  targets: GeneratedTargets;
}): Promise<NutritionSeason> {
  const now = new Date().toISOString();

  const current = await getActiveSeason();
  if (current) {
    await syncedUpdate(db.nutrition_seasons, current.id, {
      ended_at: now,
      updated_at: now,
    });
  }

  const row: NutritionSeason = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    started_at: now,
    ended_at: null,
    season_type: input.season_type,
    goal_answers: JSON.stringify(input.goal_answers),
    ...input.targets,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.nutrition_seasons, row);
  return row;
}
