import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type { NutritionLog } from '../db/types';

// Water logging in 1000ml bottles (Phase 3a). One nutrition_logs row per day
// holds the count in water_bottles_logged; the legacy protein/water-glasses/veg
// columns stay at their defaults until the Phase 3b meal-logging reshape.

export async function getNutritionLogForDate(
  date: string,
): Promise<NutritionLog | undefined> {
  return db.nutrition_logs
    .where('date')
    .equals(date)
    .filter((r) => r.user_id === LOCAL_USER_ID)
    .first();
}

export function bottlesFromLog(log: NutritionLog | undefined): number {
  return log?.water_bottles_logged ?? 0;
}

// Set the day's bottle count (clamped ≥ 0). Creates the day's row on first tap,
// updates in place thereafter — mirrors the bundle-log upsert pattern.
export async function setWaterBottles(
  date: string,
  bottles: number,
): Promise<void> {
  const next = Math.max(0, Math.round(bottles));
  const now = new Date().toISOString();
  const existing = await getNutritionLogForDate(date);

  if (existing) {
    await syncedUpdate(db.nutrition_logs, existing.id, {
      water_bottles_logged: next,
      updated_at: now,
    });
    return;
  }

  const row: NutritionLog = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    date,
    protein_grams: 0,
    water_glasses: 0,
    veg_servings: 0,
    supplements_taken: [],
    water_bottles_logged: next,
    updated_at: now,
  };
  await syncedAdd(db.nutrition_logs, row);
}
