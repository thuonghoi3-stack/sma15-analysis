import { fitWls } from "./hetero.ts";
import {
  clampBars,
  fitOls,
  scorePred,
  type Coefs,
  type PredictRow,
  type Score,
} from "./predict.ts";
import { LOCKED_90 } from "./residuals.ts";
import { FORECAST_MIN_BARS, SCAN_ENTRY_HI, SCAN_ENTRY_LO } from "./symbols.ts";

export type OlsKind = "linear" | "log" | "sqrt" | "quad";

export type OlsSpecScore = {
  name: string;
  label: string;
  kind: OlsKind;
  coefs: Coefs;
  depth2: number;
  nTrain: number;
  nTest: number;
  nEntry: number;
  train: Score;
  test: Score;
  entry: Score;
  emaUp: Score;
};

export type OlsTuneReport = {
  n: number;
  nTrain: number;
  nTest: number;
  nEntry: number;
  specs: OlsSpecScore[];
  winner: string;
  lockedMae: number;
  winnerMae: number;
  delta: number;
  best: Coefs;
  bestKind: OlsKind;
  grade: "keep" | "replace";
  verdict: string;
};

function vol(r: PredictRow): number {
  return Number.isFinite(r.volRatio) ? Math.min(6, Math.max(0, r.volRatio)) : 1;
}

function depthOf(r: PredictRow, winsor: number | null): number {
  const d = r.depthMax;
  if (winsor == null) return d;
  return Math.min(d, winsor);
}

function designOf(
  rows: PredictRow[],
  kind: OlsKind,
  opts: { ema: boolean; vol: boolean; intercept: boolean; winsor: number | null; first: boolean },
): number[][] {
  return rows.map((r) => {
    const raw = opts.first ? r.depthFirst : r.depthMax;
    const d = opts.winsor == null ? raw : Math.min(raw, opts.winsor);
    const e = r.emaUp ? 1 : 0;
    const x: number[] = [];
    if (opts.intercept) x.push(1);
    if (kind === "log") x.push(Math.log(Math.max(d, 0.25)));
    else if (kind === "sqrt") x.push(Math.sqrt(Math.max(d, 0)));
    else x.push(d);
    if (kind === "quad") x.push(d * d);
    if (opts.ema) x.push(e);
    if (opts.vol) x.push(vol(r));
    return x;
  });
}

function pack(
  beta: number[],
  kind: OlsKind,
  opts: { ema: boolean; vol: boolean; intercept: boolean },
): { coefs: Coefs; depth2: number } {
  let i = 0;
  const intercept = opts.intercept ? (beta[i++] ?? 0) : 0;
  const depth = beta[i++] ?? NaN;
  const depth2 = kind === "quad" ? (beta[i++] ?? 0) : 0;
  const ema = opts.ema ? (beta[i++] ?? 0) : 0;
  const v = opts.vol ? (beta[i++] ?? 0) : 0;
  return { coefs: { intercept, depth, ema, vol: v }, depth2 };
}

export function predSpec(input: {
  kind: OlsKind;
  coefs: Coefs;
  depth2?: number;
  row: PredictRow;
  winsor?: number | null;
  first?: boolean;
}): number {
  const d0 = input.first ? input.row.depthFirst : input.row.depthMax;
  const d = input.winsor == null ? d0 : Math.min(d0, input.winsor);
  const e = input.row.emaUp ? 1 : 0;
  let y = input.coefs.intercept + input.coefs.ema * e + input.coefs.vol * vol(input.row);
  if (input.kind === "log") y += input.coefs.depth * Math.log(Math.max(d, 0.25));
  else if (input.kind === "sqrt") y += input.coefs.depth * Math.sqrt(Math.max(d, 0));
  else y += input.coefs.depth * d;
  if (input.kind === "quad") y += (input.depth2 ?? 0) * d * d;
  return clampBars(y);
}

export function fitLad(X: number[][], y: number[], iters = 25): number[] {
  let w = y.map(() => 1);
  let beta = fitWls(X, y, w);
  for (let k = 0; k < iters; k++) {
    beta = fitWls(X, y, w);
    w = X.map((row, i) => {
      let yhat = 0;
      for (let j = 0; j < row.length; j++) yhat += (beta[j] ?? 0) * row[j]!;
      return 1 / Math.max(Math.abs(y[i]! - yhat), 0.25);
    });
  }
  return beta;
}

