import { backtestFade, FEE_BPS, STOP_ATR } from "./backtest.ts";
import { EMA_TUNE_PERIODS, pickEmaPeriod, tuneCell } from "./ema-tune.ts";
import { computeSma } from "./indicators.ts";
import type { Candle, EmaTuneCell, MaPair, MaTypeReport } from "./types.ts";

const ENTRY_ATR = 1.25;
const EPS_E = 0.001;
const EPS_WR = 0.005;

function pickType(ema: EmaTuneCell, sma: EmaTuneCell): MaTypeReport["winner"] {
  const se = ema.stability;
  const ss = sma.stability;
  if (!Number.isFinite(se) && !Number.isFinite(ss)) return "tie";
  if (!Number.isFinite(se)) return "sma";
  if (!Number.isFinite(ss)) return "ema";
  if (Math.abs(ss - se) < EPS_E && Math.abs(ema.winRate - sma.winRate) < EPS_WR) return "tie";
  if (ss > se + EPS_E) return "sma";
  if (se > ss + EPS_E) return "ema";
  return sma.winRate > ema.winRate ? "sma" : "ema";
}

export function runMaType(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  lookforward: number;
  intervalMin: number;
  emaWinner: number;
  emaCells: EmaTuneCell[];
}): MaTypeReport {
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

  const emaByP = new Map(input.emaCells.map((c) => [c.period, c]));
  const pairs: MaPair[] = EMA_TUNE_PERIODS.map((period) => {
    const smaRun = backtestFade({ ...base, smaTrend: computeSma(closes, period) });
    const sma = tuneCell(period, smaRun);
    const ema = emaByP.get(period) ?? tuneCell(period, smaRun);
    return {
      period,
      ema,
      sma,
      deltaE: ema.expectancy - sma.expectancy,
      deltaWr: ema.winRate - sma.winRate,
    };
  });

  const emaCells = pairs.map((p) => p.ema);
  const smaCells = pairs.map((p) => p.sma);
  const bestEmaP = pickEmaPeriod(emaCells);
  const bestSmaP = pickEmaPeriod(smaCells);
  const bestEma = emaCells.find((c) => c.period === bestEmaP) ?? emaCells[0]!;
  const bestSma = smaCells.find((c) => c.period === bestSmaP) ?? smaCells[0]!;
  const matched =
    pairs.find((p) => p.period === input.emaWinner) ??
    pairs.find((p) => p.period === bestEma.period) ??
    pairs[0]!;

  let emaWins = 0;
  let smaWins = 0;
  for (const p of pairs) {
    if (p.deltaE > EPS_E) emaWins += 1;
    else if (p.deltaE < -EPS_E) smaWins += 1;
  }

  return {
    entryAtr: ENTRY_ATR,
    pairs,
    emaWins,
    smaWins,
    bestEma,
    bestSma,
    matched,
    winner: pickType(bestEma, bestSma),
    deltaBestE: bestEma.expectancy - bestSma.expectancy,
    deltaBestWr: bestEma.winRate - bestSma.winRate,
  };
}
