import { mean, quantile, stdev } from "./stats.ts";
import {
  extractRows,
  fitOlsMax,
  scorePred,
  scoreWithCoefs,
  type Coefs,
  type PredictRow,
  type Score,
} from "./predict.ts";
import type { Candle, Interval } from "./types.ts";

const DAY = 86_400_000;
export const STAB_WINDOW_DAYS = 30;
export const STAB_STEP_DAYS = 7;

export type WindowFit = {
  label: string;
  from: number;
  to: number;
  n: number;
  coefs: Coefs;
  maeIn: number;
};

export type SymbolStab = {
  symbol: string;
  n90: number;
  full: Coefs;
  thirds: WindowFit[];
  slopeMin: number;
  slopeMax: number;
  slopeRange: number;
  slopeCv: number;
  emaMin: number;
  emaMax: number;
  oos: Score;
  naiveOos: number;
  nTrain: number;
  nTest: number;
};

export type StabilityReport = {
  days: number;
  interval: Interval;
  nSymbols: number;
  nRows: number;
  from: number;
  to: number;
  pooled90: Coefs;
  pooledLast30: Coefs;
  pooledFirst30: Coefs;
  thirds: WindowFit[];
  rolling: WindowFit[];
  train60test30: { ols: Score; naive: number; nTrain: number; nTest: number };
  first30onLast30: Score;
  slopeMin: number;
  slopeMax: number;
  slopeRange: number;
  slopeCv: number;
  emaMin: number;
  emaMax: number;
  symbols: SymbolStab[];
  grade: "stable" | "drift" | "break";
  verdict: string;
};

export function rowsIn(rows: PredictRow[], from: number, to: number): PredictRow[] {
  return rows.filter((r) => r.t >= from && r.t < to);
}

function naiveMae(train: PredictRow[], test: PredictRow[]): number {
  const p50 = quantile(
    train.map((r) => r.bars).slice().sort((a, b) => a - b),
    0.5,
  );
  return scorePred(
    test.map((r) => r.bars),
    test.map(() => p50),
  ).mae;
}

export function fitWindow(rows: PredictRow[], from: number, to: number, label: string): WindowFit {
  const slice = rowsIn(rows, from, to);
  const coefs = fitOlsMax(slice);
  const maeIn = scoreWithCoefs(coefs, slice).mae;
  return { label, from, to, n: slice.length, coefs, maeIn };
}

export function thirdsOf(from: number, to: number): { from: number; to: number; label: string }[] {
  const span = to - from;
  const w = span / 3;
  return [
    { from, to: from + w, label: "T1 · 0–30n" },
    { from: from + w, to: from + 2 * w, label: "T2 · 30–60n" },
    { from: from + 2 * w, to, label: "T3 · 60–90n" },
  ];
}

export function rollingBounds(from: number, to: number, windowDays = STAB_WINDOW_DAYS, stepDays = STAB_STEP_DAYS): { from: number; to: number }[] {
  const win = windowDays * DAY;
  const step = stepDays * DAY;
  const out: { from: number; to: number }[] = [];
  for (let s = from; s + win <= to + 1; s += step) {
    out.push({ from: s, to: s + win });
  }
  if (out.length === 0) out.push({ from, to });
  return out;
}

function slopeStats(windows: WindowFit[]): { min: number; max: number; range: number; cv: number } {
  const xs = windows.map((w) => w.coefs.depth).filter((v) => Number.isFinite(v));
  const avg = mean(xs);
  const sd = xs.length >= 2 ? stdev(xs, avg) : 0;
  const min = xs.length ? Math.min(...xs) : NaN;
  const max = xs.length ? Math.max(...xs) : NaN;
  return {
    min,
    max,
    range: max - min,
    cv: avg !== 0 && Number.isFinite(avg) ? sd / Math.abs(avg) : NaN,
  };
}

function emaRange(windows: WindowFit[]): { min: number; max: number } {
  const xs = windows.map((w) => w.coefs.ema).filter((v) => Number.isFinite(v));
  return {
    min: xs.length ? Math.min(...xs) : NaN,
    max: xs.length ? Math.max(...xs) : NaN,
  };
}

function gradeOf(slopeCv: number, slopeRange: number, oosMae: number, naive: number): "stable" | "drift" | "break" {
  const oosOk = Number.isFinite(oosMae) && Number.isFinite(naive) && oosMae + 0.4 < naive;
  if (!oosOk) return "break";
  if (slopeCv <= 0.15 && slopeRange <= 1.5) return "stable";
  if (slopeCv <= 0.28 && slopeRange <= 2.5) return "drift";
  return "break";
}

