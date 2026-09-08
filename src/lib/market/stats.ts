import type { HistogramBin, Quantiles } from "./types.ts";

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export function stdev(values: number[], avg = mean(values)): number {
  if (values.length < 2) return 0;
  let s = 0;
  for (const v of values) {
    const d = v - avg;
    s += d * d;
  }
  return Math.sqrt(s / (values.length - 1));
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo]!;
  const b = sorted[hi]!;
  if (lo === hi) return a;
  return a * (hi - pos) + b * (pos - lo);
}

export function summarize(values: number[]): Quantiles {
  if (values.length === 0) {
    return {
      mean: NaN,
      std: NaN,
      cv: NaN,
      p10: NaN,
      p25: NaN,
      p50: NaN,
      p75: NaN,
      p90: NaN,
      p95: NaN,
    };
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const avg = mean(sorted);
  const sd = stdev(sorted, avg);
  return {
    mean: avg,
    std: sd,
    cv: avg !== 0 ? sd / Math.abs(avg) : NaN,
    p10: quantile(sorted, 0.1),
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    p95: quantile(sorted, 0.95),
  };
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i]! - mx;
    const b = ys[i]! - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0) return NaN;
  return num / den;
}

/** Empirical percentile of `value` in `sorted` (0–100). */
export function percentileOf(sorted: number[], value: number): number {
  if (sorted.length === 0) return NaN;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! <= value) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

export function histogram(values: number[], bins: number, hiCap?: number): HistogramBin[] {
  if (values.length === 0 || bins <= 0) return [];
  const sorted = values.slice().sort((a, b) => a - b);
  const lo = 0;
  const hi = hiCap ?? Math.max(sorted[sorted.length - 1]!, sorted[0]! + 1e-9);
  const width = (hi - lo) / bins || 1;
  const out: HistogramBin[] = [];
  for (let i = 0; i < bins; i++) {
    out.push({ x0: lo + i * width, x1: lo + (i + 1) * width, n: 0 });
  }
  for (const v of values) {
    if (v < lo) continue;
    let idx = Math.floor((v - lo) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx]!.n += 1;
  }
  return out;
}
