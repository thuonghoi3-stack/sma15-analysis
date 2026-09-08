import { LOCKED_90 as LOCKED_RAW } from "./ols-locked.ts";
import { mean, pearson, stdev } from "./stats.ts";
import {
  fitOlsMax,
  scorePred,
  splitRows,
  type Coefs,
  type PredictRow,
  type Score,
} from "./predict.ts";
import { RECOVERY_DEPTHS, depthIndex } from "./recovery.ts";

/** Locked 90d pooled from the stability run. */
export const LOCKED_90: Coefs = LOCKED_RAW;

export type AcfPoint = { lag: number; rho: number };

export type ResidualSeries = {
  symbol: string;
  n: number;
  mean: number;
  std: number;
  dw: number;
  acf: AcfPoint[];
  lb: { h: number; q: number; p: number };
  acf1Close: number;
  nClose: number;
  corrAbsDepth: number;
};

export type DepthRes = {
  lo: number;
  hi: number | null;
  n: number;
  meanRes: number;
  mae: number;
};

export type ResidualReport = {
  locked: Coefs;
  fitted: Coefs;
  n: number;
  nSymbols: number;
  pooled: ResidualSeries;
  meanAcf1: number;
  meanDw: number;
  symbols: ResidualSeries[];
  byDepth: DepthRes[];
  byEma: { up: DepthRes; down: DepthRes };
  lag1: {
    rho: number;
    maeBase: number;
    maeRho: number;
    delta: number;
    nTest: number;
    base: Score;
    rhoScore: Score;
  };
  grade: "clean" | "weak-ac" | "strong-ac";
  verdict: string;
};

export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** P(chi^2_df > q), Wilson–Hilferty. */
export function chi2Sf(q: number, df: number): number {
  if (!Number.isFinite(q) || !Number.isFinite(df) || df <= 0) return NaN;
  if (q <= 0) return 1;
  const mu = 1 - 2 / (9 * df);
  const sigma = Math.sqrt(2 / (9 * df));
  const z = (Math.pow(q / df, 1 / 3) - mu) / sigma;
  return 1 - normalCdf(z);
}

export function acf(xs: number[], maxLag: number): number[] {
  const n = xs.length;
  const out = Array.from({ length: maxLag + 1 }, () => NaN);
  if (n < 4) return out;
  const mu = mean(xs);
  let v0 = 0;
  for (const x of xs) {
    const d = x - mu;
    v0 += d * d;
  }
  if (v0 === 0) return out;
  out[0] = 1;
  for (let k = 1; k <= maxLag; k++) {
    let c = 0;
    for (let t = k; t < n; t++) c += (xs[t]! - mu) * (xs[t - k]! - mu);
    out[k] = c / v0;
  }
  return out;
}

export function durbinWatson(xs: number[]): number {
  if (xs.length < 3) return NaN;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    const e = xs[i]!;
    den += e * e;
    if (i > 0) {
      const d = e - xs[i - 1]!;
      num += d * d;
    }
  }
  return den === 0 ? NaN : num / den;
}

export function ljungBox(xs: number[], h: number): { h: number; q: number; p: number } {
  const n = xs.length;
  if (n < h + 5) return { h, q: NaN, p: NaN };
  const rhos = acf(xs, h);
  let s = 0;
  for (let k = 1; k <= h; k++) {
    const r = rhos[k]!;
    if (!Number.isFinite(r)) continue;
    s += (r * r) / (n - k);
  }
  const q = n * (n + 2) * s;
  return { h, q, p: chi2Sf(q, h) };
}

export function fittedLinear(coefs: Coefs, r: PredictRow): number {
  return coefs.intercept + coefs.depth * r.depthMax + coefs.ema * (r.emaUp ? 1 : 0);
}

export function residualOf(coefs: Coefs, r: PredictRow): number {
  return r.bars - fittedLinear(coefs, r);
}

