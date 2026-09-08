import type { Candle } from "./types.ts";
import { VOL_DUMP_MULT } from "./symbols.ts";

export function volRatio(volume: number, volSma: number | null): number {
  if (volSma == null || volSma <= 0 || !Number.isFinite(volume)) return NaN;
  return volume / volSma;
}

/** Selling pressure: red candle or close stuck in the lower 30% of the range. */
export function isSellingBar(bar: Candle): boolean {
  if (bar.c < bar.o) return true;
  const range = bar.h - bar.l;
  if (range <= 0) return bar.c <= bar.o;
  return (bar.c - bar.l) / range <= 0.3;
}

/** True when we should not fade: dump volume ≥ maxMult × SMA(volume). maxMult ≤ 0 disables. */
export function isVolumeDump(bar: Candle, volSma: number | null, maxMult: number): boolean {
  if (!(maxMult > 0)) return false;
  const r = volRatio(bar.v, volSma);
  if (!Number.isFinite(r) || r < maxMult) return false;
  return isSellingBar(bar);
}

export function defaultDump(bar: Candle, volSma: number | null): boolean {
  return isVolumeDump(bar, volSma, VOL_DUMP_MULT);
}
