import { computeSma } from "./indicators.ts";
import { forecastRecoveryBars } from "./recovery.ts";
import { quantile } from "./stats.ts";
import { CLIMAX_VOL_MULT, FORECAST_MIN_BARS, TP_SLACK_BARS, VOL_SMA_PERIOD } from "./symbols.ts";
import type { BacktestReport, BacktestRun, Candle, EdgeCell, EdgeReport, EquityPoint, RecoveryCell, Trade, TrendFilter } from "./types.ts";
import { isVolumeDump, volRatio } from "./volume.ts";

export const FEE_BPS = 4;
export const STOP_ATR = 1.5;
export const EDGE_DEPTHS = [1, 1.25, 1.5];
export const EDGE_TRENDS: TrendFilter[] = ["up", "all", "down"];

function fillPrice(open: number, limit: number): number {
  return open < limit ? open : limit;
}

function exitPrice(open: number, stop: number): number {
  return open < stop ? open : stop;
}

function netPnlPct(entry: number, exit: number, feeBps: number): number {
  const f = feeBps / 10_000;
  return ((exit * (1 - f)) / (entry * (1 + f)) - 1) * 100;
}

function resolveTrend(input: { trendFilter?: TrendFilter; uptrendOnly: boolean }): TrendFilter {
  if (input.trendFilter) return input.trendFilter;
  return input.uptrendOnly ? "up" : "all";
}

