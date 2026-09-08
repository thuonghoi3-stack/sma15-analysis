import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { computeEma } from "./indicators.ts";
import { TREND_EMA_PERIOD } from "./symbols.ts";
import type { Candle, EmaTuneCell, EmaTuneReport } from "./types.ts";

export const EMA_TUNE_PERIODS = [8, 9, 10, 12, 14, 16, 18, 20, 26, 34, 50];
export const EMA_BASELINE = TREND_EMA_PERIOD;
const ENTRY_ATR = 1.25;
const MIN_N = 30;
const MIN_HALF = 12;

export function tuneCell(period: number, run: {
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
}): EmaTuneCell {
  const stability =
    Number.isFinite(run.firstE) && Number.isFinite(run.secondE)
      ? Math.min(run.firstE, run.secondE)
      : NaN;
  return {
    period,
    n: run.n,
    expectancy: run.expectancy,
    winRate: run.winRate,
    stopShare: run.stopShare,
    firstE: run.firstE,
    secondE: run.secondE,
    nFirst: run.nFirst,
    nSecond: run.nSecond,
    stability,
  };
}

export function pickEmaPeriod(cells: EmaTuneCell[]): number {
  const stable = cells.filter(
    (c) =>
      c.n >= MIN_N &&
      c.nFirst >= MIN_HALF &&
      c.nSecond >= MIN_HALF &&
      c.firstE > 0 &&
      c.secondE > 0 &&
      Number.isFinite(c.stability),
  );
  const pool = stable.length
    ? stable
    : cells.filter((c) => c.n >= 12 && Number.isFinite(c.expectancy));
  if (pool.length === 0) return EMA_BASELINE;
  const ranked = pool.slice().sort((a, b) => {
    const sa = Number.isFinite(a.stability) ? a.stability : a.expectancy;
    const sb = Number.isFinite(b.stability) ? b.stability : b.expectancy;
    if (Math.abs(sb - sa) > 0.001) return sb - sa;
    if (Math.abs(b.winRate - a.winRate) > 0.005) return b.winRate - a.winRate;
    return b.expectancy - a.expectancy;
  });
  return ranked[0]!.period;
}

export function runEmaTune(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  lookforward: number;
  intervalMin: number;
}): EmaTuneReport {
  const closes = input.candles.map((c) => c.c);
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
    uptrendOnly: true,
    trendFilter: "up" as const,
  };

  const cells = EMA_TUNE_PERIODS.map((period) => {
    const ema = computeEma(closes, period);
    const run = backtestFade({ ...base, smaTrend: ema });
    return tuneCell(period, run);
  });

  const winner = pickEmaPeriod(cells);
  const winnerCell = cells.find((c) => c.period === winner) ?? cells[0]!;
  const baselineCell = cells.find((c) => c.period === EMA_BASELINE) ?? winnerCell;

  return {
    entryAtr: ENTRY_ATR,
    baseline: EMA_BASELINE,
    winner,
    cells,
    deltaE: winnerCell.expectancy - baselineCell.expectancy,
    deltaWr: winnerCell.winRate - baselineCell.winRate,
    baselineCell,
    winnerCell,
  };
}
