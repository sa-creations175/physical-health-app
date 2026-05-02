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
  notes: string | null;
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

// Most-used = most-recently-used, deduped, capped. Falls back to first
// `limit` alphabetical seeded types when no history exists yet (so the
// chip row doesn't render empty on a fresh install).
export async function getMostUsedCardioTypes(limit = 5): Promise<CardioType[]> {
  const all = await db.cardio_types.toArray();
  if (all.length === 0) return [];

  const used = all.filter((t) => t.last_used_at !== null);
  if (used.length > 0) {
    used.sort((a, b) => (b.last_used_at ?? '').localeCompare(a.last_used_at ?? ''));
    return used.slice(0, limit);
  }

  const sorted = [...all].sort((a, b) => a.name.localeCompare(b.name));
  return sorted.slice(0, limit);
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
