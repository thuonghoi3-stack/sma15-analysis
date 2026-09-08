import { detectDips } from "./analyze.ts";
import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { runEmaTune } from "./ema-tune.ts";
import { computeAtr, computeEma, computeSma } from "./indicators.ts";
import { depthIndex } from "./recovery.ts";
import { mean, pearson, quantile } from "./stats.ts";
import {
  ATR_PERIOD,
  FORECAST_MIN_BARS,
  intervalMinutes,
  LOOKFORWARD_HOURS,
  MIN_SIGNAL_ATR,
  SMA_PERIOD,
  TREND_SMA_PERIOD,
} from "./symbols.ts";
import type { Candle, Interval } from "./types.ts";

export const PREDICT_EMA = 14;
export const PREDICT_ENTRY_ATR = 1.25;
export const TRAIN_FRAC = 0.7;
export const MIN_TRAIN = 40;
export const MIN_TEST = 20;

export type PredictRow = {
  t: number;
  depthMax: number;
  depthFirst: number;
  emaUp: boolean;
  bars: number;
  recovered: boolean;
  volRatio: number;
};

export type Coefs = {
  intercept: number;
  depth: number;
  ema: number;
  vol: number;
};

export type Score = {
  n: number;
  mae: number;
  medae: number;
  hit2: number;
  r: number;
  skipPrecision: number;
  skipRecall: number;
  skipPredRate: number;
  skipActualRate: number;
};

export type ModelScore = Score & {
  name: string;
  coefs: Coefs | null;
};

export type FadeBook = {
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type LivePred = {
  last: number;
  sma: number | null;
  atr: number | null;
  below: boolean;
  depth: number;
  emaUp: boolean;
  predBars: number;
  skip: boolean;
  model: string;
};

export type SymbolPredict = {
  symbol: string;
  source: string;
  interval: Interval;
  days: number;
  candleCount: number;
  nEvents: number;
  nSignal: number;
  recRate: number;
  nTrain: number;
  nTest: number;
  thin: boolean;
  p50DumpAtr: number;
  p50DumpAtrFirst: number;
  p50Bars: number;
  corrMax: number;
  corrFirst: number;
  models: ModelScore[];
  winner: string;
  winnerMae: number;
  naiveMae: number;
  pooledMae: number;
  losoMae: number;
  btcMae: number;
  deltaVsNaive: number;
  deltaVsPooled: number;
  emaPeriod: number;
  fade: FadeBook;
  live: LivePred;
  error?: string;
};

export type UniversePredict = {
  interval: Interval;
  days: number;
  nSymbols: number;
  nOk: number;
  models: SymbolPredict[];
  meanOosMae: Record<string, number>;
  winnerShare: Record<string, number>;
  pooledCoefs: Coefs | null;
  perVsPooled: number;
  perVsBtc: number;
  fadeRank: { symbol: string; n: number; expectancy: number; winRate: number }[];
  slopeRank: { symbol: string; slope: number; intercept: number; ema: number }[];
  verdict: string;
};

const EMPTY_COEFS: Coefs = { intercept: NaN, depth: NaN, ema: NaN, vol: NaN };

function emptyScore(n = 0): Score {
  return {
    n,
    mae: NaN,
    medae: NaN,
    hit2: NaN,
    r: NaN,
    skipPrecision: NaN,
    skipRecall: NaN,
    skipPredRate: NaN,
    skipActualRate: NaN,
  };
}

function emptyFade(): FadeBook {
  return {
    n: 0,
    expectancy: NaN,
    winRate: NaN,
    stopShare: NaN,
    compoundPct: NaN,
    firstE: NaN,
    secondE: NaN,
    nFirst: 0,
    nSecond: 0,
  };
}

export function solveLinear(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r;
    }
    if (Math.abs(M[piv]![col]!) < 1e-12) return Array.from({ length: n }, () => NaN);
    const tmp = M[col]!;
    M[col] = M[piv]!;
    M[piv] = tmp;
    const d = M[col]![col]!;
    for (let c = col; c <= n; c++) M[col]![c] = M[col]![c]! / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r]![col]!;
      for (let c = col; c <= n; c++) M[r]![c] = M[r]![c]! - f * M[col]![c]!;
    }
  }
  return M.map((row) => row[n]!);
}