export function backtestFade(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  smaTrend: Array<number | null>;
  entryAtr: number;
  stopAtr: number;
  lookforward: number;
  intervalMin: number;
  uptrendOnly: boolean;
  feeBps: number;
  skipVolMult?: number;
  requireVolMult?: number;
  trendFilter?: TrendFilter;
  extraTrend?: Array<number | null>;
  keepAllTrades?: boolean;
  allow?: Array<boolean | null>;
  recoveryCells?: RecoveryCell[];
  emaSeries?: Array<number | null>;
  minForecastBars?: number;
  tpSlackBars?: number;
}): Omit<BacktestRun, "label"> {
  const {
    candles,
    sma,
    atr,
    smaTrend,
    entryAtr,
    stopAtr,
    lookforward,
    intervalMin,
    feeBps,
  } = input;
  const skipVolMult = input.skipVolMult ?? 0;
  const requireVolMult = input.requireVolMult ?? 0;
  const extraTrend = input.extraTrend;
  const keepAllTrades = input.keepAllTrades ?? false;
  const allow = input.allow;
  const recoveryCells = input.recoveryCells;
  const emaSeries = input.emaSeries;
  const minForecastBars = input.minForecastBars ?? 0;
  const tpSlackBars = input.tpSlackBars ?? 0;
  const forecastOn = Boolean(recoveryCells && recoveryCells.length && (minForecastBars > 0 || tpSlackBars > 0));
  const trendFilter = resolveTrend(input);
  const volSma = computeSma(
    candles.map((c) => c.v),
    VOL_SMA_PERIOD,
  );
  const n = candles.length;
  const trades: Trade[] = [];
  let nSkipped = 0;
  let nSkipForecast = 0;
  let i = 0;

  while (i < n) {
    const s = sma[i];
    const a = atr[i];
    const bar = candles[i]!;
    if (s == null || a == null || a <= 0) {
      i += 1;
      continue;
    }
    const trend = smaTrend[i];
    const uptrend = trend != null ? bar.c > trend : bar.c > s;
    const extra = extraTrend ? extraTrend[i] : null;
    const extraUp = extraTrend ? (extra != null ? bar.c > extra : uptrend) : true;
    if (trendFilter === "up" && (!uptrend || !extraUp)) {
      i += 1;
      continue;
    }
    if (trendFilter === "down" && (uptrend || !extraUp)) {
      i += 1;
      continue;
    }

    const limit = s - entryAtr * a;
    if (!(bar.l <= limit)) {
      i += 1;
      continue;
    }
    if (allow && allow[i] === false) {
      i += 1;
      continue;
    }

    if (requireVolMult > 0) {
      if (!isVolumeDump(bar, volSma[i] ?? null, requireVolMult)) {
        nSkipped += 1;
        i += 1;
        continue;
      }
    } else if (isVolumeDump(bar, volSma[i] ?? null, skipVolMult)) {
      nSkipped += 1;
      i += 1;
      continue;
    }

    let tpHold: number | null = null;
    if (forecastOn && recoveryCells) {
      const ema = emaSeries ? emaSeries[i] : null;
      const emaUp = ema != null ? bar.c > ema : uptrend;
      const depth = (s - bar.l) / a;
      const p50 = forecastRecoveryBars(recoveryCells, depth, emaUp);
      if (Number.isFinite(p50) && p50 <= minForecastBars) {
        nSkipped += 1;
        nSkipForecast += 1;
        i += 1;
        continue;
      }
      if (Number.isFinite(p50) && tpSlackBars > 0) {
        tpHold = Math.max(1, Math.round(p50) - tpSlackBars);
      }
    }

    const entry = fillPrice(bar.o, limit);
    const stop = entry - stopAtr * a;
    let exit = bar.c;
    let reason: Trade["reason"] = "time";
    let exitIdx = i;

    const tryExit = (idx: number, held: number): boolean => {
      const b = candles[idx]!;
      const sj = sma[idx];
      if (b.l <= stop) {
        exit = exitPrice(b.o, stop);
        reason = "stop";
        exitIdx = idx;
        return true;
      }
      if (sj != null && b.c >= sj) {
        exit = b.c;
        reason = "sma";
        exitIdx = idx;
        return true;
      }
      if (tpHold != null && held + 1 >= tpHold) {
        exit = b.c;
        reason = "tp";
        exitIdx = idx;
        return true;
      }
      if (held >= lookforward) {
        exit = b.c;
        reason = "time";
        exitIdx = idx;
        return true;
      }
      return false;
    };

    if (!tryExit(i, 0)) {
      let held = 1;
      let j = i + 1;
      let closed = false;
      while (j < n) {
        if (tryExit(j, held)) {
          closed = true;
          break;
        }
        held += 1;
        j += 1;
      }
      if (!closed) {
        exitIdx = n - 1;
        exit = candles[exitIdx]!.c;
        reason = "time";
      }
    }

    const bars = exitIdx - i + 1;
    trades.push({
      entryT: bar.t,
      exitT: candles[exitIdx]!.t,
      entry,
      exit,
      pnlPct: netPnlPct(entry, exit, feeBps),
      bars,
      durationMin: bars * intervalMin,
      reason,
      uptrend,
      volRatio: volRatio(bar.v, volSma[i] ?? null),
    });
    i = exitIdx + 1;
  }

  return summarizeRun(
    trades,
    candles,
    feeBps,
    entryAtr,
    stopAtr,
    trendFilter,
    skipVolMult,
    requireVolMult,
    nSkipped,
    nSkipForecast,
    forecastOn,
    keepAllTrades,
  );
}

function meanPnl(xs: Trade[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const t of xs) s += t.pnlPct;
  return s / xs.length;
}

