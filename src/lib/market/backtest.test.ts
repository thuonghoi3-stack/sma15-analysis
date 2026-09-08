import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { backtestFade, FEE_BPS, runEdgeGrid } from "./backtest.ts";
import { runDepthSweep } from "./depth-sweep.ts";
import { computeAtr, computeEma, computeSma } from "./indicators.ts";
import { runTrendCompare } from "./trend-compare.ts";
import type { Candle, RecoveryCell } from "./types.ts";

function bar(t: number, o: number, h: number, l: number, c: number): Candle {
  return { t, o, h, l, c, v: 1 };
}

describe("backtestFade", () => {
  it("takes a limit fill on a wick below SMA then exits on close back above", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 30; i++) {
      candles.push(bar(t, 100, 100.2, 99.8, 100));
      t += 300_000;
    }
    // dump wick to 98.5 then recover
    candles[25] = bar(candles[25]!.t, 100, 100.2, 98.5, 100.1);
    const closes = candles.map((c) => c.c);
    const sma = computeSma(closes, 15);
    const atr = computeAtr(candles, 14);
    const smaTrend = computeSma(closes, 50);
    const run = backtestFade({
      candles,
      sma,
      atr,
      smaTrend,
      entryAtr: 1,
      stopAtr: 8,
      lookforward: 12,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
    });
    assert.ok(run.n >= 1);
    assert.ok(run.wins >= 1);
    assert.ok(run.compoundPct > 0);
  });

  it("stops out when price continues through the stop", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      const px = i < 20 ? 100 : 100 - (i - 20) * 0.8;
      candles.push(bar(t, px + 0.1, px + 0.3, px - 0.9, px));
      t += 300_000;
    }
    const closes = candles.map((c) => c.c);
    const run = backtestFade({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 0.6,
      stopAtr: 0.4,
      lookforward: 48,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: FEE_BPS,
    });
    assert.ok(run.n >= 1);
    assert.ok(run.trades.some((tr) => tr.reason === "stop") || run.compoundPct < 0);
  });

  it("skips a high-volume sell dump and can enter on a later quiet bar", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      candles.push(bar(t, 100, 100.2, 99.8, 100));
      t += 300_000;
    }
    candles[30] = { t: candles[30]!.t, o: 100, h: 100.1, l: 98.5, c: 99.2, v: 80 };
    candles[31] = { t: candles[31]!.t, o: 99.3, h: 100.3, l: 98.4, c: 100.15, v: 1 };
    const closes = candles.map((c) => c.c);
    const args = {
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 1,
      stopAtr: 8,
      lookforward: 12,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
    };
    const raw = backtestFade(args);
    const filtered = backtestFade({ ...args, skipVolMult: 2 });
    assert.ok(raw.n >= 1);
    assert.equal(raw.nSkipped, 0);
    assert.ok(filtered.nSkipped >= 1);
    assert.ok(filtered.n >= 1);
    assert.ok(filtered.trades.every((tr) => !Number.isFinite(tr.volRatio) || tr.volRatio < 10));
  });

  it("requireVolMult only takes climax dump bars", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      candles.push(bar(t, 100, 100.2, 99.8, 100));
      t += 300_000;
    }
    candles[30] = { t: candles[30]!.t, o: 100, h: 100.1, l: 98.5, c: 99.2, v: 80 };
    candles[31] = { t: candles[31]!.t, o: 99.3, h: 100.3, l: 98.4, c: 100.15, v: 1 };
    const closes = candles.map((c) => c.c);
    const climax = backtestFade({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 1,
      stopAtr: 8,
      lookforward: 12,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
      requireVolMult: 2.5,
    });
    assert.ok(climax.n >= 1);
    assert.equal(climax.volMode, "require");
    assert.ok(climax.trades.every((tr) => tr.volRatio >= 2.5));
  });

  it("trendFilter down skips bars while price is above SMA50", () => {
    const candles: Candle[] = [];
    let t = 0;
    let px = 90;
    for (let i = 0; i < 80; i++) {
      px = 90 + i * 0.4;
      candles.push(bar(t, px, px + 0.2, px - 0.2, px));
      t += 300_000;
    }
    const last = candles[70]!;
    candles[70] = bar(last.t, last.c, last.h, last.c - 8, last.c + 0.1);
    const closes = candles.map((c) => c.c);
    const args = {
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 1,
      stopAtr: 8,
      lookforward: 12,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
    };
    const up = backtestFade({ ...args, trendFilter: "up" });
    const down = backtestFade({ ...args, trendFilter: "down" });
    assert.ok(up.n >= 1);
    assert.equal(down.n, 0);
  });

  it("runEdgeGrid returns 9 cells and a verdict", () => {
    const candles: Candle[] = [];
    let t = 0;
    let px = 100;
    for (let i = 0; i < 200; i++) {
      const dump = i % 18 === 10;
      const o = px;
      const c = dump ? px + 0.05 : px;
      const l = dump ? px - 1.2 : px - 0.15;
      candles.push(bar(t, o, px + 0.2, l, c));
      px = px * 0.999 + c * 0.001;
      t += 300_000;
    }
    const closes = candles.map((c) => c.c);
    const grid = runEdgeGrid({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      lookforward: 12,
      intervalMin: 5,
    });
    assert.equal(grid.cells.length, 9);
    assert.ok(["edge", "filter", "none"].includes(grid.verdict));
    assert.ok(grid.best.n >= 0);
  });

  it("depth sweep occupancy falls as ATR entry deepens", () => {
    const candles: Candle[] = [];
    let t = 0;
    let px = 100;
    for (let i = 0; i < 260; i++) {
      const dump = i % 16 === 9;
      const o = px;
      const c = dump ? px + 0.04 : px;
      const l = dump ? px - 1.4 : px - 0.12;
      candles.push(bar(t, o, px + 0.2, l, c));
      px = px * 0.9995 + c * 0.0005;
      t += 300_000;
    }
    const closes = candles.map((c) => c.c);
    const sma = computeSma(closes, 15);
    const atr = computeAtr(candles, 14);
    const ema = computeEma(closes, 14);
    const report = runDepthSweep({
      candles,
      sma,
      atr,
      ema20: ema,
      emaPeriod: 14,
      recoveryCells: fakeCells(6),
      lookforward: 12,
      intervalMin: 5,
    });
    assert.equal(report.up.length, 8);
    assert.equal(report.forecast.length, 8);
    assert.equal(report.all.length, 8);
    assert.ok(report.up[0]!.n >= report.up[report.up.length - 1]!.n);
    assert.ok(["sweet-spot", "deeper-helps", "shallow-better", "flat"].includes(report.verdict));
  });

  it("trend compare buckets partition all-trend trades", () => {
    const candles: Candle[] = [];
    let t = 0;
    let px = 100;
    for (let i = 0; i < 220; i++) {
      const dump = i % 18 === 10;
      const o = px;
      const c = dump ? px + 0.05 : px;
      const l = dump ? px - 1.2 : px - 0.15;
      candles.push(bar(t, o, px + 0.2, l, c));
      px = px * 0.999 + c * 0.001;
      t += 300_000;
    }
    const closes = candles.map((c) => c.c);
    const cmp = runTrendCompare({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      sma50: computeSma(closes, 50),
      ema20: computeEma(closes, 20),
      emaPeriod: 20,
      lookforward: 12,
      intervalMin: 5,
    });
    const all = cmp.books.find((b) => b.key === "all");
    assert.ok(all);
    assert.equal(cmp.buckets.reduce((s, b) => s + b.n, 0), all!.n);
    assert.ok(["sma50", "ema20", "and", "tie"].includes(cmp.winner));
  });

  it("skips entry when predicted recovery is 2 candles or fewer", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 30; i++) {
      candles.push(bar(t, 100, 100.2, 99.8, 100));
      t += 300_000;
    }
    candles[25] = bar(candles[25]!.t, 100, 100.2, 98.5, 100.1);
    const closes = candles.map((c) => c.c);
    const run = backtestFade({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 1,
      stopAtr: 8,
      lookforward: 12,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
      recoveryCells: fakeCells(1),
      emaSeries: computeEma(closes, 14),
      minForecastBars: 2,
      tpSlackBars: 2,
    });
    assert.equal(run.n, 0);
    assert.ok(run.nSkipForecast >= 1);
  });

  it("takes timed TP at predicted bars minus 2", () => {
    const candles: Candle[] = [];
    let t = 0;
    for (let i = 0; i < 40; i++) {
      candles.push(bar(t, 100, 100.2, 99.8, 100));
      t += 300_000;
    }
    for (let k = 28; k < 36; k++) {
      candles[k] = bar(candles[k]!.t, 99.4, 99.6, 98.4, 99.2);
    }
    const closes = candles.map((c) => c.c);
    const run = backtestFade({
      candles,
      sma: computeSma(closes, 15),
      atr: computeAtr(candles, 14),
      smaTrend: computeSma(closes, 50),
      entryAtr: 0.8,
      stopAtr: 8,
      lookforward: 48,
      intervalMin: 5,
      uptrendOnly: false,
      feeBps: 0,
      recoveryCells: fakeCells(6),
      emaSeries: computeEma(closes, 14),
      minForecastBars: 2,
      tpSlackBars: 2,
    });
    assert.ok(run.n >= 1);
    assert.ok(run.trades.some((tr) => tr.reason === "tp"));
    const tp = run.trades.find((tr) => tr.reason === "tp");
    assert.ok(tp);
    assert.equal(tp.bars, 4);
  });
});

function fakeCells(p50: number): RecoveryCell[] {
  const depths = [0.25, 0.5, 1, 1.5, 2.5];
  const trends = ["ema", "all", "down"] as const;
  const out: RecoveryCell[] = [];
  for (const trend of trends) {
    for (let i = 0; i < depths.length; i++) {
      out.push({
        trend,
        depthLo: depths[i]!,
        depthHi: depths[i + 1] ?? null,
        n: 20,
        nRec: 20,
        recRate: 1,
        p50,
        p75: p50 + 2,
        p90: p50 + 4,
      });
    }
  }
  return out;
}
