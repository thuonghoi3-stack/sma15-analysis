import { pearson, quantile } from "./stats.ts";
import { MIN_SIGNAL_ATR } from "./symbols.ts";
import type { Candle, DipEvent, RecoveryCell, RecoveryForecast, RecoveryReport, RecoveryTrend } from "./types.ts";

export const RECOVERY_DEPTHS = [0.25, 0.5, 1, 1.5, 2.5];

export function depthIndex(atr: number): number {
  if (atr < 0.5) return 0;
  if (atr < 1) return 1;
  if (atr < 1.5) return 2;
  if (atr < 2.5) return 3;
  return 4;
}

export function forecastRecoveryBars(
  cells: RecoveryCell[],
  undershootAtr: number,
  emaUp: boolean,
): number {
  const trend: RecoveryTrend = emaUp ? "ema" : "down";
  const lo = RECOVERY_DEPTHS[depthIndex(undershootAtr)]!;
  const hit =
    cells.find((c) => c.trend === trend && c.depthLo === lo) ??
    cells.find((c) => c.trend === "all" && c.depthLo === lo);
  return hit && Number.isFinite(hit.p50) ? hit.p50 : NaN;
}

function ols(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = Math.min(xs.length, ys.length);
  if (n < 8) return { slope: NaN, intercept: NaN };
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!;
    const y = ys[i]!;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const den = n * sxx - sx * sx;
  if (den === 0) return { slope: NaN, intercept: NaN };
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function summarizeBars(events: DipEvent[]): { n: number; nRec: number; recRate: number; p50: number; p75: number; p90: number } {
  const rec = events.filter((e) => e.recovered);
  const bars = rec.map((e) => e.recoveryCandles).sort((a, b) => a - b);
  return {
    n: events.length,
    nRec: rec.length,
    recRate: events.length ? rec.length / events.length : NaN,
    p50: quantile(bars, 0.5),
    p75: quantile(bars, 0.75),
    p90: quantile(bars, 0.9),
  };
}

function cellOf(trend: RecoveryTrend, depthIdx: number, events: DipEvent[]): RecoveryCell {
  const lo = RECOVERY_DEPTHS[depthIdx]!;
  const hi = RECOVERY_DEPTHS[depthIdx + 1] ?? null;
  const s = summarizeBars(events);
  return {
    trend,
    depthLo: lo,
    depthHi: hi,
    n: s.n,
    nRec: s.nRec,
    recRate: s.recRate,
    p50: s.p50,
    p75: s.p75,
    p90: s.p90,
  };
}

export function buildRecovery(input: {
  events: DipEvent[];
  candles: Candle[];
  ema20: Array<number | null>;
  emaPeriod: number;
  live: { below: boolean; undershootAtr: number; aboveEma20: boolean };
  intervalMin: number;
}): RecoveryReport {
  const tagged = input.events
    .filter((e) => e.undershootAtr >= MIN_SIGNAL_ATR)
    .map((e) => {
      const bar = input.candles[e.startIdx];
      const ema = input.ema20[e.startIdx];
      const emaUp = bar != null && ema != null && bar.c > ema;
      return { e, emaUp };
    });

  const byTrend: Record<RecoveryTrend, DipEvent[]> = {
    ema: tagged.filter((t) => t.emaUp).map((t) => t.e),
    down: tagged.filter((t) => !t.emaUp).map((t) => t.e),
    all: tagged.map((t) => t.e),
  };

  const cells: RecoveryCell[] = [];
  for (const trend of ["ema", "all", "down"] as RecoveryTrend[]) {
    const xs = byTrend[trend];
    for (let i = 0; i < RECOVERY_DEPTHS.length; i++) {
      const slice = xs.filter((e) => depthIndex(e.undershootAtr) === i);
      cells.push(cellOf(trend, i, slice));
    }
  }

  const recAll = byTrend.all.filter((e) => e.recovered);
  const recEma = byTrend.ema.filter((e) => e.recovered);
  const recDown = byTrend.down.filter((e) => e.recovered);
  const fit = ols(
    recAll.map((e) => e.undershootAtr),
    recAll.map((e) => e.recoveryCandles),
  );
  const p50All = quantile(recAll.map((e) => e.recoveryCandles).sort((a, b) => a - b), 0.5);
  const p50Ema = quantile(recEma.map((e) => e.recoveryCandles).sort((a, b) => a - b), 0.5);
  const p50Down = quantile(recDown.map((e) => e.recoveryCandles).sort((a, b) => a - b), 0.5);

  const liveTrend: RecoveryTrend = input.live.aboveEma20 ? "ema" : "down";
  const liveDepth = input.live.below && input.live.undershootAtr >= MIN_SIGNAL_ATR
    ? input.live.undershootAtr
    : NaN;
  const typicalDepth = quantile(recAll.map((e) => e.undershootAtr).sort((a, b) => a - b), 0.5);
  const depth = Number.isFinite(liveDepth) ? liveDepth : typicalDepth;
  const trend = Number.isFinite(liveDepth) ? liveTrend : liveTrend;
  const idx = Number.isFinite(depth) ? depthIndex(depth) : 2;
  const lo = RECOVERY_DEPTHS[idx] ?? 1;
  const hit =
    cells.find((c) => c.trend === trend && c.depthLo === lo) ??
    cells.find((c) => c.trend === "all" && c.depthLo === lo);
  const forecast: RecoveryForecast | null = hit
    ? {
        source: Number.isFinite(liveDepth) ? "live" : "typical",
        trend: hit.trend,
        depthLo: hit.depthLo,
        depthHi: hit.depthHi,
        n: hit.n,
        recRate: hit.recRate,
        p50: hit.p50,
        p75: hit.p75,
        p90: hit.p90,
      }
    : null;

  return {
    intervalMin: input.intervalMin,
    depths: [...RECOVERY_DEPTHS],
    cells,
    corr: pearson(recAll.map((e) => e.undershootAtr), recAll.map((e) => e.recoveryCandles)),
    corrEma: pearson(recEma.map((e) => e.undershootAtr), recEma.map((e) => e.recoveryCandles)),
    corrDown: pearson(recDown.map((e) => e.undershootAtr), recDown.map((e) => e.recoveryCandles)),
    slope: fit.slope,
    intercept: fit.intercept,
    p50All,
    p50Ema,
    p50Down,
    trendLift: p50Ema - p50Down,
    forecast,
    emaPeriod: input.emaPeriod,
  };
}