function summarizeRun(
  trades: Trade[],
  candles: Candle[],
  feeBps: number,
  entryAtr: number,
  stopAtr: number,
  trendFilter: TrendFilter,
  skipVolMult: number,
  requireVolMult: number,
  nSkipped: number,
  nSkipForecast: number,
  forecastOn: boolean,
  keepAllTrades = false,
): Omit<BacktestRun, "label"> {
  const first = candles[0]!;
  const last = candles[candles.length - 1]!;
  const buyHoldPct = first.c > 0 ? ((last.c - first.c) / first.c) * 100 : NaN;

  const pnls = trades.map((t) => t.pnlPct);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const grossWin = wins.reduce((s, v) => s + v, 0);
  const grossLoss = losses.reduce((s, v) => s + v, 0);
  const expectancy = pnls.length ? pnls.reduce((s, v) => s + v, 0) / pnls.length : NaN;
  const profitFactor =
    grossLoss < 0 ? grossWin / Math.abs(grossLoss) : wins.length > 0 ? 99 : NaN;

  let eq = 1;
  let peak = 1;
  let maxDd = 0;
  const equity: EquityPoint[] = [{ t: first.t, eq: 1 }];
  for (const t of trades) {
    eq *= 1 + t.pnlPct / 100;
    if (eq > peak) peak = eq;
    const dd = peak > 0 ? (peak - eq) / peak : 0;
    if (dd > maxDd) maxDd = dd;
    equity.push({ t: t.exitT, eq });
  }

  const step = equity.length <= 80 ? 1 : Math.ceil(equity.length / 80);
  const sampled: EquityPoint[] = [];
  for (let k = 0; k < equity.length; k += step) sampled.push(equity[k]!);
  if (sampled[sampled.length - 1] !== equity[equity.length - 1]) {
    sampled.push(equity[equity.length - 1]!);
  }

  const midT = candles[Math.floor(candles.length / 2)]!.t;
  const firstHalf = trades.filter((t) => t.entryT < midT);
  const secondHalf = trades.filter((t) => t.entryT >= midT);

  return {
    entryAtr,
    stopAtr,
    uptrendOnly: trendFilter === "up",
    trendFilter,
    skipVolMult,
    requireVolMult,
    volMode: requireVolMult > 0 ? "require" : skipVolMult > 0 ? "skip" : "any",
    nSkipped,
    nSkipForecast,
    forecastOn,
    feeBps,
    n: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length ? wins.length / trades.length : NaN,
    avgWin: wins.length ? grossWin / wins.length : NaN,
    avgLoss: losses.length ? grossLoss / losses.length : NaN,
    expectancy,
    profitFactor,
    totalPnlPct: pnls.reduce((s, v) => s + v, 0),
    compoundPct: (eq - 1) * 100,
    maxDd: maxDd * 100,
    avgBars: trades.length ? trades.reduce((s, t) => s + t.bars, 0) / trades.length : NaN,
    avgMin: trades.length ? trades.reduce((s, t) => s + t.durationMin, 0) / trades.length : NaN,
    buyHoldPct,
    trades: keepAllTrades ? trades : trades.slice(-40).reverse(),
    equity: sampled,
    volP50Sma: quantile(
      trades.filter((x) => x.reason === "sma" && Number.isFinite(x.volRatio)).map((x) => x.volRatio).sort((a, b) => a - b),
      0.5,
    ),
    volP50Stop: quantile(
      trades.filter((x) => x.reason === "stop" && Number.isFinite(x.volRatio)).map((x) => x.volRatio).sort((a, b) => a - b),
      0.5,
    ),
    dumpShare: trades.length
      ? trades.filter((x) => Number.isFinite(x.volRatio) && x.volRatio >= CLIMAX_VOL_MULT).length / trades.length
      : NaN,
    stopShare: trades.length ? trades.filter((x) => x.reason === "stop").length / trades.length : NaN,
    smaShare: trades.length ? trades.filter((x) => x.reason === "sma").length / trades.length : NaN,
    tpShare: trades.length ? trades.filter((x) => x.reason === "tp").length / trades.length : NaN,
    firstE: meanPnl(firstHalf),
    secondE: meanPnl(secondHalf),
    nFirst: firstHalf.length,
    nSecond: secondHalf.length,
  };
}

