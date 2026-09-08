import { mean, pearson, quantile, stdev } from "./stats.ts";
import { fitOls, scorePred, splitRows, type Coefs, type PredictRow } from "./predict.ts";
import { chi2Sf, fittedLinear, LOCKED_90, residualOf } from "./residuals.ts";
import { depthIndex, RECOVERY_DEPTHS } from "./recovery.ts";

export type LmTest = {
  name: string;
  n: number;
  r2: number;
  lm: number;
  df: number;
  p: number;
};

export type ScaleFit = {
  name: "sqrt-mu" | "depth" | "depth2" | "power";
  gamma: number;
  corrAbs: number;
  bpP: number;
};

export type MeanFit = {
  name: "ols" | "wls" | "quad";
  intercept: number;
  depth: number;
  depth2: number;
  ema: number;
  maeOos: number;
  meanResByDepth: number[];
};

export type HeteroBin = {
  lo: number;
  hi: number | null;
  n: number;
  meanBars: number;
  stdBars: number;
  meanFit: number;
  meanRes: number;
  stdRes: number;
  mae: number;
  p50Abs: number;
  p75Abs: number;
  p90Abs: number;
  shareFloor: number;
  slack: number;
};

export type HeteroReport = {
  n: number;
  nSymbols: number;
  locked: Coefs;
  corrAbsDepth: number;
  corrAbsFitted: number;
  corrSqDepth: number;
  bp: LmTest;
  white: LmTest;
  gq: { nLow: number; nHigh: number; varLow: number; varHigh: number; ratio: number; meanRatio: number; sqMeanRatio: number };
  gamma: number;
  gammaIntercept: number;
  scales: ScaleFit[];
  bestScale: ScaleFit["name"];
  means: MeanFit[];
  bins: HeteroBin[];
  floorShare: number;
  corrAbsDepthNoFloor: number;
  oos: { ols: number; wls: number; quad: number; nTest: number };
  grade: "count" | "multiplicative" | "mean-misspec" | "mixed";
  verdict: string;
};

export function r2Of(y: number[], yhat: number[]): number {
  const n = Math.min(y.length, yhat.length);
  if (n < 3) return NaN;
  const mu = mean(y.slice(0, n));
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const e = y[i]! - yhat[i]!;
    ssRes += e * e;
    const d = y[i]! - mu;
    ssTot += d * d;
  }
  return ssTot === 0 ? NaN : 1 - ssRes / ssTot;
}

export function fitWls(X: number[][], y: number[], w: number[]): number[] {
  const Xs = X.map((row, i) => {
    const s = Math.sqrt(Math.max(w[i]!, 1e-9));
    return row.map((v) => v * s);
  });
  const ys = y.map((v, i) => v * Math.sqrt(Math.max(w[i]!, 1e-9)));
  return fitOls(Xs, ys);
}

function applyBeta(beta: number[], X: number[][]): number[] {
  return X.map((row) => {
    let s = 0;
    for (let i = 0; i < row.length; i++) s += (beta[i] ?? 0) * row[i]!;
    return s;
  });
}

function dropDegenerate(Z: number[][]): number[][] {
  if (Z.length === 0) return Z;
  const k = Z[0]!.length;
  const keep: number[] = [0];
  for (let c = 1; c < k; c++) {
    const col = Z.map((r) => r[c]!);
    if (stdev(col) > 1e-12) keep.push(c);
  }
  return Z.map((r) => keep.map((i) => r[i]!));
}

function lmTest(name: string, e2: number[], Zraw: number[][]): LmTest {
  const Z = dropDegenerate(Zraw);
  const beta = fitOls(Z, e2);
  const yhat = applyBeta(beta, Z);
  const r2 = r2Of(e2, yhat);
  const n = e2.length;
  const df = Math.max(1, (Z[0]?.length ?? 1) - 1);
  const lm = n * r2;
  return { name, n, r2, lm, df, p: chi2Sf(lm, df) };
}

export function breuschPagan(e: number[], depth: number[], ema: number[]): LmTest {
  const e2 = e.map((v) => v * v);
  const Z = depth.map((d, i) => [1, d, ema[i]!]);
  return lmTest("Breusch-Pagan", e2, Z);
}