export function fitOls(X: number[][], y: number[]): number[] {
  const n = X.length;
  if (n === 0) return [];
  const k = X[0]!.length;
  if (n < k + 2) return Array.from({ length: k }, () => NaN);
  const A = Array.from({ length: k }, () => Array.from({ length: k }, () => 0));
  const b = Array.from({ length: k }, () => 0);
  for (let i = 0; i < n; i++) {
    const xi = X[i]!;
    const yi = y[i]!;
    for (let r = 0; r < k; r++) {
      b[r] += xi[r]! * yi;
      for (let c = 0; c < k; c++) A[r]![c] += xi[r]! * xi[c]!;
    }
  }
  return solveLinear(A, b);
}

export function clampBars(x: number, max = 48): number {
  if (!Number.isFinite(x)) return NaN;
  return Math.min(max, Math.max(1, x));
}

function volFeat(r: PredictRow): number {
  return Number.isFinite(r.volRatio) ? Math.min(6, Math.max(0, r.volRatio)) : 1;
}

function design(
  rows: PredictRow[],
  kind: "max" | "first" | "maxEma" | "firstEma" | "maxEmaVol",
): number[][] {
  return rows.map((r) => {
    const d = kind.startsWith("first") ? r.depthFirst : r.depthMax;
    const e = r.emaUp ? 1 : 0;
    if (kind === "max" || kind === "first") return [1, d];
    if (kind === "maxEmaVol") return [1, d, e, volFeat(r)];
    return [1, d, e];
  });
}

function packCoefs(beta: number[], kind: string): Coefs {
  return {
    intercept: beta[0] ?? NaN,
    depth: beta[1] ?? NaN,
    ema: kind.includes("Ema") ? (beta[2] ?? NaN) : 0,
    vol: kind.includes("Vol") ? (beta[3] ?? 0) : 0,
  };
}

export function predictOls(coefs: Coefs, depth: number, emaUp: boolean, vol = 1, max = 48): number {
  const y =
    coefs.intercept +
    coefs.depth * depth +
    coefs.ema * (emaUp ? 1 : 0) +
    coefs.vol * vol;
  return clampBars(y, max);
}

function applyDesign(beta: number[], X: number[][], max = 48): number[] {
  return X.map((row) => {
    let s = 0;
    for (let i = 0; i < row.length; i++) s += (beta[i] ?? 0) * row[i]!;
    return clampBars(s, max);
  });
}

export function splitRows(rows: PredictRow[]): { train: PredictRow[]; test: PredictRow[] } {
  const sorted = rows.slice().sort((a, b) => a.t - b.t);
  const nTrain = Math.max(1, Math.floor(sorted.length * TRAIN_FRAC));
  return { train: sorted.slice(0, nTrain), test: sorted.slice(nTrain) };
}

export function scorePred(actual: number[], pred: number[], minSkip = FORECAST_MIN_BARS): Score {
  const n = Math.min(actual.length, pred.length);
  if (n === 0) return emptyScore(0);
  const abs: number[] = [];
  const ys: number[] = [];
  const yh: number[] = [];
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let predSkip = 0;
  let actSkip = 0;
  for (let i = 0; i < n; i++) {
    const a = actual[i]!;
    const p = pred[i]!;
    if (!Number.isFinite(a) || !Number.isFinite(p)) continue;
    abs.push(Math.abs(a - p));
    ys.push(a);
    yh.push(p);
    const ps = p <= minSkip;
    const as = a <= minSkip;
    if (ps) predSkip += 1;
    if (as) actSkip += 1;
    if (ps && as) tp += 1;
    else if (ps && !as) fp += 1;
    else if (!ps && as) fn += 1;
  }
  const m = abs.length;
  if (m === 0) return emptyScore(0);
  const sorted = abs.slice().sort((a, b) => a - b);
  return {
    n: m,
    mae: mean(abs),
    medae: quantile(sorted, 0.5),
    hit2: abs.filter((v) => v <= 2).length / m,
    r: pearson(ys, yh),
    skipPrecision: tp + fp > 0 ? tp / (tp + fp) : NaN,
    skipRecall: tp + fn > 0 ? tp / (tp + fn) : NaN,
    skipPredRate: predSkip / m,
    skipActualRate: actSkip / m,
  };
}

type Grid = Map<string, number>;

function gridKey(emaUp: boolean, depth: number): string {
  return `${emaUp ? 1 : 0}:${depthIndex(depth)}`;
}

