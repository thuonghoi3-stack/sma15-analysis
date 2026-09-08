import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { TREND_SMA_PERIOD } from "./symbols.ts";
import type { Candle, TrendBook, TrendBucket, TrendCompareReport } from "./types.ts";

const ENTRY_ATR = 1.25;
const EPS = 0.01;

function isUp(barC: number, series: Array<number | null>, i: number, sma: number): boolean {
  const t = series[i];
  return t != null ? barC > t : barC > sma;
}

function bookOf(
  key: TrendBook["key"],
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
): TrendBook {
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

function bucketOf(
  key: TrendBucket["key"],
  label: string,
  trades: { pnlPct: number; reason: string }[],
): TrendBucket {
  const n = trades.length;
  const wins = trades.filter((t) => t.pnlPct > 0).length;
  const e = n ? trades.reduce((s, t) => s + t.pnlPct, 0) / n : NaN;
  const stops = n ? trades.filter((t) => t.reason === "stop").length / n : NaN;
  return {
    key,
    label,
    n,
    expectancy: e,
    winRate: n ? wins / n : NaN,
    stopShare: stops,
  };
}

function pickWinner(books: TrendBook[]): TrendCompareReport["winner"] {
  const sma = books.find((b) => b.key === "sma50");
  const ema = books.find((b) => b.key === "ema20");
  const both = books.find((b) => b.key === "and");
  const ranked = [sma, ema, both].filter((b): b is TrendBook => !!b && b.n >= 12 && Number.isFinite(b.expectancy));
  if (ranked.length === 0) return "tie";
  let best = ranked[0]!;
  for (const b of ranked) {
    if (b.expectancy > best.expectancy) best = b;
  }
  const second = ranked.filter((b) => b.key !== best.key).sort((a, c) => c.expectancy - a.expectancy)[0];
  if (second && best.expectancy - second.expectancy < EPS) return "tie";
  if (best.key === "all") return "tie";
  return best.key;
}

export function runTrendCompare(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  sma50: Array<number | null>;
  ema20: Array<number | null>;
  emaPeriod: number;
  lookforward: number;
  intervalMin: number;
}): TrendCompareReport {
  const base = {
    candles: input.candles,
    sma: input.sma,
    atr: input.atr,
    lookforward: input.lookforward,
    intervalMin: input.intervalMin,
    entryAtr: ENTRY_ATR,
    stopAtr: STOP_ATR,
    feeBps: FEE_BPS,
    skipVolMult: 0,
    requireVolMult: 0,
  };

  const all = backtestFade({
    ...base,
    smaTrend: input.sma50,
    uptrendOnly: false,
    trendFilter: "all",
    keepAllTrades: true,
  });
  const smaBook = backtestFade({
    ...base,
    smaTrend: input.sma50,
    uptrendOnly: true,
    trendFilter: "up",
  });
  const emaBook = backtestFade({
    ...base,
    smaTrend: input.ema20,
    uptrendOnly: true,
    trendFilter: "up",
  });
  const andBook = backtestFade({
    ...base,
    smaTrend: input.sma50,
    extraTrend: input.ema20,
    uptrendOnly: true,
    trendFilter: "up",
  });

  const books: TrendBook[] = [
    bookOf("all", "Mọi trend", all),
    bookOf("sma50", `SMA${TREND_SMA_PERIOD} up`, smaBook),
    bookOf("ema20", `EMA${input.emaPeriod} up`, emaBook),
    bookOf("and", "Cả hai up", andBook),
  ];

  const idx = new Map<number, number>();
  for (let i = 0; i < input.candles.length; i++) idx.set(input.candles[i]!.t, i);

  const both: typeof all.trades = [];
  const smaOnly: typeof all.trades = [];
  const emaOnly: typeof all.trades = [];
  const neither: typeof all.trades = [];
  let agree = 0;

  for (const tr of all.trades) {
    const i = idx.get(tr.entryT);
    if (i == null) continue;
    const bar = input.candles[i]!;
    const s = input.sma[i];
    if (s == null) continue;
    const smaUp = isUp(bar.c, input.sma50, i, s);
    const emaUp = isUp(bar.c, input.ema20, i, s);
    if (smaUp === emaUp) agree += 1;
    if (smaUp && emaUp) both.push(tr);
    else if (smaUp) smaOnly.push(tr);
    else if (emaUp) emaOnly.push(tr);
    else neither.push(tr);
  }

  const tagged = both.length + smaOnly.length + emaOnly.length + neither.length;
  const buckets: TrendBucket[] = [
    bucketOf("both", "Cả hai up", both),
    bucketOf("smaOnly", "Chỉ SMA50", smaOnly),
    bucketOf("emaOnly", `Chỉ EMA${input.emaPeriod}`, emaOnly),
    bucketOf("neither", "Cả hai down", neither),
  ];

  const deltaE =
    Number.isFinite(emaBook.expectancy) && Number.isFinite(smaBook.expectancy)
      ? emaBook.expectancy - smaBook.expectancy
      : NaN;

  return {
    entryAtr: ENTRY_ATR,
    smaPeriod: TREND_SMA_PERIOD,
    emaPeriod: input.emaPeriod,
    agreeRate: tagged ? agree / tagged : NaN,
    books,
    buckets,
    deltaE,
    winner: pickWinner(books),
  };
}
