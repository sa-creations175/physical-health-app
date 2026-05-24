export type SessionType = 'upper' | 'lower' | 'full_body' | 'cardio' | 'mobility';
export type FeelRating = 'flying' | 'cruising' | 'crawling';
export type Intensity = 'low' | 'moderate' | 'high';
export type SetType = 'reps' | 'duration';
export type Pillar = 'strength' | 'cardio' | 'mobility' | 'nutrition' | 'health';
export type PromptPriority = 'high' | 'medium' | 'low';
export type CheckinType = 'doctor' | 'dental' | 'derm' | 'custom';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body';

export interface Session {
  id: string;
  user_id: string;
  type: SessionType;
  date: string; // ISO YYYY-MM-DD
  duration_minutes: number | null;
  notes: string;
  feel_rating: FeelRating | null;
  created_at: string; // ISO datetime
  updated_at: string;
}

export interface Exercise {
  id: string;
  user_id: string;
  name: string;
  muscle_group: MuscleGroup;
  is_compound: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
}

export interface SetEntry {
  id: string;
  session_exercise_id: string;
  set_number: number;
  weight: number;
  // For set_type='reps' — counts reps; ignored when set_type='duration'.
  reps: number;
  // For set_type='duration' — seconds elapsed; null when set_type='reps'.
  duration_seconds: number | null;
  set_type: SetType;
  completed: boolean;
  created_at: string;
}

// User-visible cardio activity types (Stairmaster, Run, Bike, …). Seeded on
// first launch and extended by the user via the cardio logger picker.
export interface CardioType {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  last_used_at: string | null; // bumped on every cardio_log save
}

export interface CardioLog {
  id: string;
  user_id: string;
  // Cardio doesn't always need a Session row — we can log a 12-min walk
  // without conjuring a parent session. Strength sessions still create one.
  session_id: string | null;
  cardio_type_id: string;
  duration_minutes: number;
  intensity: Intensity;
  // Precise timestamp for the *start* of the activity (local-time intent
  // serialized to ISO). The morning/afternoon/evening/late-night bucket is
  // computed at render time from this — never stored as a separate field.
  started_at: string;
  // Optional, only populated for distance-eligible types (Run / Bike /
  // Walk / Hike / Row). Stored in miles to one decimal. null means
  // "not measured" — informational only; qualifying-vs-short logic
  // still runs off duration_minutes alone.
  distance_miles: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  protein_grams: number;
  water_glasses: number;
  veg_servings: number;
  supplements_taken: string[]; // supplement ids
  updated_at: string;
}

export interface Supplement {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface HealthCheckin {
  id: string;
  user_id: string;
  type: CheckinType;
  custom_label: string | null;
  last_visit_date: string | null; // YYYY-MM-DD
  frequency_months: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  pillar: Pillar;
  title: string;
  aspiration_text: string;
  metric: string | null;
  target_value: number | null;
  target_date: string | null; // measurable horizons ≤ 1yr per Personal OS principle
  parent_goal_id: string | null;
  created_at: string;
}

// One row per user (id === user_id in Phase 1; multi-user comes in Phase 6).
// Lazy-created on first read with values seeded from src/lib/defaults.ts so
// the dashboard always has live targets to render.
export interface UserPreferences {
  id: string;
  user_id: string;
  lifting_target_lower: number;
  lifting_target_upper: number;
  lifting_target_full_body: number;
  cardio_target_weekly: number;
  cardio_threshold_minutes: number;
  protein_grams_daily: number;
  water_glasses_daily: number;
  veg_servings_daily: number;
  // Daily bundle (calisthenics) — added v2.0 (Dexie v9). Per-exercise daily
  // rep targets and the superset-sized increment each ± tap on the bundle
  // card applies. Defaults mirror the user's typical 100 / 60 / 120 day and
  // 25 / 15 / 30 supersets.
  bundle_pushup_target: number;
  bundle_abroll_target: number;
  bundle_calfraise_target: number;
  bundle_pushup_increment: number;
  bundle_abroll_increment: number;
  bundle_calfraise_increment: number;
  // Dashboard customization — added v2.2 (Dexie v10). Stored as JSON strings
  // because Dexie columns are scalar; parsed/serialized by useDashboardConfig.
  // order: string[] of section keys; config: Record<key, {label, visible}>.
  dashboard_section_order: string;
  dashboard_section_config: string;
  created_at: string;
  updated_at: string;
}

// One row per day per user — only present for days the user has actively
// marked. Absence of a row = unmarked (neither clean nor ordered);
// presence with status 'clean' = a no-delivery day; 'ordered' = the
// user broke the streak. The streak math walks backward from today
// over the rows; "ordered" or "no row at this date" both break the
// streak. Eating out socially does NOT count — only delivery orders.
export interface DeliveryDay {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD (local)
  status: 'clean' | 'ordered';
  created_at: string;
  updated_at: string;
}

// One row per user per day — created the first time any exercise is logged
// for that date, then updated in place. The three exercises are tracked
// independently (not as a bundle requirement): any reps of anything makes
// the day "qualifying." A week with ≥ 4 qualifying days counts toward the
// streak. Absence of a row = nothing logged that day.
export interface BundleLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD (local)
  pushups: number;
  ab_rolls: number;
  calf_raises: number;
  created_at: string;
  updated_at: string;
}

export interface PromptRecord {
  id: string;
  user_id: string;
  type: string;
  priority: PromptPriority;
  fired_at: string; // ISO datetime
  dismissed_at: string | null;
  re_prompt_after_days: number;
}