export function fitGrid(rows: PredictRow[], useFirst: boolean): Grid {
  const buckets = new Map<string, number[]>();
  const byDepth = new Map<number, number[]>();
  const all: number[] = [];
  for (const r of rows) {
    const d = useFirst ? r.depthFirst : r.depthMax;
    const k = gridKey(r.emaUp, d);
    const idx = depthIndex(d);
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(r.bars);
    (byDepth.get(idx) ?? byDepth.set(idx, []).get(idx)!).push(r.bars);
    all.push(r.bars);
  }
  const out: Grid = new Map();
  const fallback = quantile(all.slice().sort((a, b) => a - b), 0.5);
  out.set("all", fallback);
  for (const [idx, xs] of byDepth) {
    out.set(`d:${idx}`, quantile(xs.slice().sort((a, b) => a - b), 0.5));
  }
  for (const [k, xs] of buckets) {
    out.set(k, quantile(xs.slice().sort((a, b) => a - b), 0.5));
  }
  return out;
}

export function predictGrid(grid: Grid, emaUp: boolean, depth: number): number {
  const k = gridKey(emaUp, depth);
  const hit = grid.get(k);
  if (hit != null && Number.isFinite(hit)) return hit;
  const d = grid.get(`d:${depthIndex(depth)}`);
  if (d != null && Number.isFinite(d)) return d;
  return grid.get("all") ?? NaN;
}

function naivePred(train: PredictRow[], n: number): number[] {
  const p50 = quantile(
    train.map((r) => r.bars).slice().sort((a, b) => a - b),
    0.5,
  );
  return Array.from({ length: n }, () => p50);
}

const MODEL_KINDS = ["naive", "gridMax", "gridFirst", "olsMax", "olsFirst", "olsVol"] as const;
export type ModelName = (typeof MODEL_KINDS)[number];

export function fitModels(
  train: PredictRow[],
  test: PredictRow[],
): ModelScore[] {
  const y = test.map((r) => r.bars);
  const out: ModelScore[] = [];

  const naive = naivePred(train, test.length);
  out.push({ name: "naive", coefs: null, ...scorePred(y, naive) });

  const gMax = fitGrid(train, false);
  out.push({
    name: "gridMax",
    coefs: null,
    ...scorePred(
      y,
      test.map((r) => predictGrid(gMax, r.emaUp, r.depthMax)),
    ),
  });

  const gFirst = fitGrid(train, true);
  out.push({
    name: "gridFirst",
    coefs: null,
    ...scorePred(
      y,
      test.map((r) => predictGrid(gFirst, r.emaUp, r.depthFirst)),
    ),
  });

  const kinds = [
    ["olsMax", "maxEma"],
    ["olsFirst", "firstEma"],
    ["olsVol", "maxEmaVol"],
  ] as const;
  for (const [name, kind] of kinds) {
    const Xtr = design(train, kind);
    const beta = fitOls(Xtr, train.map((r) => r.bars));
    const pred = applyDesign(beta, design(test, kind));
    out.push({ name, coefs: packCoefs(beta, kind), ...scorePred(y, pred) });
  }
  return out;
}

export function pickWinner(models: ModelScore[], minN = MIN_TEST): string {
  const ok = models.filter((m) => m.n >= minN && Number.isFinite(m.mae));
  const pool = ok.length ? ok : models.filter((m) => Number.isFinite(m.mae));
  if (pool.length === 0) return "naive";
  return pool.slice().sort((a, b) => a.mae - b.mae || b.hit2 - a.hit2)[0]!.name;
}

export function buildPredictRows(
  events: ReturnType<typeof detectDips>,
  candles: Candle[],
  sma: Array<number | null>,
  atr: Array<number | null>,
  ema: Array<number | null>,
): PredictRow[] {
  const rows: PredictRow[] = [];
  for (const e of events) {
    if (!e.recovered || e.undershootAtr < MIN_SIGNAL_ATR) continue;
    const bar = candles[e.startIdx];
    const s = sma[e.startIdx];
    const a = atr[e.startIdx];
    const m = ema[e.startIdx];
    if (!bar || s == null || a == null || a <= 0) continue;
    rows.push({
      t: e.startT,
      depthMax: e.undershootAtr,
      depthFirst: Math.max(0, (s - bar.l) / a),
      emaUp: m != null && bar.c > m,
      bars: e.recoveryCandles,
      recovered: e.recovered,
      volRatio: e.volRatioTrough,
    });
  }
  return rows;
}