function runLabel(
  entryAtr: number,
  trendFilter: TrendFilter,
  skipVolMult: number,
  requireVolMult: number,
  forecastOn: boolean,
): string {
  const trend = trendFilter === "up" ? "up" : trendFilter === "down" ? "down" : "all";
  let vol = "mọi vol";
  if (requireVolMult > 0) vol = `chỉ xả ≥ ${requireVolMult.toFixed(1)}×`;
  else if (skipVolMult > 0) vol = `tránh xả ${skipVolMult.toFixed(1)}×`;
  if (forecastOn) return `${fmtAtr(entryAtr)}× ${trend} · TP P50−2`;
  return `${fmtAtr(entryAtr)}× ${trend} · ${vol}`;
}

function fmtAtr(n: number): string {
  return n.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}

export function runBacktests(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  smaTrend: Array<number | null>;
  lookforward: number;
  intervalMin: number;
  ema20?: Array<number | null>;
  recoveryCells?: RecoveryCell[];
}): BacktestReport {
  const forecastOn = Boolean(input.recoveryCells && input.recoveryCells.length);
  const trendSeries = input.ema20 ?? input.smaTrend;
  const specs: {
    entryAtr: number;
    trendFilter: TrendFilter;
    skipVolMult: number;
    requireVolMult: number;
    useForecast: boolean;
    series: Array<number | null>;
  }[] = forecastOn
    ? [
        { entryAtr: 1.25, trendFilter: "up", skipVolMult: 0, requireVolMult: 0, useForecast: true, series: trendSeries },
        { entryAtr: 1.25, trendFilter: "up", skipVolMult: 0, requireVolMult: 0, useForecast: false, series: trendSeries },
        { entryAtr: 1.5, trendFilter: "up", skipVolMult: 0, requireVolMult: 0, useForecast: true, series: trendSeries },
        { entryAtr: 1.25, trendFilter: "all", skipVolMult: 0, requireVolMult: 0, useForecast: true, series: trendSeries },
      ]
    : [
        { entryAtr: 1.5, trendFilter: "up", skipVolMult: 0, requireVolMult: 0, useForecast: false, series: input.smaTrend },
        { entryAtr: 1.5, trendFilter: "up", skipVolMult: 2.5, requireVolMult: 0, useForecast: false, series: input.smaTrend },
        { entryAtr: 1.5, trendFilter: "all", skipVolMult: 0, requireVolMult: 0, useForecast: false, series: input.smaTrend },
        { entryAtr: 1.5, trendFilter: "all", skipVolMult: 2.5, requireVolMult: 0, useForecast: false, series: input.smaTrend },
      ];

  const runs: BacktestRun[] = specs.map((s) => {
    const raw = backtestFade({
      candles: input.candles,
      sma: input.sma,
      atr: input.atr,
      smaTrend: s.series,
      lookforward: input.lookforward,
      intervalMin: input.intervalMin,
      entryAtr: s.entryAtr,
      uptrendOnly: s.trendFilter === "up",
      trendFilter: s.trendFilter,
      skipVolMult: s.skipVolMult,
      requireVolMult: s.requireVolMult,
      stopAtr: STOP_ATR,
      feeBps: FEE_BPS,
      emaSeries: input.ema20,
      recoveryCells: s.useForecast ? input.recoveryCells : undefined,
      minForecastBars: s.useForecast ? FORECAST_MIN_BARS : 0,
      tpSlackBars: s.useForecast ? TP_SLACK_BARS : 0,
    });
    return {
      ...raw,
      label: runLabel(s.entryAtr, s.trendFilter, s.skipVolMult, s.requireVolMult, s.useForecast),
    };
  });

  const ranked = runs.filter((r) => r.n >= 12 && Number.isFinite(r.expectancy));
  const pool = ranked.length ? ranked : runs.filter((r) => r.n > 0);
  let best = pool[0] ?? runs[0]!;
  for (const r of pool) {
    if ((r.expectancy ?? -Infinity) > (best.expectancy ?? -Infinity)) best = r;
  }

  return {
    feeBps: FEE_BPS,
    stopAtr: STOP_ATR,
    lookforwardBars: input.lookforward,
    volPeriod: VOL_SMA_PERIOD,
    runs,
    bestLabel: best.label,
  };
}

