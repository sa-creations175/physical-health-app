import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type { PromptPriority, PromptRecord } from '../db/types';

// Phase-1 scaffold for proactive prompts. The prompts table already exists
// (Dexie v1) — this module is the thin coordinator that future triggers
// (Phases 4/5: mobility staleness, progressive overload, etc.) will call to
// surface a prompt. It enforces the design doc's three rules:
//
//   1. Daily soft cap — no more than 2 prompts surface in a single day
//   2. Active-session suppression — no prompts during an in-progress logging
//      flow (an unfinished `sessions` row is the signal)
//   3. Per-type re-prompt window — a dismissed prompt of a given type stays
//      suppressed until its `re_prompt_after_days` window has elapsed
//
// Phase 1 ships ZERO registered triggers — nothing calls firePrompt yet.
// The module is here so the wiring is ready when triggers come online.

export const DAILY_PROMPT_CAP = 2;

interface PromptTypeDefinition {
  priority: PromptPriority;
  // Days a dismissal silences this type before it can re-surface.
  re_prompt_after_days: number;
}

// Defaults per type — match the design doc's Proactive Prompts table.
// Triggers can override the re-prompt window when calling firePrompt if a
// specific instance warrants a different cooldown (e.g., week_review fires
// once on Sunday evening and shouldn't re-surface mid-week).
export const PROMPT_TYPES = {
  mobility_stale: { priority: 'high', re_prompt_after_days: 3 },
  progressive_overload_ready: { priority: 'medium', re_prompt_after_days: 7 },
  weekly_cardio_on_track: { priority: 'low', re_prompt_after_days: 7 },
  supplement_missed: { priority: 'low', re_prompt_after_days: 1 },
  health_checkin_overdue: { priority: 'high', re_prompt_after_days: 7 },
  week_review: { priority: 'medium', re_prompt_after_days: 7 },
} as const satisfies Record<string, PromptTypeDefinition>;

export type PromptType = keyof typeof PROMPT_TYPES;

const MS_PER_DAY = 86_400_000;

// Suppression signal for rule 2. An unfinished session (feel_rating === null)
// means the user is mid-logging-flow; no prompts should interrupt. Scans the
// sessions table — fine at Phase 1 scale, can be replaced with a denormalized
// flag on user_preferences if it ever shows up in a profile.
async function hasInProgressSession(): Promise<boolean> {
  const sessions = await db.sessions
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .toArray();
  return sessions.some((s) => s.feel_rating === null);
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Whether a prompt of this type can fire right now. Triggers call this to
// decide whether to compute their condition at all — checking the cheap
// suppression first avoids expensive trigger work that'd be discarded.
export async function canFirePrompt(type: PromptType): Promise<boolean> {
  if (await hasInProgressSession()) return false;

  const allPrompts = await db.prompts
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .toArray();

  const startToday = startOfTodayISO();
  const firedToday = allPrompts.filter((p) => p.fired_at >= startToday);
  if (firedToday.length >= DAILY_PROMPT_CAP) return false;

  // Re-prompt window check. The most-recent prompt of this type holds the
  // cooldown — if it's still active (not dismissed) we don't re-fire; if
  // it's dismissed but the window hasn't elapsed, we wait.
  const sameType = allPrompts.filter((p) => p.type === type);
  if (sameType.length === 0) return true;

  const mostRecent = sameType.reduce((latest, p) =>
    p.fired_at > latest.fired_at ? p : latest,
  );
  if (mostRecent.dismissed_at === null) return false;

  const dismissedAtMs = Date.parse(mostRecent.dismissed_at);
  const windowMs = mostRecent.re_prompt_after_days * MS_PER_DAY;
  return Date.now() - dismissedAtMs >= windowMs;
}

// Persist a prompt as fired. Returns the new prompt id, or null if blocked
// by a suppression rule. Triggers call this after computing their condition;
// the caller is responsible for any UI rendering — this module is purely
// a coordinator.
export async function firePrompt(
  type: PromptType,
  options: { re_prompt_after_days?: number } = {},
): Promise<string | null> {
  if (!(await canFirePrompt(type))) return null;

  const def = PROMPT_TYPES[type];
  const record: PromptRecord = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    type,
    priority: def.priority,
    fired_at: new Date().toISOString(),
    dismissed_at: null,
    re_prompt_after_days: options.re_prompt_after_days ?? def.re_prompt_after_days,
  };
  await syncedAdd(db.prompts, record);
  return record.id;
}

// Records a dismissal so the re-prompt window starts ticking.
export async function dismissPrompt(promptId: string): Promise<void> {
  await syncedUpdate(db.prompts, promptId, {
    dismissed_at: new Date().toISOString(),
  });
}

// Prompts that are eligible to surface in the UI right now: fired, not
// dismissed. Display surfaces (Phase 4/5) will live-query this and render
// active prompts, sorted by priority.
export async function getActivePrompts(): Promise<PromptRecord[]> {
  return db.prompts
    .where('user_id')
    .equals(LOCAL_USER_ID)
    .filter((p) => p.dismissed_at === null)
    .toArray();
}
