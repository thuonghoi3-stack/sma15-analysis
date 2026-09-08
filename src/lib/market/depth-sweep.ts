import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { FORECAST_MIN_BARS, TP_SLACK_BARS } from "./symbols.ts";
import type { Candle, DepthPoint, DepthReport, RecoveryCell, TrendFilter } from "./types.ts";

export const DEPTH_SWEEP = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5];

function ols(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
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
  if (den === 0) return NaN;
  return (n * sxy - sx * sy) / den;
}

function toPoint(run: ReturnType<typeof backtestFade>, entryAtr: number): DepthPoint {
  return {
    entryAtr,
    n: run.n,
    expectancy: run.expectancy,
    winRate: run.winRate,
    stopShare: run.stopShare,
    smaShare: run.smaShare,
    tpShare: run.tpShare,
    compoundPct: run.compoundPct,
    firstE: run.firstE,
    secondE: run.secondE,
    nFirst: run.nFirst,
    nSecond: run.nSecond,
    nSkipForecast: run.nSkipForecast,
    avgBars: run.avgBars,
  };
}

function usable(p: DepthPoint): boolean {
  return p.n >= 12 && Number.isFinite(p.expectancy);
}

function pickPeak(points: DepthPoint[]): DepthPoint {
  const pool = points.filter(usable);
  const src = pool.length ? pool : points.filter((p) => p.n > 0);
  let best = src[0] ?? points[0]!;
  for (const p of src) {
    if (p.expectancy > best.expectancy) best = p;
    else if (p.expectancy === best.expectancy && p.n > best.n) best = p;
  }
  return best;
}

function slopeOf(points: DepthPoint[]): number {
  const ok = points.filter(usable);
  return ols(
    ok.map((p) => p.entryAtr),
    ok.map((p) => p.expectancy),
  );
}

function grade(input: {
  up: DepthPoint[];
  all: DepthPoint[];
  peak: DepthPoint;
}): DepthReport["verdict"] {
  const { up, all, peak } = input;
  const valid = up.filter(usable);
  const first = valid[0];
  const last = valid[valid.length - 1];
  const shallow = up.find((p) => p.entryAtr === 0.5) ?? first;
  const delta = first && Number.isFinite(peak.expectancy) && shallow && Number.isFinite(shallow.expectancy)
    ? peak.expectancy - shallow.expectancy
    : NaN;
  const halves =
    Number.isFinite(peak.firstE) &&
    Number.isFinite(peak.secondE) &&
    peak.firstE > 0 &&
    peak.secondE > 0 &&
    peak.nFirst >= 5 &&
    peak.nSecond >= 5;
  const interior = first != null && last != null && peak.entryAtr !== first.entryAtr && peak.entryAtr !== last.entryAtr;
  const slopeAll = slopeOf(all);
  const allFlat = !Number.isFinite(slopeAll) || Math.abs(slopeAll) < 0.02;

  if (interior && halves && Number.isFinite(delta) && delta > 0.02 && allFlat) return "sweet-spot";
  if (last && peak.entryAtr === last.entryAtr && halves && Number.isFinite(delta) && delta > 0.02) return "deeper-helps";
  if (first && peak.entryAtr === first.entryAtr) return "shallow-better";
  return "flat";
}

export function runDepthSweep(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  ema20: Array<number | null>;
  emaPeriod: number;
  recoveryCells: RecoveryCell[];
  lookforward: number;
  intervalMin: number;
}): DepthReport {
  const { candles, sma, atr, ema20, recoveryCells, lookforward, intervalMin } = input;

  const run = (entryAtr: number, trendFilter: TrendFilter, forecast: boolean) =>
    backtestFade({
      candles,
      sma,
      atr,
      smaTrend: ema20,
      entryAtr,
      stopAtr: STOP_ATR,
      lookforward,
      intervalMin,
      uptrendOnly: trendFilter === "up",
      trendFilter,
      feeBps: FEE_BPS,
      emaSeries: ema20,
      recoveryCells: forecast ? recoveryCells : undefined,
      minForecastBars: forecast ? FORECAST_MIN_BARS : 0,
      tpSlackBars: forecast ? TP_SLACK_BARS : 0,
    });

  const up: DepthPoint[] = [];
  const forecast: DepthPoint[] = [];
  const all: DepthPoint[] = [];
  for (const d of DEPTH_SWEEP) {
    up.push(toPoint(run(d, "up", false), d));
    forecast.push(toPoint(run(d, "up", true), d));
    all.push(toPoint(run(d, "all", false), d));
  }

  const peakUp = pickPeak(up);
  const peakForecast = pickPeak(forecast);
  const shallow = up[0];
  const occupancyDrop = shallow && peakUp.n > 0 ? shallow.n / peakUp.n : NaN;
  const skipFloor = forecast.find((p) => p.nSkipForecast === 0 && p.n > 0)?.entryAtr ?? NaN;
  const deltaE =
    shallow && Number.isFinite(shallow.expectancy) && Number.isFinite(peakUp.expectancy)
      ? peakUp.expectancy - shallow.expectancy
      : NaN;

  return {
    depths: [...DEPTH_SWEEP],
    emaPeriod: input.emaPeriod,
    up,
    forecast,
    all,
    peakUp,
    peakForecast,
    slopeUp: slopeOf(up),
    slopeAll: slopeOf(all),
    deltaE,
    occupancyDrop,
    skipFloor,
    verdict: grade({ up, all, peak: peakUp }),
  };
}