export function whiteTest(e: number[], depth: number[], ema: number[]): LmTest {
  const e2 = e.map((v) => v * v);
  const Z = depth.map((d, i) => {
    const u = ema[i]!;
    return [1, d, d * d, u, d * u];
  });
  return lmTest("White", e2, Z);
}

function logDepth(d: number): number {
  return Math.log(Math.max(d, 0.25));
}

export function fitGamma(e: number[], depth: number[]): { gamma: number; intercept: number } {
  const y = e.map((v) => Math.log(Math.abs(v) + 0.25));
  const X = depth.map((d) => [1, logDepth(d)]);
  const beta = fitOls(X, y);
  return { intercept: beta[0] ?? NaN, gamma: beta[1] ?? NaN };
}

function studentize(e: number[], sigma: number[]): number[] {
  return e.map((v, i) => v / Math.max(sigma[i]!, 0.2));
}

function scaleSigma(name: ScaleFit["name"], depth: number, fitted: number, gamma: number): number {
  const d = Math.max(depth, 0.25);
  const mu = Math.max(fitted, 1);
  if (name === "sqrt-mu") return Math.sqrt(mu);
  if (name === "depth") return Math.sqrt(d);
  if (name === "depth2") return d;
  return Math.pow(d, Math.max(0.05, gamma));
}

function binOf(rows: PredictRow[], e: number[], fit: number[]): HeteroBin[] {
  const out: HeteroBin[] = [];
  for (let i = 0; i < RECOVERY_DEPTHS.length; i++) {
    const idx: number[] = [];
    for (let j = 0; j < rows.length; j++) {
      if (depthIndex(rows[j]!.depthMax) === i) idx.push(j);
    }
    const bars = idx.map((j) => rows[j]!.bars);
    const res = idx.map((j) => e[j]!);
    const fits = idx.map((j) => fit[j]!);
    const abs = res.map((v) => Math.abs(v)).slice().sort((a, b) => a - b);
    const p75 = quantile(abs, 0.75);
    out.push({
      lo: RECOVERY_DEPTHS[i]!,
      hi: RECOVERY_DEPTHS[i + 1] ?? null,
      n: idx.length,
      meanBars: mean(bars),
      stdBars: stdev(bars),
      meanFit: mean(fits),
      meanRes: mean(res),
      stdRes: stdev(res),
      mae: mean(abs),
      p50Abs: quantile(abs, 0.5),
      p75Abs: p75,
      p90Abs: quantile(abs, 0.9),
      shareFloor: bars.length ? bars.filter((b) => b <= 1).length / bars.length : NaN,
      slack: Number.isFinite(p75) ? Math.max(1, Math.round(p75)) : NaN,
    });
  }
  return out;
}

function meanResBuckets(rows: PredictRow[], pred: number[]): number[] {
  const e = rows.map((r, i) => r.bars - pred[i]!);
  return RECOVERY_DEPTHS.map((_, i) => {
    const xs: number[] = [];
    for (let j = 0; j < rows.length; j++) {
      if (depthIndex(rows[j]!.depthMax) === i) xs.push(e[j]!);
    }
    return mean(xs);
  });
}

