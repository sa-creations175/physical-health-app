import { db } from '../db/database';
import { syncedPut, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import {
  DEFAULT_WEEKLY_LIFTING_TARGETS,
  DEFAULT_CARDIO_WEEKLY_TARGET,
  DEFAULT_CARDIO_THRESHOLD_MINUTES,
  DEFAULT_DAILY_NUTRITION_TARGETS,
  DEFAULT_BUNDLE_CONFIG,
} from './defaults';
import type { UserPreferences } from '../db/types';

// Sane upper bounds for the Settings UI input clamps. Lower bound is 0
// across the board (a target of 0 means "not tracking that metric").
// cardio_threshold floors at 1 — a 0-minute "qualifying" session would
// blur the meaning of the metric.
export const TARGET_RANGES = {
  lifting: { min: 0, max: 7 }, // sessions per week
  cardio: { min: 0, max: 14 },
  cardio_threshold: { min: 1, max: 180 }, // minutes
  protein_grams: { min: 0, max: 400 },
  water_glasses: { min: 0, max: 20 },
  veg_servings: { min: 0, max: 12 },
  // Daily bundle (Build 2.4). Targets floor at 1 — a 0-rep daily target
  // would make the intensity math (progress vs target) divide-by-zero and
  // the metric meaningless. Increments floor at 1 so a ± tap always moves.
  bundle_target: { min: 1, max: 500 },
  bundle_increment: { min: 1, max: 100 },
} as const;

function buildDefaultPreferences(): UserPreferences {
  const now = new Date().toISOString();
  return {
    id: LOCAL_USER_ID,
    user_id: LOCAL_USER_ID,
    lifting_target_lower: DEFAULT_WEEKLY_LIFTING_TARGETS.lower,
    lifting_target_upper: DEFAULT_WEEKLY_LIFTING_TARGETS.upper,
    lifting_target_full_body: DEFAULT_WEEKLY_LIFTING_TARGETS.full_body,
    cardio_target_weekly: DEFAULT_CARDIO_WEEKLY_TARGET,
    cardio_threshold_minutes: DEFAULT_CARDIO_THRESHOLD_MINUTES,
    protein_grams_daily: DEFAULT_DAILY_NUTRITION_TARGETS.protein_grams,
    water_glasses_daily: DEFAULT_DAILY_NUTRITION_TARGETS.water_glasses,
    veg_servings_daily: DEFAULT_DAILY_NUTRITION_TARGETS.veg_servings,
    bundle_pushup_target: DEFAULT_BUNDLE_CONFIG.pushup_target,
    bundle_abroll_target: DEFAULT_BUNDLE_CONFIG.abroll_target,
    bundle_calfraise_target: DEFAULT_BUNDLE_CONFIG.calfraise_target,
    bundle_pushup_increment: DEFAULT_BUNDLE_CONFIG.pushup_increment,
    bundle_abroll_increment: DEFAULT_BUNDLE_CONFIG.abroll_increment,
    bundle_calfraise_increment: DEFAULT_BUNDLE_CONFIG.calfraise_increment,
    created_at: now,
    updated_at: now,
  };
}

// Lazy-create on first read so dashboard live queries always resolve to a
// row, even on a fresh install or on first launch after the v3 upgrade.
// syncedPut (upsert) is race-safe — concurrent first-readers all write the
// same defaults, so the second writer overwriting the first is a no-op.
export async function getUserPreferences(): Promise<UserPreferences> {
  const existing = await db.user_preferences.get(LOCAL_USER_ID);
  if (existing) return existing;
  const row = buildDefaultPreferences();
  await syncedPut(db.user_preferences, row);
  return row;
}

type EditablePreferenceFields = Omit<
  UserPreferences,
  'id' | 'user_id' | 'created_at' | 'updated_at'
>;

export async function updateUserPreferences(
  changes: Partial<EditablePreferenceFields>,
): Promise<void> {
  // Make sure the row exists before updating — otherwise update() is a no-op
  // on a missing key and the user's edit silently disappears.
  await getUserPreferences();
  await syncedUpdate(db.user_preferences, LOCAL_USER_ID, {
    ...changes,
    updated_at: new Date().toISOString(),
  });
}
