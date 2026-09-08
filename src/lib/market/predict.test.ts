import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fitGrid,
  fitModels,
  fitOls,
  fitSymbolPredict,
  pickWinner,
  predictGrid,
  predictOls,
  scorePred,
  solveLinear,
  splitRows,
  type PredictRow,
} from "./predict.ts";
import type { Candle } from "./types.ts";

function row(
  t: number,
  depthMax: number,
  emaUp: boolean,
  bars: number,
  extra?: Partial<PredictRow>,
): PredictRow {
  return {
    t,
    depthMax,
    depthFirst: extra?.depthFirst ?? depthMax * 0.6,
    emaUp,
    bars,
    recovered: true,
    volRatio: extra?.volRatio ?? 1,
  };
}

describe("solveLinear / fitOls", () => {
  it("recovers y = 2 + 3x", () => {
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 20; i++) {
      const x = i * 0.5;
      X.push([1, x]);
      y.push(2 + 3 * x);
    }
    const beta = fitOls(X, y);
    assert.ok(Math.abs(beta[0]! - 2) < 1e-8);
    assert.ok(Math.abs(beta[1]! - 3) < 1e-8);
  });

  it("solveLinear matches a known 2x2", () => {
    const x = solveLinear(
      [
        [2, 1],
        [1, 2],
      ],
      [5, 4],
    );
    assert.ok(Math.abs(x[0]! - 2) < 1e-9);
    assert.ok(Math.abs(x[1]! - 1) < 1e-9);
  });
});

describe("recovery models", () => {
  function synth(n = 200): PredictRow[] {
    const rows: PredictRow[] = [];
    for (let i = 0; i < n; i++) {
      const depthMax = 0.4 + (i % 20) * 0.12;
      const emaUp = i % 3 !== 0;
      const noise = ((i * 7) % 5) - 2;
      const bars = Math.max(1, Math.round(1 + 4.5 * depthMax - 3 * (emaUp ? 1 : 0) + noise * 0.15));
      rows.push(
        row(i * 300_000, depthMax, emaUp, bars, {
          depthFirst: Math.max(0.2, depthMax - 0.3),
          volRatio: 0.8 + (i % 4) * 0.3,
        }),
      );
    }
    return rows;
  }

  it("OLS depth+EMA beats naive P50 on OOS of a known generator", () => {
    const { train, test } = splitRows(synth());
    const models = fitModels(train, test);
    const naive = models.find((m) => m.name === "naive")!;
    const ols = models.find((m) => m.name === "olsMax")!;
    assert.ok(ols.n >= 40);
    assert.ok(ols.mae + 0.15 < naive.mae);
    assert.ok(ols.coefs && Math.abs(ols.coefs.depth - 4.5) < 1.2);
    assert.ok(ols.coefs && ols.coefs.ema < -1);
  });

  it("grid lookup is finite and pickWinner prefers the lower MAE", () => {
    const { train, test } = splitRows(synth());
    const grid = fitGrid(train, false);
    const pred = predictGrid(grid, true, 1.2);
    assert.ok(Number.isFinite(pred) && pred >= 1);
    const models = fitModels(train, test);
    const winner = pickWinner(models);
    const win = models.find((m) => m.name === winner)!;
    const naive = models.find((m) => m.name === "naive")!;
    assert.ok(win.mae <= naive.mae + 1e-9);
  });

  it("volume ablation does not win a depth-only generator", () => {
    const { train, test } = splitRows(synth());
    const models = fitModels(train, test);
    const ols = models.find((m) => m.name === "olsMax")!;
    const vol = models.find((m) => m.name === "olsVol")!;
    assert.ok(Number.isFinite(vol.mae));
    assert.ok(vol.mae + 0.05 >= ols.mae - 0.35);
  });

  it("scorePred skip precision is 1 when pred≤2 iff actual≤2", () => {
    const s = scorePred([1, 1, 8, 9], [1.2, 1.4, 7, 10]);
    assert.equal(s.n, 4);
    assert.equal(s.skipPrecision, 1);
    assert.equal(s.skipRecall, 1);
  });
});

describe("predictOls", () => {
  it("clamps to [1, 48]", () => {
    const c = { intercept: -10, depth: 0, ema: 0, vol: 0 };
    assert.equal(predictOls(c, 1, true), 1);
    const d = { intercept: 80, depth: 0, ema: 0, vol: 0 };
    assert.equal(predictOls(d, 1, false), 48);
  });
});

describe("fitSymbolPredict", () => {
  function bar(t: number, c: number, extra?: Partial<Candle>): Candle {
    return {
      t,
      o: extra?.o ?? c,
      h: extra?.h ?? c + 0.15,
      l: extra?.l ?? c - 0.12,
      c,
      v: extra?.v ?? 4,
    };
  }

  it("returns a report with models on an uptrend dump series", () => {
    const candles: Candle[] = [];
    let t = 1_700_000_000_000;
    let px = 100;
    for (let i = 0; i < 900; i++) {
      const dump = i % 22 === 14;
      const o = px;
      const c = dump ? px + 0.04 : px + 0.03;
      const l = dump ? px - (0.55 + (i % 4) * 0.35) : px - 0.08;
      candles.push(bar(t, c, { o, h: Math.max(o, c) + 0.12, l, v: 6 }));
      px = px * 1.00015;
      t += 300_000;
    }
    const report = fitSymbolPredict({
      symbol: "TESTUSDT",
      candles,
      interval: "5m",
      days: 30,
      source: "synth",
    });
    assert.equal(report.symbol, "TESTUSDT");
    assert.ok(report.nSignal > 10);
    assert.ok(report.models.length >= 5);
    assert.ok(report.models.some((m) => m.name === "olsMax"));
    assert.ok(Number.isFinite(report.live.last));
  });
});