function oosMeans(rows: PredictRow[]): HeteroReport["oos"] & { fits: MeanFit[] } {
  const sorted = rows.slice().sort((a, b) => a.t - b.t);
  const { train, test } = splitRows(sorted);
  const xLin = (rs: PredictRow[]) => rs.map((r) => [1, r.depthMax, r.emaUp ? 1 : 0]);
  const xQuad = (rs: PredictRow[]) => rs.map((r) => [1, r.depthMax, r.depthMax * r.depthMax, r.emaUp ? 1 : 0]);
  const yTr = train.map((r) => r.bars);
  const olsB = fitOls(xLin(train), yTr);
  const g = fitGamma(
    train.map((r, i) => r.bars - (olsB[0]! + olsB[1]! * r.depthMax + olsB[2]! * (r.emaUp ? 1 : 0))),
    train.map((r) => r.depthMax),
  );
  const w = train.map((r) => 1 / Math.pow(Math.max(r.depthMax, 0.25), 2 * Math.max(0.2, g.gamma)));
  const wlsB = fitWls(xLin(train), yTr, w);
  const quadB = fitOls(xQuad(train), yTr);

  const predOls = test.map((r) => olsB[0]! + olsB[1]! * r.depthMax + olsB[2]! * (r.emaUp ? 1 : 0));
  const predWls = test.map((r) => wlsB[0]! + wlsB[1]! * r.depthMax + wlsB[2]! * (r.emaUp ? 1 : 0));
  const predQuad = test.map((r) => quadB[0]! + quadB[1]! * r.depthMax + quadB[2]! * r.depthMax * r.depthMax + quadB[3]! * (r.emaUp ? 1 : 0));
  const y = test.map((r) => r.bars);
  const pack = (name: MeanFit["name"], beta: number[], predAll: (rs: PredictRow[]) => number[]): MeanFit => {
    const p = predAll(rows);
    return {
      name,
      intercept: beta[0] ?? NaN,
      depth: beta[1] ?? NaN,
      depth2: name === "quad" ? (beta[2] ?? 0) : 0,
      ema: name === "quad" ? (beta[3] ?? 0) : (beta[2] ?? 0),
      maeOos: NaN,
      meanResByDepth: meanResBuckets(rows, p),
    };
  };
  const fits: MeanFit[] = [
    { ...pack("ols", olsB, (rs) => rs.map((r) => olsB[0]! + olsB[1]! * r.depthMax + olsB[2]! * (r.emaUp ? 1 : 0))), maeOos: scorePred(y, predOls).mae },
    { ...pack("wls", wlsB, (rs) => rs.map((r) => wlsB[0]! + wlsB[1]! * r.depthMax + wlsB[2]! * (r.emaUp ? 1 : 0))), maeOos: scorePred(y, predWls).mae },
    { ...pack("quad", quadB, (rs) => rs.map((r) => quadB[0]! + quadB[1]! * r.depthMax + quadB[2]! * r.depthMax * r.depthMax + quadB[3]! * (r.emaUp ? 1 : 0))), maeOos: scorePred(y, predQuad).mae },
  ];
  return {
    ols: fits[0]!.maeOos,
    wls: fits[1]!.maeOos,
    quad: fits[2]!.maeOos,
    nTest: test.length,
    fits,
  };
}

function gradeOf(gamma: number, scales: ScaleFit[], means: MeanFit[], corrNoFloor: number): HeteroReport["grade"] {
  const best = scales.slice().sort((a, b) => Math.abs(a.corrAbs) - Math.abs(b.corrAbs))[0];
  const olsU = means.find((m) => m.name === "ols")?.meanResByDepth ?? [];
  const quadU = means.find((m) => m.name === "quad")?.meanResByDepth ?? [];
  const olsAbs = mean(olsU.map(Math.abs));
  const quadAbs = mean(quadU.map(Math.abs));
  const meanFixed = quadAbs + 0.15 < olsAbs;
  if (meanFixed && corrNoFloor > 0.25) return "mean-misspec";
  if (best?.name === "sqrt-mu" || (gamma >= 0.35 && gamma <= 0.7)) return "count";
  if (best?.name === "depth2" || gamma >= 0.85) return "multiplicative";
  return "mixed";
}

function verdictOf(report: Omit<HeteroReport, "verdict">): string {
  const g = report.gamma;
  const slack = report.bins
    .filter((b) => b.n >= 30)
    .map((b) => {
      const hi = b.hi == null ? `${b.lo}×+` : `${b.lo}–${b.hi}×`;
      return `${hi} ±${b.slack}`;
    })
    .join(", ");
  if (report.grade === "count") {
    return `Phương sai kiểu count: σ ≈ k·√μ, γ=${g.toFixed(2)}. OLS mean ổn; WLS không sửa điểm dự đoán. Slack TP theo độ sâu: ${slack}.`;
  }
  if (report.grade === "multiplicative") {
    return `Nhiễu nhân: σ ≈ k·độ sâu, γ=${g.toFixed(2)}. Cân WLS/log. Slack: ${slack}.`;
  }
  if (report.grade === "mean-misspec") {
    return `U-shape mean là sai dạng (thiếu depth²), hetero còn lại sau khi bỏ nến sàn. Slack: ${slack}.`;
  }
  return `Hetero hỗn hợp γ=${g.toFixed(2)}. Giữ OLS điểm, đổi khoảng theo độ sâu: ${slack}.`;
}

