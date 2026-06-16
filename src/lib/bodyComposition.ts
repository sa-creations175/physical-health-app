import { db } from '../db/database';
import { syncedAdd } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type {
  BodyStats,
  BodyMeasurement,
  BiologicalSex,
  MeasurementSource,
} from '../db/types';

// Body composition — Phase 3a. The numbers macro targets are built from: a
// current weight, a current body-fat %, and the lean mass derived from the two.
// All reads take the newest row by recorded_at as "current"; writes are
// append-only (a weigh-in is a new row, never an edit) so history is preserved.

// ---- Navy Method ------------------------------------------------------------
// US Navy circumference formula (inches, base-10 logs). Men key off
// waist − neck; women add hip. Returns a bf% clamped to a sane 2–60 range so a
// fat-fingered tape entry can't produce a wild number downstream.
export function navyBodyFat(
  sex: BiologicalSex,
  heightInches: number,
  neckInches: number,
  waistInches: number,
  hipsInches: number | null,
): number | null {
  if (heightInches <= 0 || neckInches <= 0 || waistInches <= 0) return null;
  let bf: number;
  if (sex === 'male') {
    if (waistInches - neckInches <= 0) return null; // log of ≤0 is undefined
    bf =
      86.01 * Math.log10(waistInches - neckInches) -
      70.041 * Math.log10(heightInches) +
      36.76;
  } else {
    if (hipsInches === null || hipsInches <= 0) return null;
    if (waistInches + hipsInches - neckInches <= 0) return null;
    bf =
      163.205 * Math.log10(waistInches + hipsInches - neckInches) -
      97.684 * Math.log10(heightInches) -
      78.387;
  }
  if (!Number.isFinite(bf)) return null;
  return Math.round(Math.min(60, Math.max(2, bf)) * 10) / 10;
}

// lean mass = weight × (1 − bf%). The number all macro math is built on.
export function leanMassLbs(weightLbs: number, bfPercentage: number): number {
  return Math.round(weightLbs * (1 - bfPercentage / 100) * 10) / 10;
}

// ---- Reads ------------------------------------------------------------------

export async function getLatestBodyStats(): Promise<BodyStats | null> {
  const rows = await db.body_stats
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .reverse()
    .sortBy('recorded_at');
  return rows[0] ?? null;
}

export async function getLatestMeasurement(): Promise<BodyMeasurement | null> {
  const rows = await db.body_measurements
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .reverse()
    .sortBy('recorded_at');
  return rows[0] ?? null;
}

// Current lean mass from the latest weight + latest bf%. Derived live so it
// reflects whichever of the two was most recently updated. null until both a
// weigh-in and a bf% reading exist.
export async function getCurrentLeanMass(): Promise<number | null> {
  const [stats, measurement] = await Promise.all([
    getLatestBodyStats(),
    getLatestMeasurement(),
  ]);
  if (!stats || !measurement) return null;
  return leanMassLbs(stats.weight_lbs, measurement.bf_percentage);
}

// ---- Writes (append-only) ---------------------------------------------------

// A weigh-in carries the full stable set (height/age/sex) so each row is
// self-contained — the modal pre-fills these from the latest row, the user
// usually only changes weight, but every row stays complete.
export async function logBodyStats(input: {
  weight_lbs: number;
  height_inches: number;
  age: number;
  biological_sex: BiologicalSex;
  recorded_at?: string;
}): Promise<string> {
  const row: BodyStats = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    recorded_at: input.recorded_at ?? new Date().toISOString(),
    weight_lbs: input.weight_lbs,
    height_inches: input.height_inches,
    age: input.age,
    biological_sex: input.biological_sex,
  };
  return syncedAdd(db.body_stats, row);
}

export async function logBodyMeasurement(input: {
  bf_percentage: number;
  source: MeasurementSource;
  neck_inches?: number | null;
  waist_inches?: number | null;
  hips_inches?: number | null;
  notes?: string | null;
  recorded_at?: string;
}): Promise<string> {
  const row: BodyMeasurement = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    recorded_at: input.recorded_at ?? new Date().toISOString(),
    neck_inches: input.neck_inches ?? null,
    waist_inches: input.waist_inches ?? null,
    hips_inches: input.hips_inches ?? null,
    bf_percentage: input.bf_percentage,
    source: input.source,
    notes: input.notes ?? null,
  };
  return syncedAdd(db.body_measurements, row);
}
