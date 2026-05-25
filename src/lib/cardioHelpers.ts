import { db } from '../db/database';
import {
  syncedAdd,
  syncedUpdate,
} from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type { CardioLog, CardioType, Intensity } from '../db/types';

export interface CreateCardioLogInput {
  cardio_type_id: string;
  duration_minutes: number;
  intensity: Intensity;
  started_at: string; // ISO datetime — precise local intent serialized
  distance_miles: number | null;
  notes: string | null;
}

// Distance is opt-in per type because measuring distance only makes
// sense for certain activities (a 30-min Stairmaster session has no
// meaningful "distance"). Match is case-insensitive against the
// canonical name; user-added types fall outside the eligible set
// unless they happen to share a name with one of these five.
export const DISTANCE_ELIGIBLE_TYPES = [
  'Run',
  'Bike',
  'Walk',
  'Hike',
  'Row',
] as const;
const DISTANCE_ELIGIBLE_SET = new Set(
  DISTANCE_ELIGIBLE_TYPES.map((n) => n.toLowerCase()),
);
export function isDistanceEligible(typeName: string | null | undefined): boolean {
  if (!typeName) return false;
  return DISTANCE_ELIGIBLE_SET.has(typeName.trim().toLowerCase());
}

export async function createCardioLog(
  input: CreateCardioLogInput,
): Promise<string> {
  const now = new Date().toISOString();
  const row: CardioLog = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    session_id: null, // cardio doesn't conjure a parent Session
    cardio_type_id: input.cardio_type_id,
    duration_minutes: input.duration_minutes,
    intensity: input.intensity,
    started_at: input.started_at,
    distance_miles: input.distance_miles,
    notes: input.notes,
    created_at: now,
    updated_at: now,
  };
  await syncedAdd(db.cardio_logs, row);
  // Bump the type's last_used_at so the most-used chip ranking and the
  // alphabetical picker's "recent" affordance stay in sync.
  await syncedUpdate(db.cardio_types, input.cardio_type_id, {
    last_used_at: now,
  });
  return row.id;
}

// Move a logged cardio session to a different date, preserving its time of
// day. Used by the editable date field on the History expanded row.
export async function updateCardioLogDate(
  id: string,
  newDate: string, // YYYY-MM-DD
): Promise<void> {
  const log = await db.cardio_logs.get(id);
  if (!log) return;
  const old = new Date(log.started_at);
  const [y, m, d] = newDate.split('-').map(Number);
  const next = new Date(
    y,
    m - 1,
    d,
    old.getHours(),
    old.getMinutes(),
    old.getSeconds(),
    old.getMilliseconds(),
  );
  await syncedUpdate(db.cardio_logs, id, {
    started_at: next.toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function createCardioType(name: string): Promise<string> {
  const trimmed = name.trim();
  const now = new Date().toISOString();
  const row: CardioType = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    name: trimmed,
    created_at: now,
    last_used_at: null,
  };
  await syncedAdd(db.cardio_types, row);
  return row.id;
}

// Curated fallback for the chip row when the user has no logging history
// (or fewer than `limit` distinct types used). Order is deliberate —
// these five are the activities the user is most likely to reach for in
// the early days, so they land in the chip row immediately instead of an
// alphabetical list ("Bike, Dance, Elliptical, …") that would push Run
// off the front. Used types always take priority; the fallback only fills
// remaining slots and skips any name already present in the used list.
const CHIP_FALLBACK_ORDER = ['Stairmaster', 'Run', 'Bike', 'Walk', 'Row'] as const;

export async function getMostUsedCardioTypes(limit = 5): Promise<CardioType[]> {
  const all = await db.cardio_types.toArray();
  if (all.length === 0) return [];

  const used = all.filter((t) => t.last_used_at !== null);
  used.sort((a, b) => (b.last_used_at ?? '').localeCompare(a.last_used_at ?? ''));
  const result: CardioType[] = used.slice(0, limit);

  if (result.length < limit) {
    const seenIds = new Set(result.map((t) => t.id));
    const byName = new Map(all.map((t) => [t.name, t]));
    for (const name of CHIP_FALLBACK_ORDER) {
      if (result.length >= limit) break;
      const t = byName.get(name);
      if (t && !seenIds.has(t.id)) {
        result.push(t);
        seenIds.add(t.id);
      }
    }
  }

  return result;
}

export interface LastLogContext {
  duration_minutes: number;
  intensity: Intensity;
  daysAgo: number;
}

// "Last logged: {Type} · {duration} min · {Intensity}, {N} days ago."
// Returns null when no prior log of this type exists.
export async function getLastLogOfType(
  cardio_type_id: string,
  ref: Date = new Date(),
): Promise<LastLogContext | null> {
  const all = await db.cardio_logs
    .where('user_id').equals(LOCAL_USER_ID)
    .toArray();
  const matches = all.filter((l) => l.cardio_type_id === cardio_type_id);
  if (matches.length === 0) return null;

  matches.sort((a, b) => b.started_at.localeCompare(a.started_at));
  const last = matches[0];

  const startedAtDate = new Date(last.started_at);
  const refMid = new Date(ref);
  refMid.setHours(0, 0, 0, 0);
  const sMid = new Date(startedAtDate);
  sMid.setHours(0, 0, 0, 0);
  const daysAgo = Math.max(0, Math.round((refMid.getTime() - sMid.getTime()) / 86400000));

  return {
    duration_minutes: last.duration_minutes,
    intensity: last.intensity,
    daysAgo,
  };
}

// Local-time YYYY-MM-DD for an ISO datetime — used to compare a log's
// date with "today" for the retro-guard threshold.
export function localDateOf(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString('en-CA');
}

// True when `iso` is more than `thresholdDays` days *before* today.
// Same-day or future selections never trip the guard.
export function isRetroactive(
  isoDateTime: string,
  thresholdDays = 7,
  ref: Date = new Date(),
): { isRetro: boolean; daysAgo: number } {
  const startMid = new Date(isoDateTime);
  startMid.setHours(0, 0, 0, 0);
  const refMid = new Date(ref);
  refMid.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((refMid.getTime() - startMid.getTime()) / 86400000);
  return { isRetro: daysAgo > thresholdDays, daysAgo };
}
