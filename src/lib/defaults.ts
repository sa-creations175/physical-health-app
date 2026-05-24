// Hardcoded defaults for Phase 1. Replaced by user_preferences table + Settings UI in step 7.

export const DEFAULT_WEEKLY_LIFTING_TARGETS = {
  lower: 2,      // LOWER BODY
  upper: 2,      // UPPER BODY
  full_body: 0,  // FULL BODY (optional — target 0 by default)
} as const;

export const DEFAULT_CARDIO_WEEKLY_TARGET = 5; // mid of the 4–6 range from seeded goals

// Below this, a cardio_log surfaces as "SHORT" on the dashboard and doesn't
// count toward the weekly qualifying total. Editable in Settings (Build 2.1).
export const DEFAULT_CARDIO_THRESHOLD_MINUTES = 20;

export const DEFAULT_DAILY_NUTRITION_TARGETS = {
  protein_grams: 180,
  water_glasses: 8,
  veg_servings: 3,
} as const;

// Daily bundle (calisthenics) defaults — Build 2.4. Targets are the user's
// typical full day (100 push-ups / 60 ab rolls / 120 calf raises); increments
// are the superset size each ± tap on the bundle card applies (25 / 15 / 30).
// All editable in Settings.
export const DEFAULT_BUNDLE_CONFIG = {
  pushup_target: 100,
  abroll_target: 60,
  calfraise_target: 120,
  pushup_increment: 25,
  abroll_increment: 15,
  calfraise_increment: 30,
} as const;

// Seeded on first launch in Build 2.1. Order matches the picker's
// alphabetical view; "most-used chips" override this once history exists.
export const STARTER_CARDIO_TYPES = [
  'Stairmaster',
  'Run',
  'Bike',
  'Walk',
  'Row',
  'Elliptical',
  'Swim',
  'Hike',
  'Jump rope',
  'Dance',
] as const;
