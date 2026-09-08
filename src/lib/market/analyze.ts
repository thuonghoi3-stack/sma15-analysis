import { backtestFade, FEE_BPS, runBacktests, runEdgeGrid, STOP_ATR } from "./backtest.ts";
import { computeAtr, computeBb, computeCti, computeEma, computeRsi, computeSma, rankInWindow } from "./indicators.ts";
import { histogram, pearson, percentileOf, quantile, summarize } from "./stats.ts";
import {
  ATR_PERIOD,
  CHART_BARS,
  LOOKFORWARD_HOURS,
  MIN_SIGNAL_ATR,
  SMA_PERIOD,
  TREND_SMA_PERIOD,
  RSI_FAST,
  RSI_SLOW,
  RSI_SLOW_MIN,
  CTI_PERIOD,
  CTI_MAX,
  BB_K,
  BB_PERIOD,
  BB_RANK_BARS,
  CLIMAX_VOL_MULT,
  VOL_DUMP_MULT,
  VOL_SMA_PERIOD,
  intervalMinutes,
} from "./symbols.ts";
import { runTrendCompare } from "./trend-compare.ts";
import { runOscCompare } from "./osc-compare.ts";
import { buildRecovery } from "./recovery.ts";
import { runDepthSweep } from "./depth-sweep.ts";
import { runEmaTune } from "./ema-tune.ts";
import { runBbWidth, liveBb } from "./bb-width.ts";
import { runMaType } from "./ma-type.ts";
import type {
  Candle,
  ChartCandle,
  DipEvent,
  GroupStats,
  Interval,
  RegimeRow,
  StudyResult,
  VolumeMini,
  VolumeVerdict,
} from "./types.ts";
import { defaultDump, isVolumeDump, volRatio } from "./volume.ts";

function emptyStats(): GroupStats {
  const q = summarize([]);
  return {
    nEvents: 0,
    nRecovered: 0,
    nFailed: 0,
    nSignal: 0,
    recoveryRate: NaN,
    recoveredWithin: { c1: NaN, c3: NaN, c6: NaN, c12: NaN, c24: NaN },
    pct: q,
    atr: q,
    durationCandles: q,
    durationMin: q,
    bouncePct: q,
    firstCandleIsTroughRate: NaN,
    extraDumpPct: q,
    histPct: [],
    histAtr: [],
  };
}

function buildGroup(events: DipEvent[]): GroupStats {
  if (events.length === 0) return emptyStats();
  const recoveredAll = events.filter((e) => e.recovered);
  const recovered = recoveredAll.filter((e) => e.undershootAtr >= MIN_SIGNAL_ATR);
  const rate = (k: number) =>
    events.filter((e) => e.recovered && e.recoveryCandles <= k).length / events.length;

  const pcts = recovered.map((e) => e.undershootPct);
  const atrs = recovered.map((e) => e.undershootAtr);
  const durs = recovered.map((e) => e.recoveryCandles);
  const mins = recovered.map((e) => e.durationMin);
  const bounce = recovered
    .map((e) => e.bouncePct)
    .filter((v): v is number => v != null);
  const extra = recovered.map((e) => Math.max(0, e.undershootPct - e.firstUndershootPct));
  const troughFirst =
    recovered.length === 0
      ? NaN
      : recovered.filter((e) => e.troughT === e.startT).length / recovered.length;

  return {
    nEvents: events.length,
    nRecovered: recoveredAll.length,
    nFailed: events.length - recoveredAll.length,
    nSignal: recovered.length,
    recoveryRate: recoveredAll.length / events.length,
    recoveredWithin: {
      c1: rate(1),
      c3: rate(3),
      c6: rate(6),
      c12: rate(12),
      c24: rate(24),
    },
    pct: summarize(pcts),
    atr: summarize(atrs),
    durationCandles: summarize(durs),
    durationMin: summarize(mins),
    bouncePct: summarize(bounce),
    firstCandleIsTroughRate: troughFirst,
    extraDumpPct: summarize(extra),
    histPct: histogram(pcts, 18, Number.isFinite(summarize(pcts).p95) ? summarize(pcts).p95 * 1.15 : undefined),
    histAtr: histogram(atrs, 18, Number.isFinite(summarize(atrs).p95) ? summarize(atrs).p95 * 1.15 : undefined),
  };
}