function fadeOf(run: {
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
}): FadeBook {
  return {
    n: run.n,
    expectancy: run.expectancy,
    winRate: run.winRate,
    stopShare: run.stopShare,
    compoundPct: run.compoundPct,
    firstE: run.firstE,
    secondE: run.secondE,
    nFirst: run.nFirst,
    nSecond: run.nSecond,
  };
}

export function fitSymbolPredict(input: {
  symbol: string;
  candles: Candle[];
  interval: Interval;
  days: number;
  source?: string;
}): SymbolPredict {
  const { symbol, candles, interval, days } = input;
  const source = input.source ?? "";
  const blankLive: LivePred = {
    last: candles.at(-1)?.c ?? NaN,
    sma: null,
    atr: null,
    below: false,
    depth: 0,
    emaUp: false,
    predBars: NaN,
    skip: false,
    model: "naive",
  };
  const base = (over: Partial<SymbolPredict> = {}): SymbolPredict => ({
    symbol,
    source,
    interval,
    days,
    candleCount: candles.length,
    nEvents: 0,
    nSignal: 0,
    recRate: NaN,
    nTrain: 0,
    nTest: 0,
    thin: true,
    p50DumpAtr: NaN,
    p50DumpAtrFirst: NaN,
    p50Bars: NaN,
    corrMax: NaN,
    corrFirst: NaN,
    models: [],
    winner: "naive",
    winnerMae: NaN,
    naiveMae: NaN,
    pooledMae: NaN,
    losoMae: NaN,
    btcMae: NaN,
    deltaVsNaive: NaN,
    deltaVsPooled: NaN,
    emaPeriod: PREDICT_EMA,
    fade: emptyFade(),
    live: blankLive,
    ...over,
  });

  if (candles.length < 80) return base({ error: "quá ít nến" });

  const closes = candles.map((c) => c.c);
  const sma = computeSma(closes, SMA_PERIOD);
  const sma50 = computeSma(closes, TREND_SMA_PERIOD);
  const atr = computeAtr(candles, ATR_PERIOD);
  const ema = computeEma(closes, PREDICT_EMA);
  const minutes = intervalMinutes(interval);
  const lookforward = Math.max(4, Math.round((LOOKFORWARD_HOURS * 60) / minutes));
  const events = detectDips(candles, sma, atr, sma50, lookforward, minutes);
  const rows = buildPredictRows(events, candles, sma, atr, ema);
  const { train, test } = splitRows(rows);
  const models = fitModels(train, test);
  const winner = pickWinner(models, Math.min(MIN_TEST, test.length));
  const win = models.find((m) => m.name === winner);
  const naive = models.find((m) => m.name === "naive");
  const olsMax = models.find((m) => m.name === "olsMax");

  const emaTune = runEmaTune({ candles, sma, atr, lookforward, intervalMin: minutes });
  const fadeRun = backtestFade({
    candles,
    sma,
    atr,
    smaTrend: ema,
    entryAtr: PREDICT_ENTRY_ATR,
    stopAtr: STOP_ATR,
    lookforward,
    intervalMin: minutes,
    uptrendOnly: true,
    trendFilter: "up",
    feeBps: FEE_BPS,
    skipVolMult: 0,
    requireVolMult: 0,
  });

  const last = candles[candles.length - 1]!;
  const lastSma = sma[sma.length - 1] ?? null;
  const lastAtr = atr[atr.length - 1] ?? null;
  const lastEma = ema[ema.length - 1] ?? null;
  const below = lastSma != null && last.l < lastSma;
  const depth =
    lastSma != null && lastAtr && lastAtr > 0 ? Math.max(0, (lastSma - last.l) / lastAtr) : 0;
  const emaUp = lastEma != null && last.c > lastEma;
  const liveModel = olsMax?.coefs && Number.isFinite(olsMax.coefs.depth) ? olsMax.coefs : null;
  const predBars = liveModel
    ? predictOls(liveModel, depth, emaUp)
    : quantile(train.map((r) => r.bars).slice().sort((a, b) => a - b), 0.5);
  const live: LivePred = {
    last: last.c,
    sma: lastSma,
    atr: lastAtr,
    below,
    depth,
    emaUp,
    predBars,
    skip: below && Number.isFinite(predBars) && predBars <= FORECAST_MIN_BARS,
    model: liveModel ? "olsMax" : "naive",
  };

  const recovered = events.filter((e) => e.recovered);
  return {
    symbol,
    source,
    interval,
    days,
    candleCount: candles.length,
    nEvents: events.length,
    nSignal: rows.length,
    recRate: events.length ? recovered.length / events.length : NaN,
    nTrain: train.length,
    nTest: test.length,
    thin: train.length < MIN_TRAIN || test.length < MIN_TEST,
    p50DumpAtr: quantile(rows.map((r) => r.depthMax).slice().sort((a, b) => a - b), 0.5),
    p50DumpAtrFirst: quantile(rows.map((r) => r.depthFirst).slice().sort((a, b) => a - b), 0.5),
    p50Bars: quantile(rows.map((r) => r.bars).slice().sort((a, b) => a - b), 0.5),
    corrMax: pearson(rows.map((r) => r.depthMax), rows.map((r) => r.bars)),
    corrFirst: pearson(rows.map((r) => r.depthFirst), rows.map((r) => r.bars)),
    models,
    winner,
    winnerMae: win?.mae ?? NaN,
    naiveMae: naive?.mae ?? NaN,
    pooledMae: NaN,
    losoMae: NaN,
    btcMae: NaN,
    deltaVsNaive: (naive?.mae ?? NaN) - (win?.mae ?? NaN),
    deltaVsPooled: NaN,
    emaPeriod: emaTune.winner,
    fade: fadeOf(fadeRun),
    live,
  };
}

