import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import { getActiveCaloriesDailyAverage } from './healthkit';
import type {
  BiologicalSex,
  MacroStyle,
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
  | 'lower_size'
  | 'conditioning'
  | 'balanced';

export interface GoalAnswers {
  look: LookAnswer;
  timeline: TimelineAnswer;
  // Multi-select — the user can have several focus areas at once. Directional
  // only: recommendSeason() keys off look + timeline, so the array is stored
  // for context but doesn't change the macro math.
  focus: FocusAnswer[];
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
  { value: 'lower_size', label: 'Lower body size' },
  { value: 'conditioning', label: 'Athletic conditioning' },
  { value: 'balanced', label: 'Balanced' },
];

// ---- Season math ------------------------------------------------------------
// Each season's numbers, from the spec's season table. calorie_adjustment is
// the daily delta off TDEE; protein_per_lb_lean is the hard protein anchor. The
// fat/carb split is set by the macro style (MACRO_STYLE_FAT_PCT), not here.
interface SeasonMath {
  label: string;
  calorie_adjustment: number;
  protein_per_lb_lean: number;
  // Plain-language fragment used in the recommendation reasoning.
  blurb: string;
}

export const SEASON_MATH: Record<SeasonType, SeasonMath> = {
  cut_aggressive: {
    label: 'Aggressive cut',
    calorie_adjustment: -500,
    protein_per_lb_lean: 1.05,
    blurb:
      '~500 calorie daily deficit with protein kept very high to protect muscle and carbs pulled back',
  },
  cut_moderate: {
    label: 'Moderate cut',
    calorie_adjustment: -350,
    protein_per_lb_lean: 1.0,
    blurb:
      '~350 calorie daily deficit, protein stays high to protect your muscle, carbs moderate',
  },
  maintain: {
    label: 'Maintain',
    calorie_adjustment: 0,
    protein_per_lb_lean: 0.9,
    blurb:
      'eating right at maintenance with higher carbs to fuel training and recomp slowly',
  },
  build_lean: {
    label: 'Lean bulk',
    calorie_adjustment: 250,
    protein_per_lb_lean: 1.0,
    blurb:
      '~250 calorie daily surplus with higher carbs to build muscle while staying lean',
  },
  build_moderate: {
    label: 'Moderate bulk',
    calorie_adjustment: 400,
    protein_per_lb_lean: 0.9,
    blurb:
      '~400 calorie daily surplus with higher carbs for steady muscle gain, expecting some fat alongside',
  },
  build_aggressive: {
    label: 'Aggressive bulk',
    calorie_adjustment: 600,
    protein_per_lb_lean: 0.9,
    blurb:
      '~600 calorie daily surplus with high carbs to drive maximum muscle gain',
  },
};

export function seasonLabel(type: SeasonType): string {
  return SEASON_MATH[type].label;
}

// Map the goal answers to a recommended season. Look + timeline drive the
// cut/maintain/build axis and its intensity. For 'both' (lean + muscular) the
// current BF% decides instead of timeline: above ~15% you lean out first, at or
// below ~15% a lean bulk is the better entry point. focus stays directional.
export function recommendSeason(
  answers: GoalAnswers,
  bf: number | null = null,
): SeasonType {
  const { look, timeline } = answers;
  if (look === 'maintain') return 'maintain';
  if (look === 'leaner') {
    return timeline === 'fast' ? 'cut_aggressive' : 'cut_moderate';
  }
  if (look === 'bigger') {
    return timeline === 'fast' ? 'build_aggressive' : 'build_lean';
  }
  // 'both' — BF%-driven: cut first if over ~15%, otherwise lean bulk.
  if (bf !== null && bf > 0) {
    return bf > 15 ? 'cut_moderate' : 'build_lean';
  }
  // No BF% on record — fall back to the timeline-based read.
  if (timeline === 'slow') return 'maintain';
  if (timeline === 'moderate') return 'build_lean';
  return 'cut_moderate';
}

// The six season options for the picker, in display order. Each card shows the
// name, a one-line calorie consequence, and a one-sentence description; the math
// itself lives in SEASON_MATH and TargetComparison renders the real targets.
export interface SeasonPickerOption {
  seasonType: SeasonType;
  name: string;
  calorieLine: string;
  description: string;
}

export const SEASON_PICKER_OPTIONS: SeasonPickerOption[] = [
  {
    seasonType: 'cut_aggressive',
    name: 'Aggressive Cut',
    calorieLine: '~500 cal deficit · ~1 lb/week fat loss',
    description:
      'Fastest path to lean. Higher muscle loss risk — protein stays high to protect your gains.',
  },
  {
    seasonType: 'cut_moderate',
    name: 'Moderate Cut',
    calorieLine: '~350 cal deficit · ~0.5–0.75 lb/week fat loss',
    description:
      'The sweet spot for fat loss. Slow enough to preserve muscle, fast enough to see progress.',
  },
  {
    seasonType: 'maintain',
    name: 'Maintain',
    calorieLine: 'At your TDEE · hold current composition',
    description:
      "Eat to perform. Hold what you've built while training hard.",
  },
  {
    seasonType: 'build_lean',
    name: 'Lean Bulk',
    calorieLine: '+250 cal above TDEE · slow, clean muscle gain',
    description:
      'The patient play. Minimal fat gain, maximum muscle efficiency.',
  },
  {
    seasonType: 'build_moderate',
    name: 'Moderate Bulk',
    calorieLine: '+400 cal above TDEE · steady muscle gain',
    description:
      "Balanced build. Expect some fat alongside the muscle — that's normal.",
  },
  {
    seasonType: 'build_aggressive',
    name: 'Aggressive Bulk',
    calorieLine: '+600 cal above TDEE · fastest muscle gain',
    description:
      'Eat to grow. Significant fat gain expected — plan a cut after.',
  },
];

// ---- TDEE -------------------------------------------------------------------
// Mifflin-St Jeor BMR (metric inputs converted from lbs / inches) — the most
// validated resting-burn equation for most adults. Male/female differ only in
// the constant (+5 vs −161). Kept in sync with the in-app TDEE explainer.
export function computeBMR(
  sex: BiologicalSex,
  weightLbs: number,
  heightInches: number,
  age: number,
): number {
  const kg = weightLbs / 2.2046;
  const cm = heightInches * 2.54;
  const base = 10 * kg + 6.25 * cm - 5 * age;
  const bmr = sex === 'male' ? base + 5 : base - 161;
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

// ---- Macro style ------------------------------------------------------------
// Protein stays fixed at its season value; the style sets the fat share of
// total calories, and carbs take whatever calories remain.
export const MACRO_STYLE_FAT_PCT: Record<MacroStyle, number> = {
  balanced: 0.28,
  lower_carb: 0.38,
  higher_carb: 0.2,
  high_protein_cut: 0.28, // same fat share as balanced; the protein is what moves
};

// Protein anchor in g/lb lean for 'high_protein_cut' — overrides the season's
// default protein (cut-only style; the rest use the season value).
const HIGH_PROTEIN_CUT_PER_LB = 1.2;

// The cut seasons — gate for the cut-only 'high_protein_cut' macro style.
export function isCutSeason(seasonType: SeasonType): boolean {
  return seasonType === 'cut_moderate' || seasonType === 'cut_aggressive';
}

export interface MacroStyleOption {
  value: MacroStyle;
  name: string;
  description: string;
}

export const MACRO_STYLE_OPTIONS: MacroStyleOption[] = [
  {
    value: 'balanced',
    name: 'Balanced',
    description:
      'Standard split — moderate carbs and fat. Best for most people and general performance.',
  },
  {
    value: 'lower_carb',
    name: 'Lower Carb',
    description:
      'Fewer carbs, more fat. May accelerate fat loss and reduce insulin spikes — works well for carb-sensitive people and during cuts.',
  },
  {
    value: 'higher_carb',
    name: 'Higher Carb',
    description:
      'More carbs, less fat. Better for high training volume and performance. Common in lean bulk phases.',
  },
  {
    value: 'high_protein_cut',
    name: 'High Protein Cut',
    description:
      'More protein to protect muscle during a cut. Research supports up to 1.2g per lb of lean mass when in a calorie deficit — reduces muscle loss risk at the cost of slightly fewer carbs.',
  },
];

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

// Just the calorie target for a season at a given TDEE — used by the picker
// cards. Calories depend only on the season's adjustment, not the macro style.
export function seasonCalories(seasonType: SeasonType, tdee: number): number {
  return Math.max(
    1200,
    Math.round(tdee + SEASON_MATH[seasonType].calorie_adjustment),
  );
}

// Build every target from the season, the lean mass (protein anchor + water),
// the personalized TDEE, and the macro style. Protein is fixed first, fat takes
// its style-determined share of calories, carbs are whatever calories remain.
export function generateTargets(
  seasonType: SeasonType,
  leanMassLbs: number,
  tdee: number,
  macroStyle: MacroStyle = 'balanced',
): GeneratedTargets {
  const m = SEASON_MATH[seasonType];
  const calories = seasonCalories(seasonType, tdee);

  // High-protein cut raises the protein anchor; every other style uses the
  // season's default.
  const proteinPerLb =
    macroStyle === 'high_protein_cut'
      ? HIGH_PROTEIN_CUT_PER_LB
      : m.protein_per_lb_lean;
  const protein = Math.round(proteinPerLb * leanMassLbs);
  const proteinCal = protein * 4;
  const fatCal = calories * MACRO_STYLE_FAT_PCT[macroStyle];
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

// ---- Recommendation explanation copy ----------------------------------------
// "State the facts, pros and cons, what the research says" — inform fully,
// never override the user's choice. Plain explanation of what each season's
// math means, surfaced under the YOUR BASELINE / TDEE line.
export const SEASON_EXPLANATION: Record<SeasonType, string> = {
  cut_moderate:
    "We're targeting a ~350 calorie daily deficit below your TDEE. At this pace, expect roughly 0.5–0.75 lbs of fat loss per week — slow enough to preserve muscle.",
  cut_aggressive:
    "We're targeting a ~500 calorie daily deficit. Faster fat loss (~1 lb/week) but higher risk of muscle loss — protein stays high to protect your gains.",
  maintain:
    'Eating at your TDEE — no surplus, no deficit. Goal is to hold your current composition while training hard.',
  build_lean:
    "We're adding ~250 calories above your TDEE. Slow, controlled muscle building with minimal fat gain.",
  build_moderate:
    "We're adding ~400 calories above your TDEE. Steady muscle gain — expect some fat alongside it.",
  build_aggressive:
    "We're adding ~600 calories above your TDEE. Fastest muscle gain, but significant fat gain is expected — plan a cut after.",
};

// Trade-offs of the chosen season — always shown below the targets. Framed as
// trade-offs, not warnings (the user's pick is never overridden).
export const SEASON_PROS_CONS: Record<
  SeasonType,
  { pros: string[]; cons: string[] }
> = {
  cut_moderate: {
    pros: [
      'Steady fat loss without crashing energy',
      'High protein preserves muscle through the cut',
      'Sustainable pace — easy to stick with',
    ],
    cons: [
      'Slower than an aggressive cut',
      'Requires consistent tracking',
      'Strength may dip slightly in a deficit',
    ],
  },
  cut_aggressive: {
    pros: [
      'Fastest fat loss',
      'Less total time spent dieting',
      'Visible results sooner',
    ],
    cons: [
      'Higher risk of muscle loss',
      'Lower energy, harder training sessions',
      'Hunger makes adherence tougher',
    ],
  },
  maintain: {
    pros: [
      'Holds your hard-won composition',
      'Full energy for training and recovery',
      'No dieting stress or restriction',
    ],
    cons: [
      'No active fat loss or muscle gain',
      'Easy to drift without a clear target',
      'Recomposition is slow at best',
    ],
  },
  build_lean: {
    pros: [
      'Builds muscle with minimal fat gain',
      'Strong training fuel without the bloat',
      'Stays lean enough to skip a long cut later',
    ],
    cons: [
      'Slower scale and size progress',
      'Requires eating above maintenance consistently',
      'Patience needed before size shows',
    ],
  },
  build_moderate: {
    pros: [
      'Steady, reliable muscle gain',
      'Strong fuel for progressive overload',
      'Faster size progress than a lean bulk',
    ],
    cons: [
      'Some fat gain alongside the muscle',
      'A cut is likely needed down the line',
      'Less precise than a lean bulk',
    ],
  },
  build_aggressive: {
    pros: [
      'Fastest muscle and strength gain',
      'Maximum fuel for heavy training',
      'Big lifts feel easier with the surplus',
    ],
    cons: [
      'Noticeable fat gain alongside the muscle',
      'A cut will likely be needed afterward',
      'Can add more fat than muscle you can actually build',
    ],
  },
};

// ---- Body-composition research guidance -------------------------------------
// Conditional on the user's current BF% estimate. Returns null when no estimate
// exists yet (the component then shows a gentle "complete your estimate" nudge
// without blocking the rest of the screen).
export interface BodyFatGuidance {
  heading: string;
  paragraphs: string[];
  prosLabel: string;
  pros: string[];
  consLabel: string;
  cons: string[];
}

export function bodyFatGuidance(bf: number | null): BodyFatGuidance | null {
  if (bf === null || bf <= 0) return null;

  if (bf > 16) {
    return {
      heading: 'A note on your body composition',
      paragraphs: [
        'Research from sports scientists like Dr. Mike Israetel and Eric Helms suggests that above ~16% body fat, your body is less efficient at building muscle. Excess body fat impairs insulin sensitivity and hormone optimization — both of which affect how well your body partitions calories toward muscle vs fat storage.',
        'Most evidence-based coaches recommend cutting to 12–14% body fat first, then transitioning to a lean bulk. You build more muscle per calorie in a leaner state.',
      ],
      prosLabel: 'Pros of cutting first',
      pros: [
        'Better muscle-building efficiency afterward',
        'Improved insulin sensitivity',
        'Hormones optimize',
        "You'll look and feel better at a lower BF% baseline",
      ],
      consLabel: 'Cons of cutting first',
      cons: [
        'Slower path to "bigger"',
        'Requires discipline',
        'May feel like going backward if size is the goal',
      ],
    };
  }

  if (bf >= 12) {
    return {
      heading: "You're in the sweet spot",
      paragraphs: [
        "At your current body fat percentage, you're in the range where recomposition — losing fat and building muscle simultaneously — is genuinely achievable, especially with your training history. It's slower than a dedicated cut or bulk, but sustainable and effective.",
        'If your goal is both leaner and more muscular, a lean build at a small surplus is well-supported by research at this body fat range.',
      ],
      prosLabel: 'Pros of recomp',
      pros: [
        'Simultaneous progress on both goals',
        'No dramatic diet phases',
        'Sustainable long-term',
      ],
      consLabel: 'Cons of recomp',
      cons: [
        'Slower than a dedicated cut or bulk',
        'Requires patience',
        'Harder to measure progress week-to-week',
      ],
    };
  }

  return {
    heading: "You're already lean",
    paragraphs: [
      'Below 12% body fat, your body is primed for muscle building. Research consistently shows better muscle protein synthesis, improved testosterone levels, and superior calorie partitioning at lower body fat percentages.',
      'A lean bulk is the evidence-based recommendation here — a small surplus maximizes muscle gain while keeping fat gain minimal.',
    ],
    prosLabel: 'Pros of lean bulk',
    pros: [
      'Best muscle-building environment',
      'Hormones optimized',
      'Efficient calorie partitioning',
    ],
    consLabel: 'Cons of lean bulk',
    cons: [
      'Requires consistent eating above maintenance',
      'Some fat gain is normal and expected',
    ],
  };
}

// ---- 'Both' contextual tip --------------------------------------------------
// Inline, informational tip shown on the goal page the moment the user picks
// 'Both' (lean + muscular), keyed to their current BF% in three zones:
//   > 15  → cut first; recomp/bulk now is inefficient at this body fat
//   12–15 → recomp viable but slower; the lean-bulk entry point is near
//   < 12  → null (lean bulk is already the right call — no tip needed)
// Returns null below ~12% and whenever there's no BF% to reason about; the
// caller also gates on the 'Both' selection so it disappears on any other pick.
export function bothLookTip(bf: number | null): string | null {
  if (bf === null || bf <= 0) return null;
  if (bf > 15) {
    return "💡 At your current body fat, cutting first will get you better results. Most coaches recommend reaching ~12% BF before starting a lean bulk — you'll build more muscle per calorie, stay leaner during the bulk, and have more runway before needing to cut again. Consider 'Leaner' now and switch seasons when you get there.";
  }
  if (bf >= 12) {
    return "💡 You're close to the ideal lean bulk entry point (~12% BF). A recomp approach works here but is slower. If you want to maximize muscle-building efficiency, a short cut to get to 12% first is worth considering before switching to a lean build season.";
  }
  return null;
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
  macro_style: MacroStyle;
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
    macro_style: input.macro_style,
    goal_answers: JSON.stringify(input.goal_answers),
    ...input.targets,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.nutrition_seasons, row);
  return row;
}