function verdictOf(grade: "stable" | "drift" | "break", s: ReturnType<typeof slopeStats>, oos: number, naive: number): string {
  const oosTxt = `Train 60n → test 30n: OLS MAE ${oos.toFixed(2)} vs naive ${naive.toFixed(2)}.`;
  if (grade === "stable") {
    return `Hệ số ổn định trên 90 ngày (slope ${s.min.toFixed(2)}–${s.max.toFixed(2)}, CV ${(s.cv * 100).toFixed(0)}%). Giữ pooled. ${oosTxt}`;
  }
  if (grade === "drift") {
    return `Slope trôi nhẹ (CV ${(s.cv * 100).toFixed(0)}%, dải ${s.range.toFixed(2)}). Vẫn dùng pooled, refit rolling 30 ngày nếu MAE nở. ${oosTxt}`;
  }
  return `Hệ số không ổn định (slope ${s.min.toFixed(2)}–${s.max.toFixed(2)}). Không lock công thức 30 ngày cho 90 ngày. ${oosTxt}`;
}

export function fitSymbolStability(input: {
  symbol: string;
  rows: PredictRow[];
  from: number;
  to: number;
}): SymbolStab {
  const { symbol, rows, from, to } = input;
  const cuts = thirdsOf(from, to);
  const thirds = cuts.map((c) => fitWindow(rows, c.from, c.to, c.label));
  const rolling = rollingBounds(from, to).map((b, i) =>
    fitWindow(rows, b.from, b.to, `R${i + 1}`),
  );
  const stats = slopeStats(rolling.length >= 3 ? rolling : thirds);
  const er = emaRange(rolling.length >= 3 ? rolling : thirds);
  const mid = from + (2 / 3) * (to - from);
  const train = rowsIn(rows, from, mid);
  const test = rowsIn(rows, mid, to);
  const oos = scoreWithCoefs(fitOlsMax(train), test);
  return {
    symbol,
    n90: rows.length,
    full: fitOlsMax(rows),
    thirds,
    slopeMin: stats.min,
    slopeMax: stats.max,
    slopeRange: stats.range,
    slopeCv: stats.cv,
    emaMin: er.min,
    emaMax: er.max,
    oos,
    naiveOos: naiveMae(train, test),
    nTrain: train.length,
    nTest: test.length,
  };
}

export function assembleStability(input: {
  interval: Interval;
  days: number;
  from: number;
  to: number;
  symbols: { symbol: string; rows: PredictRow[] }[];
}): StabilityReport {
  const { interval, days, from, to, symbols } = input;
  const all = symbols.flatMap((s) => s.rows);
  const cuts = thirdsOf(from, to);
  const thirds = cuts.map((c) => fitWindow(all, c.from, c.to, c.label));
  const rolling = rollingBounds(from, to).map((b, i) => {
    const d0 = Math.round((b.from - from) / DAY);
    return fitWindow(all, b.from, b.to, `N${d0}–${d0 + STAB_WINDOW_DAYS}`);
  });
  const pooled90 = fitOlsMax(all);
  const first30 = from + STAB_WINDOW_DAYS * DAY;
  const last30 = to - STAB_WINDOW_DAYS * DAY;
  const pooledFirst30 = fitOlsMax(rowsIn(all, from, first30));
  const pooledLast30 = fitOlsMax(rowsIn(all, last30, to));
  const mid = from + (2 / 3) * (to - from);
  const train = rowsIn(all, from, mid);
  const test = rowsIn(all, mid, to);
  const train60test30 = {
    ols: scoreWithCoefs(fitOlsMax(train), test),
    naive: naiveMae(train, test),
    nTrain: train.length,
    nTest: test.length,
  };
  const first30onLast30 = scoreWithCoefs(pooledFirst30, rowsIn(all, last30, to));
  const stats = slopeStats(rolling.length >= 3 ? rolling : thirds);
  const er = emaRange(rolling.length >= 3 ? rolling : thirds);
  const per = symbols.map((s) => fitSymbolStability({ symbol: s.symbol, rows: s.rows, from, to }));
  const grade = gradeOf(stats.cv, stats.range, train60test30.ols.mae, train60test30.naive);
  return {
    days,
    interval,
    nSymbols: symbols.length,
    nRows: all.length,
    from,
    to,
    pooled90,
    pooledLast30,
    pooledFirst30,
    thirds,
    rolling,
    train60test30,
    first30onLast30,
    slopeMin: stats.min,
    slopeMax: stats.max,
    slopeRange: stats.range,
    slopeCv: stats.cv,
    emaMin: er.min,
    emaMax: er.max,
    symbols: per,
    grade,
    verdict: verdictOf(grade, stats, train60test30.ols.mae, train60test30.naive),
  };
}

export function stabilityFromCandles(input: {
  interval: Interval;
  days: number;
  series: { symbol: string; candles: Candle[] }[];
}): StabilityReport {
  const { interval, days, series } = input;
  let from = Infinity;
  let to = -Infinity;
  for (const s of series) {
    for (const c of s.candles) {
      if (c.t < from) from = c.t;
      if (c.t > to) to = c.t;
    }
  }
  if (!Number.isFinite(from)) {
    from = 0;
    to = 1;
  } else {
    to += 1;
  }
  const symbols = series.map((s) => ({ symbol: s.symbol, rows: extractRows(s.candles, interval) }));
  return assembleStability({ interval, days, from, to, symbols });
}