function closeAcf1(rows: PredictRow[], e: number[], maxDt: number): { rho: number; n: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const dt = rows[i]!.t - rows[i - 1]!.t;
    if (dt > 0 && dt <= maxDt) {
      xs.push(e[i - 1]!);
      ys.push(e[i]!);
    }
  }
  return { rho: pearson(xs, ys), n: xs.length };
}

function summarizeDepth(rows: PredictRow[], e: number[]): DepthRes[] {
  const out: DepthRes[] = [];
  for (let i = 0; i < RECOVERY_DEPTHS.length; i++) {
    const lo = RECOVERY_DEPTHS[i]!;
    const hi = RECOVERY_DEPTHS[i + 1] ?? null;
    const idx: number[] = [];
    for (let j = 0; j < rows.length; j++) {
      if (depthIndex(rows[j]!.depthMax) === i) idx.push(j);
    }
    const res = idx.map((j) => e[j]!);
    const abs = res.map((v) => Math.abs(v));
    out.push({
      lo,
      hi,
      n: res.length,
      meanRes: mean(res),
      mae: mean(abs),
    });
  }
  return out;
}

function side(rows: PredictRow[], e: number[], emaUp: boolean): DepthRes {
  const res: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.emaUp === emaUp) res.push(e[i]!);
  }
  return {
    lo: emaUp ? 1 : 0,
    hi: null,
    n: res.length,
    meanRes: mean(res),
    mae: mean(res.map((v) => Math.abs(v))),
  };
}

export function seriesOf(
  symbol: string,
  rows: PredictRow[],
  coefs: Coefs,
  maxLag = 10,
  closeMs = 60 * 60 * 1000,
): ResidualSeries {
  const sorted = rows.slice().sort((a, b) => a.t - b.t);
  const e = sorted.map((r) => residualOf(coefs, r));
  const rhos = acf(e, maxLag);
  const close = closeAcf1(sorted, e, closeMs);
  const abs = e.map((v) => Math.abs(v));
  return {
    symbol,
    n: e.length,
    mean: mean(e),
    std: stdev(e),
    dw: durbinWatson(e),
    acf: rhos.slice(1).map((rho, i) => ({ lag: i + 1, rho })),
    lb: ljungBox(e, Math.min(maxLag, 10)),
    acf1Close: close.rho,
    nClose: close.n,
    corrAbsDepth: pearson(abs, sorted.map((r) => r.depthMax)),
  };
}

function lag1Oos(
  tagged: { symbol: string; rows: PredictRow[] }[],
  coefs: Coefs,
): ResidualReport["lag1"] {
  const empty = {
    rho: NaN,
    maeBase: NaN,
    maeRho: NaN,
    delta: NaN,
    nTest: 0,
    base: scorePred([], []),
    rhoScore: scorePred([], []),
  };
  const prev: number[] = [];
  const next: number[] = [];
  const actual: number[] = [];
  const basePred: number[] = [];
  const rhoPredHold: { yhat: number; prevE: number }[] = [];
  for (const s of tagged) {
    const sorted = s.rows.slice().sort((a, b) => a.t - b.t);
    const { train, test } = splitRows(sorted);
    if (train.length < 20 || test.length < 8) continue;
    const eTrain = train.map((r) => residualOf(coefs, r));
    for (let i = 1; i < eTrain.length; i++) {
      prev.push(eTrain[i - 1]!);
      next.push(eTrain[i]!);
    }
    const all = [...train, ...test];
    const eAll = all.map((r) => residualOf(coefs, r));
    for (let i = train.length; i < all.length; i++) {
      const r = all[i]!;
      const yhat = fittedLinear(coefs, r);
      actual.push(r.bars);
      basePred.push(yhat);
      rhoPredHold.push({ yhat, prevE: eAll[i - 1]! });
    }
  }
  if (actual.length < 20 || prev.length < 20) return empty;
  const rho = pearson(prev, next);
  const rhoPred = rhoPredHold.map((p) => p.yhat + (Number.isFinite(rho) ? rho * p.prevE : 0));
  const base = scorePred(actual, basePred);
  const rhoScore = scorePred(actual, rhoPred);
  return {
    rho,
    maeBase: base.mae,
    maeRho: rhoScore.mae,
    delta: base.mae - rhoScore.mae,
    nTest: actual.length,
    base,
    rhoScore,
  };
}