function toCell(run: Omit<BacktestRun, "label">, trend: TrendFilter, entryAtr: number): EdgeCell {
  return {
    entryAtr,
    trend,
    n: run.n,
    winRate: run.winRate,
    expectancy: run.expectancy,
    profitFactor: run.profitFactor,
    compoundPct: run.compoundPct,
    maxDd: run.maxDd,
    stopShare: run.stopShare,
    smaShare: run.smaShare,
    firstE: run.firstE,
    secondE: run.secondE,
    nFirst: run.nFirst,
    nSecond: run.nSecond,
  };
}

function findCell(cells: EdgeCell[], atr: number, trend: TrendFilter): EdgeCell | undefined {
  return cells.find((c) => c.entryAtr === atr && c.trend === trend);
}

function deltaE(a: EdgeCell | undefined, b: EdgeCell | undefined): number {
  if (!a || !b || !Number.isFinite(a.expectancy) || !Number.isFinite(b.expectancy)) return NaN;
  return a.expectancy - b.expectancy;
}

function pickBest(cells: EdgeCell[]): EdgeCell {
  const ranked = cells.filter((c) => c.n >= 12 && Number.isFinite(c.expectancy));
  const pool = ranked.length ? ranked : cells.filter((c) => c.n > 0);
  let best = pool[0] ?? cells[0]!;
  for (const c of pool) {
    if ((c.expectancy ?? -Infinity) > (best.expectancy ?? -Infinity)) best = c;
  }
  return best;
}

function gradeEdge(input: {
  best: EdgeCell;
  combinedLift: number;
}): EdgeReport["verdict"] {
  const { best, combinedLift } = input;
  const pos = best.n >= 12 && best.expectancy > 0;
  const halves =
    Number.isFinite(best.firstE) &&
    Number.isFinite(best.secondE) &&
    best.firstE > 0 &&
    best.secondE > 0 &&
    best.nFirst >= 5 &&
    best.nSecond >= 5;
  if (pos && halves) return "edge";
  if (Number.isFinite(combinedLift) && combinedLift > 0.03) return "filter";
  return "none";
}

export function runEdgeGrid(input: {
  candles: Candle[];
  sma: Array<number | null>;
  atr: Array<number | null>;
  smaTrend: Array<number | null>;
  lookforward: number;
  intervalMin: number;
}): EdgeReport {
  const cells: EdgeCell[] = [];
  for (const trend of EDGE_TRENDS) {
    for (const entryAtr of EDGE_DEPTHS) {
      const raw = backtestFade({
        ...input,
        entryAtr,
        uptrendOnly: trend === "up",
        trendFilter: trend,
        skipVolMult: 0,
        requireVolMult: 0,
        stopAtr: STOP_ATR,
        feeBps: FEE_BPS,
      });
      cells.push(toCell(raw, trend, entryAtr));
    }
  }

  const deepAll = findCell(cells, 1.5, "all");
  const shallowAll = findCell(cells, 1, "all");
  const deepUp = findCell(cells, 1.5, "up");
  const deepDown = findCell(cells, 1.5, "down");
  const atrLift = deltaE(deepAll, shallowAll);
  const trendLift = deltaE(deepUp, deepAll);
  const downLift = deltaE(deepDown, deepAll);
  const combinedLift = deltaE(deepUp, shallowAll);
  const stopDelta =
    deepAll && shallowAll && Number.isFinite(deepAll.stopShare) && Number.isFinite(shallowAll.stopShare)
      ? deepAll.stopShare - shallowAll.stopShare
      : NaN;
  const best = pickBest(cells);

  return {
    depths: EDGE_DEPTHS,
    cells,
    atrLift,
    trendLift,
    downLift,
    combinedLift,
    stopDelta,
    best,
    verdict: gradeEdge({ best, combinedLift }),
  };
}
