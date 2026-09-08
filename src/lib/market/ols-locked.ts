/** Pooled 90d OLS. Tiny module so the live scanner does not import analyze. */
export const LOCKED_90 = { intercept: -0.28, depth: 4.67, ema: -0.36, vol: 0 };

export function predLocked(depth: number, emaUp: boolean): number {
  const y = LOCKED_90.intercept + LOCKED_90.depth * depth + LOCKED_90.ema * (emaUp ? 1 : 0);
  if (!Number.isFinite(y)) return NaN;
  return Math.min(48, Math.max(1, y));
}
