// Weekly fill fraction, clamped to [0,1]. Target 0 never fills (returns 0).
export function fillFraction(progress: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(progress / target, 1));
}
