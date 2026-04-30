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

export interface CardioLog {
  id: string;
  user_id: string;
  session_id: string;
  type: string;
  duration_minutes: number;
  intensity: Intensity;
  notes: string;
  created_at: string;
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

export interface PromptRecord {
  id: string;
  user_id: string;
  type: string;
  priority: PromptPriority;
  fired_at: string; // ISO datetime
  dismissed_at: string | null;
  re_prompt_after_days: number;
}