function gradeOf(meanAcf1: number, meanDw: number, lagDelta: number): "clean" | "weak-ac" | "strong-ac" {
  const a = Math.abs(meanAcf1);
  if (a >= 0.2 || meanDw < 1.5 || meanDw > 2.5) return "strong-ac";
  if (a >= 0.08 || Math.abs(meanDw - 2) > 0.25 || lagDelta > 0.15) return "weak-ac";
  return "clean";
}

function verdictOf(
  grade: "clean" | "weak-ac" | "strong-ac",
  meanAcf1: number,
  meanDw: number,
  lag: ResidualReport["lag1"],
  corrAbs: number,
): string {
  const ac = `ACF1 trung bình ${meanAcf1.toFixed(3)}, DW ${meanDw.toFixed(2)}.`;
  const rhoTxt = Number.isFinite(lag.delta)
    ? ` Sửa ρ=${lag.rho.toFixed(2)} đổi MAE ${lag.delta >= 0 ? "−" : "+"}${Math.abs(lag.delta).toFixed(3)} nến OOS.`
    : "";
  const het = Number.isFinite(corrAbs)
    ? ` |e| vs độ sâu r=${corrAbs.toFixed(2)}${corrAbs > 0.25 ? " — phương sai nở theo dump." : "."}`
    : "";
  if (grade === "clean") {
    return `Residual gần white noise. OLS không bị bias bởi autocorrelation. ${ac}${rhoTxt}${het}`;
  }
  if (grade === "weak-ac") {
    return `Có autocorrelation yếu — hệ số vẫn nhất quán, sai số chuẩn hơi hẹp. Không cần AR trong pred. ${ac}${rhoTxt}${het}`;
  }
  return `Autocorrelation mạnh. Nhịp sập kế tiếp không độc lập — đừng tin p-value OLS. Cân nhắc Cochrane–Orcutt. ${ac}${rhoTxt}${het}`;
}

export function assembleResiduals(input: {
  symbols: { symbol: string; rows: PredictRow[] }[];
  locked?: Coefs;
}): ResidualReport {
  const locked = input.locked ?? LOCKED_90;
  const tagged = input.symbols
    .map((s) => ({ symbol: s.symbol, rows: s.rows.slice().sort((a, b) => a.t - b.t) }))
    .filter((s) => s.rows.length >= 20);
  const all = tagged.flatMap((s) => s.rows);
  const fitted = fitOlsMax(all);
  const per = tagged.map((s) => seriesOf(s.symbol, s.rows, locked));
  const acf1s = per.map((p) => p.acf[0]?.rho).filter((v): v is number => v != null && Number.isFinite(v));
  const dws = per.map((p) => p.dw).filter((v) => Number.isFinite(v));
  const meanAcf1 = mean(acf1s);
  const meanDw = mean(dws);
  const pooled = seriesOf("POOLED", all, locked);
  const eAll = all.map((r) => residualOf(locked, r));
  const lag1 = lag1Oos(tagged, locked);
  const corrAbs = pooled.corrAbsDepth;
  const grade = gradeOf(meanAcf1, meanDw, lag1.delta);
  return {
    locked,
    fitted,
    n: all.length,
    nSymbols: tagged.length,
    pooled,
    meanAcf1,
    meanDw,
    symbols: per,
    byDepth: summarizeDepth(all, eAll),
    byEma: { up: side(all, eAll, true), down: side(all, eAll, false) },
    lag1,
    grade,
    verdict: verdictOf(grade, meanAcf1, meanDw, lag1, corrAbs),
  };
}
