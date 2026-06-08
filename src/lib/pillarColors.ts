// Per-pillar color identity for the Fitness page (June 5 design session).
//
// Each pillar fills its card left-to-right with a soft tint of `fill`,
// proportional to weekly progress; `text` is the pillar's label/accent color.
// Ordered warm→cool down the page (Bundle → Cardio → Lower → Upper → Mobility)
// as a default thermal gradient — the Build 2.5 reorder may break it, which is
// fine (per-card colors still carry meaning individually).
//
// `#0f3d2e` (deep green) is RESERVED for app chrome (hero bands, icon) and is
// deliberately NOT a pillar color — that's why Upper Body is pine, not deep
// green. The Apple Watch row is a data source, not a pillar: no color, no fill.

export type PillarKey =
  | 'bundle'
  | 'cardio'
  | 'lower'
  | 'upper'
  | 'full_body'
  | 'mobility';

export interface PillarColor {
  fill: string;
  text: string;
}

export const PILLAR_COLORS: Record<PillarKey, PillarColor> = {
  bundle: { fill: '#e0742f', text: '#c25a1d' }, // warm orange — fundamentals
  cardio: { fill: '#e8b520', text: '#a8810e' }, // gold — energy / heart
  lower: { fill: '#1a6b4a', text: '#1a6b4a' }, // mid-green — foundation
  upper: { fill: '#2a7d6f', text: '#216358' }, // pine — chisel
  // Full Body was NOT assigned a color in the June 5 palette (it's the
  // optional, usually target-0 lifting card). Reusing its existing History
  // identity green so it stays distinct from Lower/Upper when it IS used.
  full_body: { fill: '#22c37e', text: '#1a8f5a' },
  mobility: { fill: '#378ADD', text: '#2a6db5' }, // cool blue — serenity
};

// Subtle tint so the page reads calm (June 5: ~0.10–0.18). A complete week
// gets the richer end; an in-progress card the lighter.
export const PILLAR_FILL_ALPHA = 0.13;
export const PILLAR_FILL_ALPHA_COMPLETE = 0.18;

// #rrggbb → rgba(r,g,b,alpha). Falls back to the input on a malformed hex so a
// bad value degrades to an opaque color rather than throwing at render.
export function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Weekly fill fraction, clamped to [0,1]. Target 0 never fills (returns 0).
export function fillFraction(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(progress / target, 1));
}