type Packed = { report: SymbolPredict; train: PredictRow[]; test: PredictRow[] };

function olsMaxOf(rows: PredictRow[]): Coefs {
  if (rows.length < 8) return EMPTY_COEFS;
  const beta = fitOls(design(rows, "maxEma"), rows.map((r) => r.bars));
  return packCoefs(beta, "maxEma");
}

export function fitOlsMax(rows: PredictRow[]): Coefs {
  return olsMaxOf(rows);
}

export function scoreWithCoefs(coefs: Coefs, rows: PredictRow[]): Score {
  return scorePred(
    rows.map((r) => r.bars),
    predWith(coefs, rows),
  );
}

export function extractRows(candles: Candle[], interval: Interval, emaPeriod = PREDICT_EMA): PredictRow[] {
  if (candles.length < 80) return [];
  const closes = candles.map((c) => c.c);
  const sma = computeSma(closes, SMA_PERIOD);
  const sma50 = computeSma(closes, TREND_SMA_PERIOD);
  const atr = computeAtr(candles, ATR_PERIOD);
  const ema = computeEma(closes, emaPeriod);
  const minutes = intervalMinutes(interval);
  const lookforward = Math.max(4, Math.round((LOOKFORWARD_HOURS * 60) / minutes));
  const events = detectDips(candles, sma, atr, sma50, lookforward, minutes);
  return buildPredictRows(events, candles, sma, atr, ema);
}

function predWith(coefs: Coefs, rows: PredictRow[]): number[] {
  return rows.map((r) => predictOls(coefs, r.depthMax, r.emaUp, volFeat(r)));
}