function splitTime(rows: PredictRow[], frac = 2 / 3): { train: PredictRow[]; test: PredictRow[] } {
  const sorted = rows.slice().sort((a, b) => a.t - b.t);
  if (sorted.length === 0) return { train: [], test: [] };
  const from = sorted[0]!.t;
  const to = sorted[sorted.length - 1]!.t;
  const cut = from + frac * (to - from);
  return {
    train: sorted.filter((r) => r.t < cut),
    test: sorted.filter((r) => r.t >= cut),
  };
}

function inEntry(r: PredictRow): boolean {
  return r.emaUp && r.depthMax >= SCAN_ENTRY_LO && r.depthMax <= SCAN_ENTRY_HI;
}

function scoreRows(
  rows: PredictRow[],
  kind: OlsKind,
  coefs: Coefs,
  depth2: number,
  winsor: number | null,
  first: boolean,
): Score {
  return scorePred(
    rows.map((r) => r.bars),
    rows.map((r) => predSpec({ kind, coefs, depth2, row: r, winsor, first })),
  );
}

type FitOpts = {
  kind: OlsKind;
  ema: boolean;
  vol: boolean;
  intercept: boolean;
  winsor: number | null;
  first: boolean;
  loss: "ols" | "wls" | "lad";
  gamma?: number;
  trainFilter?: (r: PredictRow) => boolean;
};

function emaVaries(rows: PredictRow[]): boolean {
  return rows.some((r) => r.emaUp) && rows.some((r) => !r.emaUp);
}

function volVaries(rows: PredictRow[]): boolean {
  const xs = rows.map(vol);
  const mu = xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  let s = 0;
  for (const x of xs) s += (x - mu) * (x - mu);
  return s > 1e-6;
}

function fitSpec(train: PredictRow[], opts: FitOpts): { coefs: Coefs; depth2: number } {
  const src = opts.trainFilter ? train.filter(opts.trainFilter) : train;
  const use = {
    ...opts,
    ema: opts.ema && emaVaries(src),
    vol: opts.vol && volVaries(src),
  };
  const X = designOf(src, use.kind, use);
  const y = src.map((r) => r.bars);
  if (src.length < (X[0]?.length ?? 1) + 4) {
    return { coefs: { intercept: 0, depth: 4.7, ema: 0, vol: 0 }, depth2: 0 };
  }
  let beta: number[];
  if (use.loss === "wls") {
    const g = use.gamma ?? 1;
    const w = src.map((r) => 1 / Math.pow(Math.max(depthOf(r, use.winsor), 0.25), 2 * g));
    beta = fitWls(X, y, w);
  } else if (use.loss === "lad") {
    beta = fitLad(X, y);
  } else {
    beta = fitOls(X, y);
  }
  return pack(beta, use.kind, use);
}

function evalSpec(input: {
  name: string;
  label: string;
  train: PredictRow[];
  test: PredictRow[];
  opts: FitOpts;
  locked?: { coefs: Coefs; kind: OlsKind };
}): OlsSpecScore {
  const fitted = input.locked ?? fitSpec(input.train, input.opts);
  const { kind } = input.opts;
  const winsor = input.opts.winsor;
  const first = input.opts.first;
  const entry = input.test.filter(inEntry);
  const emaUp = input.test.filter((r) => r.emaUp);
  return {
    name: input.name,
    label: input.label,
    kind,
    coefs: fitted.coefs,
    depth2: fitted.depth2,
    nTrain: input.train.length,
    nTest: input.test.length,
    nEntry: entry.length,
    train: scoreRows(input.train, kind, fitted.coefs, fitted.depth2, winsor, first),
    test: scoreRows(input.test, kind, fitted.coefs, fitted.depth2, winsor, first),
    entry: scoreRows(entry, kind, fitted.coefs, fitted.depth2, winsor, first),
    emaUp: scoreRows(emaUp, kind, fitted.coefs, fitted.depth2, winsor, first),
  };
}

function gridSearch(train: PredictRow[], test: PredictRow[]): OlsSpecScore {
  const ints = [-0.6, -0.3, 0, 0.3];
  const depths = [4.2, 4.5, 4.7, 5.0, 5.4];
  const emas = [0, -0.35, -0.7, -1.1];
  let best: Coefs = { intercept: -0.3, depth: 4.7, ema: -0.35, vol: 0 };
  let bestMae = Infinity;
  for (const intercept of ints) {
    for (const depth of depths) {
      for (const ema of emas) {
        const coefs = { intercept, depth, ema, vol: 0 };
        const mae = scoreRows(train, "linear", coefs, 0, null, false).mae;
        if (mae < bestMae) {
          bestMae = mae;
          best = coefs;
        }
      }
    }
  }
  return evalSpec({
    name: "gridMae",
    label: "Lưới MAE (train)",
    train,
    test,
    opts: { kind: "linear", ema: true, vol: false, intercept: true, winsor: null, first: false, loss: "ols" },
    locked: { coefs: best, kind: "linear" },
  });
}

