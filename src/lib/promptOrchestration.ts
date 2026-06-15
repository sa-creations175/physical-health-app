import { db } from '../db/database';
import { syncedAdd, syncedUpdate } from '../db/syncedWrite';
import { LOCAL_USER_ID } from './constants';
import type { PromptPriority, PromptRecord } from '../db/types';

// Phase-1 scaffold for proactive prompts. The prompts table already exists
// (Dexie v1) — this module is the thin coordinator that future triggers
// (Phases 4/5: mobility staleness, weekly review, etc.) will call to
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
//
// The earlier `progressive_overload_ready` type was removed in Build 2.2:
// the in-session "ready to add weight?" suggestion is not coming back —
// PR detection still lives in the exercise library sparkline, where it
// surfaces quietly without prescribing the next number.
export const PROMPT_TYPES = {
  mobility_stale: { priority: 'high', re_prompt_after_days: 3 },
  weekly_cardio_on_track: { priority: 'low', re_prompt_after_days: 7 },
  supplement_missed: { priority: 'low', re_prompt_after_days: 1 },
  health_checkin_overdue: { priority: 'high', re_prompt_after_days: 7 },
  week_review: { priority: 'medium', re_prompt_after_days: 7 },
  // Bi-weekly Navy-Method body-fat re-measure (Phase 3a). Fires when the most
  // recent body_measurements row is older than 14 days.
  body_measurement_due: { priority: 'medium', re_prompt_after_days: 14 },
} as const satisfies Record<string, PromptTypeDefinition>;

export type PromptType = keyof typeof PROMPT_TYPES;

// Display copy per type, read by whatever prompt surface renders an active
// prompt (the surface itself is Phase 4/5). Partial for now — entries are added
// as each trigger comes online.
export const PROMPT_COPY: Partial<Record<PromptType, string>> = {
  body_measurement_due:
    'Time for your bi-weekly body check-in — grab a tape measure and update your measurements.',
};

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

// Trigger: the most recent body-fat measurement is older than 14 days. Called
// from the startup sequence after the cloud pull completes (so a freshly
// restored measurement is counted), never during an active session — the
// active-session guard lives in canFirePrompt. Only nudges once a BF% is
// actually on record (any source); with nothing logged there's nothing to
// re-measure. Best-effort: never throws out, so it can't break startup.
const BODY_MEASUREMENT_INTERVAL_DAYS = 14;

// Runs once per app load. The startup effect double-fires under React
// StrictMode (dev), and canFirePrompt→firePrompt isn't atomic, so two
// concurrent calls would both pass the suppression check and fire twice. This
// synchronous guard returns immediately on the second call, before any await.
let bodyMeasurementCheckRan = false;

export async function checkBodyMeasurementDue(): Promise<void> {
  if (bodyMeasurementCheckRan) return;
  bodyMeasurementCheckRan = true;
  try {
    // Cheap suppression first (active session / daily cap / re-prompt window).
    if (!(await canFirePrompt('body_measurement_due'))) return;

    const measurements = await db.body_measurements
      .where('user_id')
      .equals(LOCAL_USER_ID)
      .toArray();
    if (measurements.length === 0) return; // no BF% on record yet

    const latest = measurements.reduce((a, b) =>
      a.recorded_at > b.recorded_at ? a : b,
    );
    const ageMs = Date.now() - Date.parse(latest.recorded_at);
    if (ageMs < BODY_MEASUREMENT_INTERVAL_DAYS * MS_PER_DAY) return;

    await firePrompt('body_measurement_due');
  } catch (e) {
    console.error('checkBodyMeasurementDue failed:', e);
  }
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
