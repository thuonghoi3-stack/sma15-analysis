import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectDips, runStudy } from "./analyze.ts";
import { buildRecovery } from "./recovery.ts";
import { pickEmaPeriod } from "./ema-tune.ts";
import { computeAtr, computeBb, computeCti, computeEma, computeRsi, computeSma, rankInWindow } from "./indicators.ts";
import { runBbWidth } from "./bb-width.ts";
import { percentileOf, quantile, summarize } from "./stats.ts";
import type { Candle, DipEvent } from "./types.ts";

function bar(t: number, c: number, extra?: Partial<Candle>): Candle {
  const range = 0.2;
  return {
    t,
    o: extra?.o ?? c,
    h: extra?.h ?? c + range,
    l: extra?.l ?? c - range,
    c,
    v: extra?.v ?? 1,
  };
}

function series(n: number, price: number, start = 0, step = 300_000): Candle[] {
  const out: Candle[] = [];
  for (let i = 0; i < n; i++) out.push(bar(start + i * step, price));
  return out;
}

describe("indicators", () => {
  it("SMA of a flat series equals the price", () => {
    const closes = Array.from({ length: 30 }, () => 100);
    const sma = computeSma(closes, 15);
    assert.equal(sma[14], 100);
    assert.equal(sma[29], 100);
    assert.equal(sma[13], null);
  });

  it("ATR is positive and stable on a regular range", () => {
    const candles = series(40, 100);
    const atr = computeAtr(candles, 14);
    assert.ok(atr[13] != null && atr[13]! > 0);
    assert.ok(Math.abs((atr[39] as number) - (atr[20] as number)) < 1e-9);
  });

  it("BB width is ~0 on a flat series and pctB is 0.5", () => {
    const closes = Array.from({ length: 40 }, () => 100);
    const bb = computeBb(closes, 20, 2);
    assert.equal(bb.mid[19], 100);
    assert.ok(bb.widthPct[39] != null && bb.widthPct[39]! < 1e-9);
    assert.ok(bb.pctB[39] != null && Math.abs(bb.pctB[39]! - 0.5) < 1e-9);
  });

  it("BB rank is low after a quiet stretch following a noisy stretch", () => {
    const closes: number[] = [];
    for (let i = 0; i < 80; i++) closes.push(100 + (i % 2 === 0 ? 4 : -4));
    for (let i = 0; i < 80; i++) {
      const amp = 4 * (1 - i / 79);
      closes.push(100 + (i % 2 === 0 ? amp : -amp));
    }
    const bb = computeBb(closes, 20, 2);
    const rank = rankInWindow(bb.widthPct, 160);
    const last = rank[rank.length - 1];
    const noisy = rank[40];
    assert.ok(bb.widthPct[40] != null && bb.widthPct[159] != null);
    assert.ok(bb.widthPct[159]! < (bb.widthPct[40]! as number) / 2);
    assert.ok(last != null && last < 0.2);
    assert.ok(noisy != null && noisy > 0.4);
  });

  it("EMA of a flat series equals the price after seed", () => {
    const closes = Array.from({ length: 40 }, () => 100);
    const ema = computeEma(closes, 20);
    assert.equal(ema[18], null);
    assert.equal(ema[19], 100);
    assert.equal(ema[39], 100);
  });

  it("EMA weights a last-bar spike more than SMA", () => {
    const closes = Array.from({ length: 40 }, () => 100);
    closes[39] = 200;
    const sma = computeSma(closes, 20);
    const ema = computeEma(closes, 20);
    assert.ok(sma[39] != null && ema[39] != null);
    assert.ok(ema[39]! > sma[39]!);
    assert.ok(ema[39]! < 200);
  });

  it("RSI of a flat series is 50", () => {
    const closes = Array.from({ length: 40 }, () => 100);
    const rsi = computeRsi(closes, 7);
    assert.equal(rsi[6], null);
    assert.equal(rsi[7], 50);
    assert.equal(rsi[39], 50);
  });

  it("RSI rises after a rally and CTI is positive on a rising line", () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i);
    const rsi = computeRsi(closes, 7);
    const cti = computeCti(closes, 20);
    assert.ok(rsi[39] != null && rsi[39]! > 70);
    assert.ok(cti[39] != null && cti[39]! > 0.9);
  });
});

