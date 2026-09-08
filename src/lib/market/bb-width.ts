import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { computeBb, rankInWindow } from "./indicators.ts";
import { pearson } from "./stats.ts";
import {
  BB_EXPAND_P,
  BB_K,
  BB_PERIOD,
  BB_RANK_BARS,
  BB_SQUEEZE_P,
} from "./symbols.ts";
import type { BbBook, BbWidthReport, Candle, DipEvent } from "./types.ts";

const ENTRY_ATR = 1.25;
const EPS = 0.03;

function bookOf(
  key: BbBook["key"],
  label: string,
  run: {
    n: number;
    expectancy: number;
    winRate: number;
    stopShare: number;
    compoundPct: number;
    firstE: number;
    secondE: number;
    nFirst: number;
    nSecond: number;
  },
): BbBook {
  return {
    key,
    label,
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

function pickWinner(books: BbBook[]): BbBook["key"] | "tie" {
  const ranked = books.filter((b) => b.n >= 12 && Number.isFinite(b.expectancy) && b.key !== "all");
  if (ranked.length === 0) return "tie";
  let best = ranked[0]!;
  for (const b of ranked) {
    if (b.expectancy > best.expectancy) best = b;
    else if (b.expectancy === best.expectancy && b.n > best.n) best = b;
  }
  const all = books.find((b) => b.key === "all");
  if (all && Number.isFinite(all.expectancy) && best.expectancy - all.expectancy < 0.01) return "tie";
  return best.key;
}

function grade(input: {
  winner: BbBook["key"] | "tie";
  squeeze: BbBook;
  expand: BbBook;
  below: BbBook;
  all: BbBook;
  corrWidthAtrPct: number;
  deltaSE: number;
}): BbWidthReport["verdict"] {
  const { winner, squeeze, expand, below, all, corrWidthAtrPct, deltaSE } = input;
  const proxy = Number.isFinite(corrWidthAtrPct) && Math.abs(corrWidthAtrPct) >= 0.85;
  const squeezeOk =
    squeeze.n >= 12 &&
    Number.isFinite(squeeze.firstE) &&
    Number.isFinite(squeeze.secondE) &&
    squeeze.firstE > 0 &&
    squeeze.secondE > 0;
  const expandOk =
    expand.n >= 12 &&
    Number.isFinite(expand.firstE) &&
    Number.isFinite(expand.secondE) &&
    expand.firstE > 0 &&
    expand.secondE > 0;
  const belowLift = below.n >= 12 && Number.isFinite(below.expectancy) && Number.isFinite(all.expectancy)
    ? below.expectancy - all.expectancy
    : NaN;

  if (Number.isFinite(deltaSE) && deltaSE >= EPS && squeezeOk) return "squeeze";
  if (Number.isFinite(deltaSE) && deltaSE <= -EPS && expandOk) return "expand";
  if (winner === "belowLower" && Number.isFinite(belowLift) && belowLift >= EPS) return "below";
  if (proxy) return "proxy";
  return "none";
}

export function runBbWidth(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  ema20: Array<number | null>;
  emaPeriod: number;
  events: DipEvent[];
  lookforward: number;
  intervalMin: number;
}): BbWidthReport {
  const n = input.candles.length;
  const closes = input.candles.map((c) => c.c);
  const bb = computeBb(closes, BB_PERIOD, BB_K);
  const rank = rankInWindow(bb.widthPct, BB_RANK_BARS);

  const widthAtr: number[] = [];
  const atrPct: number[] = [];
  for (let i = 0; i < n; i++) {
    const w = bb.widthPct[i];
    const a = input.atr[i];
    const px = input.candles[i]!.c;
    if (w == null || a == null || !(px > 0) || !(a > 0)) continue;
    widthAtr.push(w);
    atrPct.push((a / px) * 100);
  }

  const recW: number[] = [];
  const recBars: number[] = [];
  for (const e of input.events) {
    if (!e.recovered) continue;
    const w = bb.widthPct[e.startIdx];
    if (w == null || !Number.isFinite(w)) continue;
    recW.push(w);
    recBars.push(e.recoveryCandles);
  }

  const gate = (pred: (i: number) => boolean): Array<boolean | null> => {
    const out: Array<boolean | null> = new Array(n);
    for (let i = 0; i < n; i++) out[i] = pred(i);
    return out;
  };

  const base = {
    candles: input.candles,
    sma: input.sma,
    atr: input.atr,
    smaTrend: input.ema20,
    lookforward: input.lookforward,
    intervalMin: input.intervalMin,
    entryAtr: ENTRY_ATR,
    stopAtr: STOP_ATR,
    feeBps: FEE_BPS,
    uptrendOnly: true,
    trendFilter: "up" as const,
  };

  const all = bookOf("all", "Mọi BB", backtestFade(base));
  const squeeze = bookOf(
    "squeeze",
    `Squeeze P≤${Math.round(BB_SQUEEZE_P * 100)}`,
    backtestFade({
      ...base,
      allow: gate((i) => rank[i] != null && rank[i]! <= BB_SQUEEZE_P),
    }),
  );
  const mid = bookOf(
    "mid",
    "Giữa dải",
    backtestFade({
      ...base,
      allow: gate((i) => {
        const p = rank[i];
        return p != null && p > BB_SQUEEZE_P && p < BB_EXPAND_P;
      }),
    }),
  );
  const expand = bookOf(
    "expand",
    `Rộng P≥${Math.round(BB_EXPAND_P * 100)}`,
    backtestFade({
      ...base,
      allow: gate((i) => rank[i] != null && rank[i]! >= BB_EXPAND_P),
    }),
  );
  const below = bookOf(
    "belowLower",
    "Low dưới dải dưới",
    backtestFade({
      ...base,
      allow: gate((i) => {
        const lo = bb.lower[i];
        return lo != null && input.candles[i]!.l < lo;
      }),
    }),
  );

  const books = [all, squeeze, mid, expand, below];
  const squeezeLift = squeeze.expectancy - all.expectancy;
  const expandLift = expand.expectancy - all.expectancy;
  const deltaSE = squeeze.expectancy - expand.expectancy;
  const winner = pickWinner(books);
  const corrWidthAtrPct = pearson(widthAtr, atrPct);
  const corrWidthRecovery = pearson(recW, recBars);

  return {
    period: BB_PERIOD,
    k: BB_K,
    rankBars: BB_RANK_BARS,
    squeezeP: BB_SQUEEZE_P,
    expandP: BB_EXPAND_P,
    entryAtr: ENTRY_ATR,
    emaPeriod: input.emaPeriod,
    books,
    corrWidthAtrPct,
    corrWidthRecovery,
    squeezeLift,
    expandLift,
    deltaSE,
    winner,
    verdict: grade({
      winner,
      squeeze,
      expand,
      below,
      all,
      corrWidthAtrPct,
      deltaSE,
    }),
  };
}

export function liveBb(input: {
  widthPct: Array<number | null>;
  rank: Array<number | null>;
  pctB: Array<number | null>;
  lower: Array<number | null>;
  lastLow: number;
}): {
  bbWidthPct: number | null;
  bbPctile: number | null;
  bbSqueeze: boolean;
  bbExpand: boolean;
  bbPctB: number | null;
  bbBelowLower: boolean;
} {
  const i = input.widthPct.length - 1;
  const width = input.widthPct[i] ?? null;
  const pctile = input.rank[i] ?? null;
  const pctB = input.pctB[i] ?? null;
  const lower = input.lower[i] ?? null;
  return {
    bbWidthPct: width,
    bbPctile: pctile != null ? pctile * 100 : null,
    bbSqueeze: pctile != null && pctile <= BB_SQUEEZE_P,
    bbExpand: pctile != null && pctile >= BB_EXPAND_P,
    bbPctB: pctB,
    bbBelowLower: lower != null && input.lastLow < lower,
  };
}