export function assembleUniverse(
  packed: Packed[],
  interval: Interval,
  days: number,
): UniversePredict {
  const reports = packed.map((p) => p.report);
  const allTrain = packed.flatMap((p) => p.train);
  const pooled = olsMaxOf(allTrain);
  const btc = packed.find((p) => p.report.symbol === "BTCUSDT");
  const btcCoefs = btc ? olsMaxOf(btc.train) : EMPTY_COEFS;

  for (const p of packed) {
    const y = p.test.map((r) => r.bars);
    p.report.pooledMae = scorePred(y, predWith(pooled, p.test)).mae;
    const others = packed.filter((o) => o.report.symbol !== p.report.symbol).flatMap((o) => [...o.train, ...o.test]);
    const loso = olsMaxOf(others);
    p.report.losoMae = scorePred(y, predWith(loso, p.test)).mae;
    p.report.btcMae = btc && p.report.symbol !== "BTCUSDT"
      ? scorePred(y, predWith(btcCoefs, p.test)).mae
      : NaN;
    p.report.deltaVsPooled = p.report.pooledMae - p.report.winnerMae;
  }

  const meanOosMae: Record<string, number> = {};
  for (const name of MODEL_KINDS) {
    const xs = reports
      .map((r) => r.models.find((m) => m.name === name)?.mae)
      .filter((v): v is number => v != null && Number.isFinite(v));
    meanOosMae[name] = xs.length ? mean(xs) : NaN;
  }
  const winnerShare: Record<string, number> = {};
  for (const r of reports) {
    if (r.error) continue;
    winnerShare[r.winner] = (winnerShare[r.winner] ?? 0) + 1;
  }

  const ok = reports.filter((r) => !r.error && !r.thin);
  const per = mean(ok.map((r) => r.models.find((m) => m.name === "olsMax")?.mae).filter((v): v is number => v != null && Number.isFinite(v)));
  const pooledMae = mean(ok.map((r) => r.pooledMae).filter((v) => Number.isFinite(v)));
  const btcMae = mean(ok.filter((r) => r.symbol !== "BTCUSDT").map((r) => r.btcMae).filter((v) => Number.isFinite(v)));

  const fadeRank = reports
    .filter((r) => !r.error && r.fade.n >= 20 && Number.isFinite(r.fade.expectancy))
    .map((r) => ({ symbol: r.symbol, n: r.fade.n, expectancy: r.fade.expectancy, winRate: r.fade.winRate }))
    .sort((a, b) => b.expectancy - a.expectancy);

  const slopeRank = reports
    .filter((r) => !r.error)
    .map((r) => {
      const c = r.models.find((m) => m.name === "olsMax")?.coefs;
      return {
        symbol: r.symbol,
        slope: c?.depth ?? NaN,
        intercept: c?.intercept ?? NaN,
        ema: c?.ema ?? NaN,
      };
    })
    .filter((r) => Number.isFinite(r.slope));

  const perVsPooled = pooledMae - per;
  const perVsBtc = btcMae - per;
  let verdict: string;
  const gridMean = meanOosMae.gridMax;
  const olsMean = meanOosMae.olsMax;
  const firstMean = meanOosMae.olsFirst;
  const naiveMean = meanOosMae.naive;
  if (!Number.isFinite(olsMean) || !Number.isFinite(naiveMean)) {
    verdict = "Không đủ mẫu để kết luận.";
  } else if (olsMean + 0.2 >= naiveMean && gridMean + 0.2 >= naiveMean) {
    verdict = "Mô hình không thắng naive P50 — độ sâu/trend chưa dịch được sang OOS.";
  } else if (Number.isFinite(firstMean) && firstMean > olsMean + 0.4) {
    verdict =
      Number.isFinite(perVsPooled) && perVsPooled < 0.15
        ? "Dự đoán lúc live (độ sâu max-so-far) tốt hơn lúc vừa xuyên. Pooled đủ, không cần hệ số riêng từng cặp."
        : "Dự đoán lúc live (độ sâu max-so-far) tốt hơn lúc vừa xuyên. Hệ số từng cặp hơn pooled.";
  } else if (Number.isFinite(perVsPooled) && perVsPooled < 0.15) {
    verdict = "Pooled OLS (độ sâu + EMA14) đủ — hệ số từng cặp không hơn rõ trên OOS.";
  } else {
    verdict = "Hệ số từng cặp hơn pooled trên OOS — giữ mô hình riêng mỗi coin.";
  }

  return {
    interval,
    days,
    nSymbols: reports.length,
    nOk: reports.filter((r) => !r.error).length,
    models: reports,
    meanOosMae,
    winnerShare,
    pooledCoefs: pooled,
    perVsPooled,
    perVsBtc,
    fadeRank,
    slopeRank,
    verdict,
  };
}

export function fitPacked(input: {
  symbol: string;
  candles: Candle[];
  interval: Interval;
  days: number;
  source?: string;
}): Packed {
  const report = fitSymbolPredict(input);
  const closes = input.candles.map((c) => c.c);
  const sma = computeSma(closes, SMA_PERIOD);
  const sma50 = computeSma(closes, TREND_SMA_PERIOD);
  const atr = computeAtr(input.candles, ATR_PERIOD);
  const ema = computeEma(closes, PREDICT_EMA);
  const minutes = intervalMinutes(input.interval);
  const lookforward = Math.max(4, Math.round((LOOKFORWARD_HOURS * 60) / minutes));
  const events = detectDips(input.candles, sma, atr, sma50, lookforward, minutes);
  const rows = buildPredictRows(events, input.candles, sma, atr, ema);
  const split = splitRows(rows);
  return { report, train: split.train, test: split.test };
}