function pickWinner(specs: OlsSpecScore[], lockedMae: number): { winner: string; grade: "keep" | "replace" } {
  const ok = specs.filter((s) => Number.isFinite(s.entry.mae) && s.nEntry >= 30);
  const pool = ok.length ? ok : specs.filter((s) => Number.isFinite(s.test.mae));
  let best = pool[0]!;
  for (const s of pool) {
    const a = s.entry.mae;
    const b = best.entry.mae;
    if (a + 1e-9 < b) best = s;
    else if (Math.abs(a - b) < 0.02 && s.test.mae < best.test.mae) best = s;
  }
  const grade = best.name !== "locked" && lockedMae - best.entry.mae >= 0.08 ? "replace" : "keep";
  return { winner: best.name, grade };
}

export function assembleOlsTune(rows: PredictRow[], locked: Coefs = LOCKED_90): OlsTuneReport {
  const { train, test } = splitTime(rows);
  const baseOpts = {
    ema: true,
    vol: false,
    intercept: true,
    winsor: null as number | null,
    first: false,
    loss: "ols" as const,
  };
  const specs: OlsSpecScore[] = [
    evalSpec({
      name: "locked",
      label: "Locked 90n",
      train,
      test,
      opts: { ...baseOpts, kind: "linear" },
      locked: { coefs: locked, kind: "linear" },
    }),
    evalSpec({ name: "olsEma", label: "OLS độ sâu+EMA", train, test, opts: { ...baseOpts, kind: "linear" } }),
    evalSpec({
      name: "olsMax",
      label: "OLS chỉ độ sâu",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", ema: false },
    }),
    evalSpec({
      name: "olsVol",
      label: "OLS + volume",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", vol: true },
    }),
    evalSpec({
      name: "olsFirst",
      label: "OLS first-touch",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", first: true },
    }),
    evalSpec({ name: "olsLog", label: "log(độ sâu)+EMA", train, test, opts: { ...baseOpts, kind: "log" } }),
    evalSpec({ name: "olsSqrt", label: "√độ sâu+EMA", train, test, opts: { ...baseOpts, kind: "sqrt" } }),
    evalSpec({ name: "olsQuad", label: "OLS + depth²", train, test, opts: { ...baseOpts, kind: "quad" } }),
    evalSpec({
      name: "olsNoInt",
      label: "OLS không intercept",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", intercept: false },
    }),
    evalSpec({
      name: "wls05",
      label: "WLS γ=0.5",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", loss: "wls", gamma: 0.5 },
    }),
    evalSpec({
      name: "wls082",
      label: "WLS γ=0.82",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", loss: "wls", gamma: 0.82 },
    }),
    evalSpec({
      name: "wls10",
      label: "WLS γ=1",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", loss: "wls", gamma: 1 },
    }),
    evalSpec({
      name: "ladEma",
      label: "LAD (tối ưu MAE)",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", loss: "lad" },
    }),
    evalSpec({
      name: "winsor25",
      label: "OLS winsor 2.5×",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", winsor: 2.5 },
    }),
    evalSpec({
      name: "fitEntry",
      label: "OLS fit cửa 1.15–1.75×",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", trainFilter: inEntry },
    }),
    evalSpec({
      name: "fitEmaUp",
      label: "OLS fit EMA up",
      train,
      test,
      opts: { ...baseOpts, kind: "linear", trainFilter: (r) => r.emaUp },
    }),
    gridSearch(train, test),
  ];
  const lockedMae = specs.find((s) => s.name === "locked")?.entry.mae ?? NaN;
  const { winner, grade } = pickWinner(specs, lockedMae);
  const win = specs.find((s) => s.name === winner)!;
  const delta = lockedMae - win.entry.mae;
  const verdict =
    grade === "replace"
      ? `Thay locked: ${win.label} MAE cửa ${win.entry.mae.toFixed(2)} vs locked ${lockedMae.toFixed(2)} (Δ ${delta.toFixed(2)}).`
      : `Giữ locked (−0.28 + 4.67×ATR − 0.36×EMA). Best khác (${win.label}) chỉ hơn ${delta.toFixed(2)} nến — dưới ngưỡng 0.08.`;
  return {
    n: rows.length,
    nTrain: train.length,
    nTest: test.length,
    nEntry: test.filter(inEntry).length,
    specs,
    winner,
    lockedMae,
    winnerMae: win.entry.mae,
    delta,
    best: win.coefs,
    bestKind: win.kind,
    grade,
    verdict,
  };
}
