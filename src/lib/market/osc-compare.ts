import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import {
  CTI_MAX,
  CTI_PERIOD,
  RSI_FAST,
  RSI_SLOW,
  RSI_SLOW_MIN,
} from "./symbols.ts";
import type { Candle, OscBook, OscReport } from "./types.ts";

const ENTRY_ATR = 1.25;
const EPS = 0.01;

function gate(n: number, pred: (i: number) => boolean): Array<boolean | null> {
  const out: Array<boolean | null> = new Array(n);
  for (let i = 0; i < n; i++) out[i] = pred(i);
  return out;
}

function bookOf(
  key: OscBook["key"],
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
): OscBook {
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

function pickWinner(books: OscBook[]): OscReport["winner"] {
  const ranked = books.filter((b) => b.n >= 12 && Number.isFinite(b.expectancy));
  if (ranked.length === 0) return "tie";
  let best = ranked[0]!;
  for (const b of ranked) {
    if (b.expectancy > best.expectancy) best = b;
  }
  const second = ranked.filter((b) => b.key !== best.key).sort((a, c) => c.expectancy - a.expectancy)[0];
  if (second && best.expectancy - second.expectancy < EPS) return "tie";
  return best.key;
}

export function runOscCompare(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  ema20: Array<number | null>;
  emaPeriod: number;
  rsiFast: Array<number | null>;
  rsiSlow: Array<number | null>;
  cti: Array<number | null>;
  lookforward: number;
  intervalMin: number;
}): OscReport {
  const n = input.candles.length;
  const baseArgs = {
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

  const fastG = gate(n, (i) => {
    const a = input.rsiFast[i];
    const b = input.rsiSlow[i];
    return a != null && b != null && a < b;
  });
  const slowG = gate(n, (i) => {
    const r = input.rsiSlow[i];
    return r != null && r > RSI_SLOW_MIN;
  });
  const ctiG = gate(n, (i) => {
    const c = input.cti[i];
    return c != null && c <= CTI_MAX;
  });
  const ctiPosG = gate(n, (i) => {
    const c = input.cti[i];
    return c != null && c > CTI_MAX;
  });
  const fastSlowG = gate(n, (i) => fastG[i] === true && slowG[i] === true);
  const fastCtiG = gate(n, (i) => fastG[i] === true && ctiG[i] === true);
  const slowCtiG = gate(n, (i) => slowG[i] === true && ctiG[i] === true);
  const comboG = gate(n, (i) => fastG[i] === true && slowG[i] === true && ctiG[i] === true);

  const books: OscBook[] = [
    bookOf("base", `EMA${input.emaPeriod} only`, backtestFade(baseArgs)),
    bookOf("fast", `RSI${RSI_FAST} dưới RSI${RSI_SLOW}`, backtestFade({ ...baseArgs, allow: fastG })),
    bookOf("slow", `RSI${RSI_SLOW} trên ${RSI_SLOW_MIN}`, backtestFade({ ...baseArgs, allow: slowG })),
    bookOf("cti", `CTI${CTI_PERIOD} không dương`, backtestFade({ ...baseArgs, allow: ctiG })),
  ];
  const pairs: OscBook[] = [
    bookOf("fastSlow", "RSI fast + slow", backtestFade({ ...baseArgs, allow: fastSlowG })),
    bookOf("fastCti", "RSI fast + CTI", backtestFade({ ...baseArgs, allow: fastCtiG })),
    bookOf("slowCti", "RSI slow + CTI", backtestFade({ ...baseArgs, allow: slowCtiG })),
    bookOf("combo", "Cả ba", backtestFade({ ...baseArgs, allow: comboG })),
  ];
  const anti = bookOf("ctiPos", "CTI dương", backtestFade({ ...baseArgs, allow: ctiPosG }));

  const combo = pairs.find((b) => b.key === "combo");
  const base = books.find((b) => b.key === "base");
  const deltaE =
    combo && base && Number.isFinite(combo.expectancy) && Number.isFinite(base.expectancy)
      ? combo.expectancy - base.expectancy
      : NaN;

  return {
    entryAtr: ENTRY_ATR,
    rsiFast: RSI_FAST,
    rsiSlow: RSI_SLOW,
    ctiPeriod: CTI_PERIOD,
    rsiSlowMin: RSI_SLOW_MIN,
    ctiMax: CTI_MAX,
    books,
    pairs,
    anti,
    deltaE,
    winner: pickWinner([...books, ...pairs]),
    emaPeriod: input.emaPeriod,
  };
}
