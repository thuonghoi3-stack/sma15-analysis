import type { Candle } from "./types.ts";
import { pearson } from "./stats.ts";

export function computeSma(values: number[], period: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (period <= 0 || n === 0) return out;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i]!;
    if (i >= period) sum -= values[i - period]!;
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with SMA of the first `period` closes. k = 2 / (period + 1). */
export function computeEma(values: number[], period: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (period <= 0 || n === 0) return out;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const v = values[i]!;
    if (i < period - 1) {
      sum += v;
      continue;
    }
    if (i === period - 1) {
      sum += v;
      out[i] = sum / period;
      continue;
    }
    out[i] = v * k + (out[i - 1] as number) * (1 - k);
  }
  return out;
}

/** Wilder ATR. First value is the SMA of the first `period` true ranges. */
export function computeAtr(candles: Candle[], period: number): Array<number | null> {
  const n = candles.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (period <= 0 || n < period) return out;

  const tr = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const h = candles[i]!.h;
    const l = candles[i]!.l;
    if (i === 0) {
      tr[i] = h - l;
    } else {
      const pc = candles[i - 1]!.c;
      tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    }
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += tr[i]!;
  out[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    out[i] = ((out[i - 1] as number) * (period - 1) + tr[i]!) / period;
  }
  return out;
}

/** Wilder RSI. Flat tape seeds at 50. */
export function computeRsi(values: number[], period: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (period <= 0 || n <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = rsiFrom(gain, loss);
  for (let i = period + 1; i < n; i++) {
    const d = values[i]! - values[i - 1]!;
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = rsiFrom(gain, loss);
  }
  return out;
}

function rsiFrom(gain: number, loss: number): number {
  if (gain === 0 && loss === 0) return 50;
  if (loss === 0) return 100;
  if (gain === 0) return 0;
  return 100 - 100 / (1 + gain / loss);
}

/** Ehlers CTI: Pearson of close vs a straight line over `period` bars. */
export function computeCti(values: number[], period: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (period < 3 || n < period) return out;
  const xs = Array.from({ length: period }, (_, i) => i);
  const ys = new Array<number>(period);
  for (let i = period - 1; i < n; i++) {
    for (let k = 0; k < period; k++) ys[k] = values[i - period + 1 + k]!;
    const r = pearson(xs, ys);
    out[i] = Number.isFinite(r) ? r : 0;
  }
  return out;
}

export type Bollinger = {
  mid: Array<number | null>;
  upper: Array<number | null>;
  lower: Array<number | null>;
  widthPct: Array<number | null>;
  pctB: Array<number | null>;
};

/** Bollinger: SMA ± k × σ population. Width = (upper − lower) / mid × 100. */
export function computeBb(values: number[], period: number, k: number): Bollinger {
  const n = values.length;
  const mid = computeSma(values, period);
  const upper: Array<number | null> = new Array(n).fill(null);
  const lower: Array<number | null> = new Array(n).fill(null);
  const widthPct: Array<number | null> = new Array(n).fill(null);
  const pctB: Array<number | null> = new Array(n).fill(null);
  if (period <= 1 || n < period) return { mid, upper, lower, widthPct, pctB };
  for (let i = period - 1; i < n; i++) {
    const m = mid[i];
    if (m == null) continue;
    let ss = 0;
    for (let j = 0; j < period; j++) {
      const d = values[i - period + 1 + j]! - m;
      ss += d * d;
    }
    const sd = Math.sqrt(ss / period);
    const u = m + k * sd;
    const l = m - k * sd;
    upper[i] = u;
    lower[i] = l;
    const span = u - l;
    widthPct[i] = m > 0 ? (span / m) * 100 : 0;
    pctB[i] = span > 0 ? (values[i]! - l) / span : 0.5;
  }
  return { mid, upper, lower, widthPct, pctB };
}

/** Causal percentile of `values[i]` among the trailing `lookback` finite points. */
export function rankInWindow(values: Array<number | null>, lookback: number): Array<number | null> {
  const n = values.length;
  const out: Array<number | null> = new Array(n).fill(null);
  if (lookback < 8) return out;
  for (let i = 0; i < n; i++) {
    const v = values[i];
    if (v == null || !Number.isFinite(v)) continue;
    const from = Math.max(0, i - lookback + 1);
    let c = 0;
    let le = 0;
    for (let j = from; j <= i; j++) {
      const w = values[j];
      if (w == null || !Number.isFinite(w)) continue;
      c += 1;
      if (w <= v) le += 1;
    }
    if (c < 20) continue;
    out[i] = le / c;
  }
  return out;
}