describe("quantiles", () => {
  it("matches textbook percentiles on 1..100", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1);
    assert.equal(quantile(xs, 0.5), 50.5);
    assert.equal(quantile(xs, 0), 1);
    assert.equal(quantile(xs, 1), 100);
    const s = summarize(xs);
    assert.ok(Math.abs(s.mean - 50.5) < 1e-9);
    assert.ok(percentileOf(xs, 50) >= 49 && percentileOf(xs, 50) <= 51);
  });
});

describe("dip detection", () => {
  it("measures a same-bar wick below SMA then recovery", () => {
    const candles = series(30, 100);
    candles[25] = bar(candles[25]!.t, 100, { l: 99, h: 100.2, o: 100.1, c: 100.05 });
    const closes = candles.map((c) => c.c);
    const sma = computeSma(closes, 15);
    const atr = computeAtr(candles, 14);
    const events = detectDips(candles, sma, atr, computeSma(closes, 50), 48, 5);
    const hit = events.find((e) => e.startT === candles[25]!.t);
    assert.ok(hit);
    assert.equal(hit!.recovered, true);
    assert.equal(hit!.recoveryCandles, 1);
    assert.ok(hit!.undershootPct > 0.7 && hit!.undershootPct < 1.2);
    assert.ok(hit!.undershootAtr > 0);
  });

  it("tracks a multi-bar dump and bounce", () => {
    const candles = series(40, 100);
    candles[28] = bar(candles[28]!.t, 99.6, { l: 99.4, h: 100, o: 100, c: 99.6 });
    candles[29] = bar(candles[29]!.t, 99.2, { l: 99.0, h: 99.7, o: 99.6, c: 99.2 });
    candles[30] = bar(candles[30]!.t, 99.1, { l: 98.8, h: 99.4, o: 99.2, c: 99.1 });
    candles[31] = bar(candles[31]!.t, 100.2, { l: 99.0, h: 100.4, o: 99.1, c: 100.2 });
    const closes = candles.map((c) => c.c);
    const sma = computeSma(closes, 15);
    const atr = computeAtr(candles, 14);
    const events = detectDips(candles, sma, atr, computeSma(closes, 50), 48, 5);
    const dump = events.find((e) => e.startT === candles[28]!.t);
    assert.ok(dump);
    assert.equal(dump!.recovered, true);
    assert.ok(dump!.minLow <= 98.81);
    assert.ok(dump!.undershootPct > 1);
    assert.ok((dump!.bouncePct ?? 0) > 1);
  });
});

describe("runStudy", () => {
  it("returns ATR and percent stats on a generated mean-reverting tape", () => {
    const candles: Candle[] = [];
    let t = 1_700_000_000_000;
    let px = 100;
    for (let i = 0; i < 800; i++) {
      const cycle = i % 40;
      let c = px;
      let l = px - 0.15;
      if (cycle === 20) {
        l = px - 0.8;
        c = px - 0.2;
      } else if (cycle === 21) {
        l = px - 1.1;
        c = px + 0.1;
      }
      candles.push({ t, o: px, h: Math.max(px, c) + 0.1, l, c, v: 10 });
      px = c * 0.02 + px * 0.98;
      t += 300_000;
    }
    const study = runStudy({
      candles,
      symbol: "TESTUSDT",
      interval: "5m",
      source: "test",
      days: 3,
    });
    assert.ok(study.stats.all.nRecovered > 5);
    assert.ok(study.stats.all.pct.p50 > 0);
    assert.ok(study.stats.all.atr.p50 > 0);
    assert.equal(study.smaPeriod, 15);
    assert.ok(study.chart.length > 0);
    assert.equal(study.edge.cells.length, 9);
    assert.ok(["edge", "filter", "none"].includes(study.edge.verdict));
    assert.equal(study.trendCompare.books.length, 4);
    assert.equal(study.trendCompare.buckets.length, 4);
    assert.equal(study.osc.books.length, 4);
    assert.equal(study.osc.pairs.length, 4);
    assert.equal(study.osc.anti.key, "ctiPos");
    assert.equal(study.recovery.cells.length, 15);
    assert.equal(study.emaTune.cells.length, 11);
    assert.equal(study.bb.books.length, 5);
    assert.ok(["squeeze", "expand", "below", "proxy", "none"].includes(study.bb.verdict));
    assert.ok(study.emaTune.cells.some((c) => c.period === study.emaTune.winner));
    assert.equal(study.live.emaPeriod, study.emaTune.winner);
    assert.equal(study.maType.pairs.length, 11);
    assert.ok(["ema", "sma", "tie"].includes(study.maType.winner));
  });
});

