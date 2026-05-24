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
  // Mobility / flexibility — Build 2.6. Target 4 qualifying days/week; a
  // session counts once it reaches 5 minutes.
  mobility_target: 4,
  mobility_min_minutes: 5,
} as const;

// Default for bundle_mobility_youtube_links — empty JSON array. The links are
// { id, label, url } objects appended by the user from the bundle card.
export const DEFAULT_MOBILITY_LINKS_JSON = '[]';

// Dashboard customization (Build 2.5, Dexie v10). The canonical set of
// dashboard section keys, in their default display order. Doubles as the
// default value for `dashboard_section_order`. Stored on user_preferences as
// a JSON string (Dexie columns are scalar) and parsed via useDashboardConfig.
export const DASHBOARD_SECTION_KEYS = [
  'lifting',
  'cardio',
  'nutrition',
  'delivery_streak',
  'daily_bundle',
  'apple_watch',
] as const;

export type DashboardSectionKey = (typeof DASHBOARD_SECTION_KEYS)[number];

export interface DashboardSectionMeta {
  label: string;
  visible: boolean;
}

// Default per-section label + visibility for `dashboard_section_config`.
// Labels are Title Case here; the on-card SectionLabel uppercases them, so the
// reorder card (Bricolage Grotesque, not uppercased) is where the casing shows.
export const DEFAULT_DASHBOARD_SECTION_CONFIG: Record<
  DashboardSectionKey,
  DashboardSectionMeta
> = {
  lifting: { label: 'This Week — Lifting', visible: true },
  cardio: { label: 'This Week — Cardio', visible: true },
  nutrition: { label: 'Today — Nutrition', visible: true },
  delivery_streak: { label: 'No-Delivery Streak', visible: true },
  daily_bundle: { label: 'Daily Bundle', visible: true },
  apple_watch: { label: 'Apple Watch', visible: true },
};

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
