// Hardcoded defaults for Phase 1. Replaced by user_preferences table + Settings UI in step 7.

export const DEFAULT_WEEKLY_LIFTING_TARGETS = {
  lower: 2,      // LOWER BODY
  upper: 2,      // UPPER BODY
  full_body: 0,  // FULL BODY (optional — target 0 by default)
} as const;

export const DEFAULT_CARDIO_WEEKLY_TARGET = 5; // mid of the 4–6 range from seeded goals

export const DEFAULT_DAILY_NUTRITION_TARGETS = {
  protein_grams: 180,
  water_glasses: 8,
  veg_servings: 3,
} as const;