describe("buildRecovery", () => {
  it("deeper ATR dumps take more candles to recover", () => {
    const candles: Candle[] = series(40, 100);
    const ema20 = candles.map(() => 99);
    const events: DipEvent[] = [];
    for (let i = 0; i < 12; i++) {
      events.push(dip(20, 0.4, 1, true));
      events.push(dip(21, 2.2, 12, true));
    }
    const report = buildRecovery({
      events,
      candles,
      ema20,
      emaPeriod: 20,
      live: { below: true, undershootAtr: 1.2, aboveEma20: true },
      intervalMin: 5,
    });
    const shallow = report.cells.find((c) => c.trend === "ema" && c.depthLo === 0.25);
    const deep = report.cells.find((c) => c.trend === "ema" && c.depthLo === 1.5);
    assert.ok(shallow && deep);
    assert.ok(deep.p50 > shallow.p50);
    assert.ok(report.slope > 0);
    assert.equal(report.forecast?.source, "live");
    assert.equal(report.forecast?.depthLo, 1);
  });
});

describe("pickEmaPeriod", () => {
  it("prefers the period with higher walk-forward min among both-half-positive books", () => {
    const cell = (
      period: number,
      n: number,
      wr: number,
      e: number,
      first: number,
      second: number,
    ) => ({
      period,
      n,
      expectancy: e,
      winRate: wr,
      stopShare: 0.1,
      firstE: first,
      secondE: second,
      nFirst: Math.floor(n / 2),
      nSecond: Math.ceil(n / 2),
      stability: Math.min(first, second),
    });
    const winner = pickEmaPeriod([
      cell(20, 80, 0.72, 0.07, 0.08, 0.05),
      cell(14, 90, 0.79, 0.1, 0.12, 0.08),
      cell(10, 120, 0.75, 0.09, 0.09, 0.09),
      cell(50, 150, 0.53, -0.01, -0.02, 0.01),
    ]);
    assert.equal(winner, 10);
  });
});

describe("runBbWidth", () => {
  it("squeeze occupancy never exceeds the unfiltered EMA-up book", () => {
    const candles: Candle[] = [];
    let t = 0;
    let px = 100;
    for (let i = 0; i < 400; i++) {
      const dump = i % 18 === 10;
      const o = px;
      const c = dump ? px + 0.05 : px;
      const l = dump ? px - 1.3 : px - 0.12;
      candles.push(bar(t, c, { o, h: px + 0.2, l, v: 8 }));
      px = px * 0.9995 + c * 0.0005;
      t += 300_000;
    }
    const closes = candles.map((c) => c.c);
    const sma = computeSma(closes, 15);
    const atr = computeAtr(candles, 14);
    const ema = computeEma(closes, 14);
    const events = detectDips(candles, sma, atr, computeSma(closes, 50), 12, 5);
    const report = runBbWidth({
      candles,
      sma,
      atr,
      ema20: ema,
      emaPeriod: 14,
      events,
      lookforward: 12,
      intervalMin: 5,
    });
    const all = report.books.find((b) => b.key === "all")!;
    const squeeze = report.books.find((b) => b.key === "squeeze")!;
    assert.ok(all);
    assert.ok(squeeze);
    assert.ok(squeeze.n <= all.n);
    assert.equal(report.period, 20);
  });
});

function dip(startIdx: number, atr: number, bars: number, recovered: boolean): DipEvent {
  return {
    startT: startIdx,
    endT: startIdx + bars,
    troughT: startIdx,
    startIdx,
    endIdx: startIdx + bars,
    recovered,
    recoveryCandles: bars,
    durationMin: bars * 5,
    minLow: 99,
    smaAtTrough: 100,
    atrAtTrough: 1,
    undershootPct: atr * 0.1,
    undershootAtr: atr,
    firstUndershootPct: atr * 0.1,
    bouncePct: 0.4,
    uptrend: true,
    closeStart: 100,
    volRatioTrough: 1,
    volRatioMax: 1,
    volumeDump: false,
  };
}
