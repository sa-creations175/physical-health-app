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