export function detectDips(
  candles: Candle[],
  sma: Array<number | null>,
  atr: Array<number | null>,
  smaTrend: Array<number | null>,
  lookforward: number,
  intervalMin: number,
): DipEvent[] {
  const n = candles.length;
  const volSma = computeSma(candles.map((c) => c.v), VOL_SMA_PERIOD);
  const events: DipEvent[] = [];
  let i = 0;

  while (i < n) {
    const s = sma[i];
    const a = atr[i];
    const bar = candles[i]!;
    if (s == null || a == null || a <= 0 || !(bar.l < s)) {
      i += 1;
      continue;
    }

    const start = i;
    let recovered = false;
    let end = i;
    let minLow = bar.l;
    let troughIdx = i;
    let maxPct = ((s - bar.l) / s) * 100;
    let maxAtr = (s - bar.l) / a;
    let maxVolR = volRatio(bar.v, volSma[i] ?? null);
    const firstPct = maxPct;
    const trendSma = smaTrend[i];
    const uptrend = trendSma != null ? bar.c > trendSma : bar.c > s;

    if (bar.c >= s) {
      recovered = true;
      end = i;
    } else {
      const limit = Math.min(n - 1, i + lookforward);
      for (let j = i + 1; j <= limit; j++) {
        const sj = sma[j];
        const aj = atr[j];
        const cj = candles[j]!;
        if (sj != null && aj != null && aj > 0 && cj.l < sj) {
          const pct = ((sj - cj.l) / sj) * 100;
          const am = (sj - cj.l) / aj;
          if (cj.l < minLow) {
            minLow = cj.l;
            troughIdx = j;
          }
          if (pct > maxPct) maxPct = pct;
          if (am > maxAtr) maxAtr = am;
          const vr = volRatio(cj.v, volSma[j] ?? null);
          if (Number.isFinite(vr) && (!Number.isFinite(maxVolR) || vr > maxVolR)) maxVolR = vr;
        }
        if (sj != null && cj.c >= sj) {
          recovered = true;
          end = j;
          break;
        }
        end = j;
      }
    }

    const smaTrough = sma[troughIdx] ?? s;
    const atrTrough = atr[troughIdx] ?? a;
    const recBars = end - start + 1;
    const bounce =
      recovered && minLow > 0 ? ((candles[end]!.c - minLow) / minLow) * 100 : null;

    events.push({
      startT: candles[start]!.t,
      endT: candles[end]!.t,
      troughT: candles[troughIdx]!.t,
      startIdx: start,
      endIdx: end,
      recovered,
      recoveryCandles: recBars,
      durationMin: recBars * intervalMin,
      minLow,
      smaAtTrough: smaTrough,
      atrAtTrough: atrTrough,
      undershootPct: maxPct,
      undershootAtr: maxAtr,
      firstUndershootPct: firstPct,
      bouncePct: bounce,
      uptrend,
      closeStart: bar.c,
      volRatioTrough: volRatio(candles[troughIdx]!.v, volSma[troughIdx] ?? null),
      volRatioMax: maxVolR,
      volumeDump: defaultDump(candles[troughIdx]!, volSma[troughIdx] ?? null),
    });

    if (recovered) {
      i = end + 1;
    } else {
      let k = end + 1;
      while (k < n && (sma[k] == null || candles[k]!.c < (sma[k] as number))) k += 1;
      i = k;
    }
  }

  return events;
}

function relativeSpread(q: { p10: number; p90: number; p50: number }): number {
  if (!Number.isFinite(q.p50) || q.p50 === 0) return NaN;
  return (q.p90 - q.p10) / Math.abs(q.p50);
}

function gradeAtr(cvPct: number, cvAtr: number, corr: number): "strong" | "partial" | "weak" {
  const cvWin = Number.isFinite(cvPct) && Number.isFinite(cvAtr) && cvAtr < cvPct * 0.85;
  const corrHigh = Number.isFinite(corr) && corr >= 0.45;
  if (cvWin && corrHigh) return "strong";
  if (cvWin || corrHigh) return "partial";
  return "weak";
}