export function assembleHetero(input: {
  symbols: { symbol: string; rows: PredictRow[] }[];
  locked?: Coefs;
}): HeteroReport {
  const locked = input.locked ?? LOCKED_90;
  const rows = input.symbols.flatMap((s) => s.rows).sort((a, b) => a.t - b.t);
  const e = rows.map((r) => residualOf(locked, r));
  const fit = rows.map((r) => fittedLinear(locked, r));
  const depth = rows.map((r) => r.depthMax);
  const ema = rows.map((r) => (r.emaUp ? 1 : 0));
  const abs = e.map((v) => Math.abs(v));
  const e2 = e.map((v) => v * v);
  const bp = breuschPagan(e, depth, ema);
  const white = whiteTest(e, depth, ema);
  const g = fitGamma(e, depth);

  const sortedIdx = depth.map((d, i) => i).sort((a, b) => depth[a]! - depth[b]!);
  const cut = Math.floor(sortedIdx.length * 0.4);
  const low = sortedIdx.slice(0, cut);
  const high = sortedIdx.slice(sortedIdx.length - cut);
  const varOf = (idx: number[]) => {
    const xs = idx.map((i) => e[i]!);
    const s = stdev(xs);
    return s * s;
  };
  const meanOf = (idx: number[]) => mean(idx.map((i) => rows[i]!.bars));
  const gq = {
    nLow: low.length,
    nHigh: high.length,
    varLow: varOf(low),
    varHigh: varOf(high),
    ratio: varOf(high) / varOf(low),
    meanRatio: meanOf(high) / meanOf(low),
    sqMeanRatio: (meanOf(high) / meanOf(low)) ** 2,
  };

  const scaleNames: ScaleFit["name"][] = ["sqrt-mu", "depth", "depth2", "power"];
  const scales: ScaleFit[] = scaleNames.map((name) => {
    const sig = rows.map((r, i) => scaleSigma(name, r.depthMax, fit[i]!, g.gamma));
    const st = studentize(e, sig);
    const stAbs = st.map((v) => Math.abs(v));
    const bpSt = breuschPagan(st, depth, ema);
    return { name, gamma: name === "power" ? g.gamma : name === "sqrt-mu" || name === "depth" ? 0.5 : 1, corrAbs: pearson(stAbs, depth), bpP: bpSt.p };
  });
  const bestScale = scales.slice().sort((a, b) => Math.abs(a.corrAbs) - Math.abs(b.corrAbs))[0]!.name;

  const oos = oosMeans(rows);
  const noFloor = rows
    .map((r, i) => ({ r, e: e[i]! }))
    .filter((x) => x.r.bars > 1);
  const corrAbsDepthNoFloor = pearson(
    noFloor.map((x) => Math.abs(x.e)),
    noFloor.map((x) => x.r.depthMax),
  );

  const base = {
    n: rows.length,
    nSymbols: input.symbols.length,
    locked,
    corrAbsDepth: pearson(abs, depth),
    corrAbsFitted: pearson(abs, fit),
    corrSqDepth: pearson(e2, depth),
    bp,
    white,
    gq,
    gamma: g.gamma,
    gammaIntercept: g.intercept,
    scales,
    bestScale,
    means: oos.fits,
    bins: binOf(rows, e, fit),
    floorShare: rows.length ? rows.filter((r) => r.bars <= 1).length / rows.length : NaN,
    corrAbsDepthNoFloor,
    oos: { ols: oos.ols, wls: oos.wls, quad: oos.quad, nTest: oos.nTest },
    grade: "mixed" as HeteroReport["grade"],
  };
  const grade = gradeOf(g.gamma, scales, oos.fits, corrAbsDepthNoFloor);
  const report = { ...base, grade, verdict: "" };
  report.verdict = verdictOf(report);
  return report;
}