function buildRegimes(recovered: DipEvent[]): RegimeRow[] {
  if (recovered.length < 8) return [];
  const atrPct = recovered.map((e) =>
    e.smaAtTrough > 0 ? (e.atrAtTrough / e.smaAtTrough) * 100 : 0,
  );
  const sortedA = atrPct.slice().sort((a, b) => a - b);
  const cuts = [0.25, 0.5, 0.75].map((q) => quantile(sortedA, q));
  const buckets: DipEvent[][] = [[], [], [], []];
  const mids = [0, 0, 0, 0];
  recovered.forEach((e, idx) => {
    const v = atrPct[idx]!;
    const b = v <= cuts[0]! ? 0 : v <= cuts[1]! ? 1 : v <= cuts[2]! ? 2 : 3;
    buckets[b]!.push(e);
    mids[b] += v;
  });
  const labels = ["ATR% thấp", "ATR% trung bình thấp", "ATR% trung bình cao", "ATR% cao"];
  return buckets.map((bucket, i) => {
    const pcts = bucket.map((e) => e.undershootPct).sort((a, b) => a - b);
    const atrs = bucket.map((e) => e.undershootAtr).sort((a, b) => a - b);
    return {
      label: labels[i]!,
      atrPctMid: bucket.length ? mids[i]! / bucket.length : NaN,
      n: bucket.length,
      medPct: quantile(pcts, 0.5),
      medAtr: quantile(atrs, 0.5),
    };
  });
}

function buildVolume(events: DipEvent[]): VolumeVerdict {
  const high = events.filter((e) => e.volumeDump);
  const low = events.filter((e) => !e.volumeDump);
  const climax = events.filter(
    (e) => e.volumeDump && Number.isFinite(e.volRatioTrough) && e.volRatioTrough >= CLIMAX_VOL_MULT,
  );
  const rec = events.filter((e) => e.recovered);
  const fail = events.filter((e) => !e.recovered);
  const recVol = rec.map((e) => e.volRatioTrough).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const failVol = fail.map((e) => e.volRatioTrough).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const rate = (xs: DipEvent[]) => (xs.length ? xs.filter((e) => e.recovered).length / xs.length : NaN);
  return {
    period: VOL_SMA_PERIOD,
    dumpMult: VOL_DUMP_MULT,
    recoveredP50: quantile(recVol, 0.5),
    failedP50: quantile(failVol, 0.5),
    recoveryHigh: rate(high),
    recoveryLow: rate(low),
    nHigh: high.length,
    nLow: low.length,
    climaxMult: CLIMAX_VOL_MULT,
    recoveryClimax: rate(climax),
    nClimax: climax.length,
    weak: true,
    deltaE: NaN,
    skipShare: NaN,
    nSkip: 0,
    nBase: 0,
    volP50Sma: NaN,
    volP50Stop: NaN,
    dumpShare: NaN,
    books: {
      upAny: emptyVolMini(),
      upSkip: emptyVolMini(),
      allAny: emptyVolMini(),
      allSkip: emptyVolMini(),
    },
  };
}

function emptyVolMini(): VolumeMini {
  return { n: 0, expectancy: NaN, dumpShare: NaN, nSkipped: 0 };
}

function toVolMini(run: { n: number; expectancy: number; dumpShare: number; nSkipped: number }): VolumeMini {
  return { n: run.n, expectancy: run.expectancy, dumpShare: run.dumpShare, nSkipped: run.nSkipped };
}

function attachVolumeEffect(
  base: VolumeVerdict,
  input: {
    candles: Candle[];
    sma: Array<number | null>;
    atr: Array<number | null>;
    smaTrend: Array<number | null>;
    lookforward: number;
    intervalMin: number;
  },
): VolumeVerdict {
  const mk = (trend: "up" | "all", skip: number) =>
    backtestFade({
      candles: input.candles,
      sma: input.sma,
      atr: input.atr,
      smaTrend: input.smaTrend,
      lookforward: input.lookforward,
      intervalMin: input.intervalMin,
      entryAtr: 1.5,
      stopAtr: STOP_ATR,
      feeBps: FEE_BPS,
      uptrendOnly: trend === "up",
      trendFilter: trend,
      skipVolMult: skip,
      requireVolMult: 0,
    });
  const upAny = mk("up", 0);
  const upSkip = mk("up", CLIMAX_VOL_MULT);
  const allAny = mk("all", 0);
  const allSkip = mk("all", CLIMAX_VOL_MULT);
  const deltaE = upSkip.expectancy - upAny.expectancy;
  const denom = upAny.n + upSkip.nSkipped;
  const skipShare = denom > 0 ? upSkip.nSkipped / denom : NaN;
  const weak =
    upAny.n >= 8 &&
    Number.isFinite(deltaE) &&
    Math.abs(deltaE) < 0.03 &&
    (Number.isFinite(skipShare) ? skipShare < 0.08 : true);
  return {
    ...base,
    weak,
    deltaE,
    skipShare,
    nSkip: upSkip.nSkipped,
    nBase: upAny.n,
    volP50Sma: upAny.volP50Sma,
    volP50Stop: upAny.volP50Stop,
    dumpShare: upAny.dumpShare,
    books: {
      upAny: toVolMini(upAny),
      upSkip: toVolMini(upSkip),
      allAny: toVolMini(allAny),
      allSkip: toVolMini(allSkip),
    },
  };
}

export function runStudy(input: {
  candles: Candle[];
  symbol: string;
  interval: Interval;
  source: string;
  days: number;
}): StudyResult {
  const { candles, symbol, interval, source, days } = input;
  if (candles.length < 80) {
    throw new Error("Không đủ nến để tính SMA15 / ATR");
  }
  const closes = candles.map((c) => c.c);
  const sma = computeSma(closes, SMA_PERIOD);
  const sma50 = computeSma(closes, TREND_SMA_PERIOD);
  const rsiFast = computeRsi(closes, RSI_FAST);
  const rsiSlow = computeRsi(closes, RSI_SLOW);
  const cti = computeCti(closes, CTI_PERIOD);
  const atr = computeAtr(candles, ATR_PERIOD);
  const minutes = intervalMinutes(interval);
  const lookforward = Math.max(4, Math.round((LOOKFORWARD_HOURS * 60) / minutes));
  const emaTune = runEmaTune({
    candles,
    sma,
    atr,
    lookforward,
    intervalMin: minutes,
  });
  const emaPeriod = emaTune.winner;
  const ema20 = computeEma(closes, emaPeriod);
  const bb = computeBb(closes, BB_PERIOD, BB_K);
  const bbRank = rankInWindow(bb.widthPct, BB_RANK_BARS);
  const maType = runMaType({
    candles,
    sma,
    atr,
    lookforward,
    intervalMin: minutes,
    emaWinner: emaPeriod,
    emaCells: emaTune.cells,
  });

  const events = detectDips(candles, sma, atr, sma50, lookforward, minutes);

  const stats = {
    all: buildGroup(events),
    up: buildGroup(events.filter((e) => e.uptrend)),
    down: buildGroup(events.filter((e) => !e.uptrend)),
  };

  const recovered = events.filter((e) => e.recovered && e.undershootAtr >= MIN_SIGNAL_ATR);
  const pcts = recovered.map((e) => e.undershootPct);
  const atrs = recovered.map((e) => e.undershootAtr);
  const atrPcts = recovered.map((e) =>
    e.smaAtTrough > 0 ? (e.atrAtTrough / e.smaAtTrough) * 100 : 0,
  );
  const corr = pearson(atrPcts, pcts);
  const cvPct = stats.all.pct.cv;
  const cvAtr = stats.all.atr.cv;

  const volSmaLive = computeSma(candles.map((c) => c.v), VOL_SMA_PERIOD);
  const last = candles[candles.length - 1]!;
  const lastSma = sma[sma.length - 1] ?? null;
  const lastAtr = atr[atr.length - 1] ?? null;
  const lastSma50 = sma50[sma50.length - 1] ?? null;
  const lastEma20 = ema20[ema20.length - 1] ?? null;
  const lastRsiFast = rsiFast[rsiFast.length - 1] ?? null;
  const lastRsiSlow = rsiSlow[rsiSlow.length - 1] ?? null;
  const lastCti = cti[cti.length - 1] ?? null;
  const lastBb = liveBb({
    widthPct: bb.widthPct,
    rank: bbRank,
    pctB: bb.pctB,
    lower: bb.lower,
    lastLow: last.l,
  });
  const lastVolSma = volSmaLive[volSmaLive.length - 1] ?? null;
  const lastVolRatio = volRatio(last.v, lastVolSma);
  const lastVolDump = defaultDump(last, lastVolSma);
  const lastVolClimax = isVolumeDump(last, lastVolSma, CLIMAX_VOL_MULT);
  const below = lastSma != null && last.l < lastSma;
  const undershootPct =
    lastSma && lastSma > 0 ? Math.max(0, ((lastSma - last.l) / lastSma) * 100) : 0;
  const undershootAtr =
    lastSma != null && lastAtr && lastAtr > 0 ? Math.max(0, (lastSma - last.l) / lastAtr) : 0;
  const sortedPct = pcts.slice().sort((a, b) => a - b);

  const inDip = new Array<boolean>(candles.length).fill(false);
  for (const e of events) {
    for (let k = e.startIdx; k <= e.endIdx; k++) inDip[k] = true;
  }

  const sliceFrom = Math.max(0, candles.length - CHART_BARS);
  const chart: ChartCandle[] = [];
  for (let i = sliceFrom; i < candles.length; i++) {
    const c = candles[i]!;
    chart.push({
      ...c,
      sma: sma[i] ?? null,
      atr: atr[i] ?? null,
      inDip: inDip[i] ?? false,
    });
  }

  const pctCap = Number.isFinite(stats.all.pct.p95) ? stats.all.pct.p95 * 1.15 : undefined;
  const atrCap = Number.isFinite(stats.all.atr.p95) ? stats.all.atr.p95 * 1.15 : undefined;
  const recovery = buildRecovery({
    events,
    candles,
    ema20,
    emaPeriod,
    live: {
      below,
      undershootAtr,
      aboveEma20: lastEma20 != null ? last.c > lastEma20 : false,
    },
    intervalMin: minutes,
  });
  const backtest = runBacktests({
    candles,
    sma,
    atr,
    smaTrend: sma50,
    ema20,
    recoveryCells: recovery.cells,
    lookforward,
    intervalMin: minutes,
  });
  const edge = runEdgeGrid({
    candles,
    sma,
    atr,
    smaTrend: sma50,
    lookforward,
    intervalMin: minutes,
  });
  const depth = runDepthSweep({
    candles,
    sma,
    atr,
    ema20,
    emaPeriod,
    recoveryCells: recovery.cells,
    lookforward,
    intervalMin: minutes,
  });
  const trendCompare = runTrendCompare({
    candles,
    sma,
    atr,
    sma50,
    ema20,
    emaPeriod,
    lookforward,
    intervalMin: minutes,
  });
  const osc = runOscCompare({
    candles,
    sma,
    atr,
    ema20,
    emaPeriod,
    rsiFast,
    rsiSlow,
    cti,
    lookforward,
    intervalMin: minutes,
  });
  const bbWidth = runBbWidth({
    candles,
    sma,
    atr,
    ema20,
    emaPeriod,
    events,
    lookforward,
    intervalMin: minutes,
  });
  const volume = attachVolumeEffect(buildVolume(events), {
    candles,
    sma,
    atr,
    smaTrend: sma50,
    lookforward,
    intervalMin: minutes,
  });

  return {
    symbol,
    interval,
    source,
    days,
    smaPeriod: SMA_PERIOD,
    atrPeriod: ATR_PERIOD,
    lookforwardHours: LOOKFORWARD_HOURS,
    lookforwardCandles: lookforward,
    from: candles[0]!.t,
    to: last.t,
    candleCount: candles.length,
    live: {
      lastT: last.t,
      last: last.c,
      sma: lastSma,
      atr: lastAtr,
      atrPct: lastSma && lastAtr && lastSma > 0 ? (lastAtr / lastSma) * 100 : null,
      below,
      undershootPct,
      undershootAtr,
      pctileAmongRecovered: below ? percentileOf(sortedPct, undershootPct) : null,
      vol: last.v,
      volSma: lastVolSma,
      volRatio: lastVolRatio,
      volDump: lastVolDump,
      volClimax: lastVolClimax,
      sma50: lastSma50,
      ema20: lastEma20,
      aboveSma50: lastSma50 != null ? last.c > lastSma50 : false,
      aboveEma20: lastEma20 != null ? last.c > lastEma20 : false,
      rsiFast: lastRsiFast,
      rsiSlow: lastRsiSlow,
      cti: lastCti,
      oscCombo:
        lastRsiFast != null &&
        lastRsiSlow != null &&
        lastCti != null &&
        lastRsiFast < lastRsiSlow &&
        lastRsiSlow > RSI_SLOW_MIN &&
        lastCti <= CTI_MAX,
      emaPeriod,
      ...lastBb,
    },
    stats,
    atrVerdict: {
      atrMoreStable: Number.isFinite(cvAtr) && Number.isFinite(cvPct) && cvAtr < cvPct,
      cvPct,
      cvAtr,
      corrAtrPctVsDumpPct: corr,
      relativeSpreadPct: relativeSpread(stats.all.pct),
      relativeSpreadAtr: relativeSpread(stats.all.atr),
      grade: gradeAtr(cvPct, cvAtr, corr),
    },
    regimes: buildRegimes(recovered),
    histPct: histogram(pcts, 18, pctCap),
    histAtr: histogram(atrs, 18, atrCap),
    events: events.slice(-120).reverse(),
    chart,
    volume,
    backtest,
    edge,
    depth,
    trendCompare,
    osc,
    recovery,
    emaTune,
    maType,
    bb: bbWidth,
  };
}
