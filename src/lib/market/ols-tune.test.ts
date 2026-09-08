import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleOlsTune, predSpec } from "./ols-tune.ts";
import type { PredictRow } from "./predict.ts";

function row(t: number, depth: number, emaUp: boolean, bars: number): PredictRow {
  return {
    t,
    depthMax: depth,
    depthFirst: depth * 0.7,
    emaUp,
    bars,
    recovered: true,
    volRatio: 1,
  };
}

describe("predSpec", () => {
  it("matches linear locked formula", () => {
    const y = predSpec({
      kind: "linear",
      coefs: { intercept: -0.28, depth: 4.67, ema: -0.36, vol: 0 },
      row: row(0, 1.25, true, 5),
    });
    assert.ok(Math.abs(y - (-0.28 + 4.67 * 1.25 - 0.36)) < 1e-9);
  });
});

describe("assembleOlsTune", () => {
  it("recovers a linear DGP and does not prefer volume", () => {
    const rows: PredictRow[] = [];
    const day = 86_400_000;
    const t0 = 1_700_000_000_000;
    for (let i = 0; i < 800; i++) {
      const depth = 0.4 + (i % 20) * 0.12;
      const emaUp = i % 4 !== 0;
      const bars = Math.max(1, Math.round(-0.3 + 4.7 * depth - 0.4 * (emaUp ? 1 : 0)));
      rows.push({ ...row(t0 + (i * (90 * day)) / 800, depth, emaUp, bars), volRatio: 0.6 + (i % 7) * 0.3 });
    }
    const report = assembleOlsTune(rows, { intercept: -0.3, depth: 4.7, ema: -0.4, vol: 0 });
    assert.ok(report.specs.length >= 10);
    const vol = report.specs.find((s) => s.name === "olsVol")!;
    const ema = report.specs.find((s) => s.name === "olsEma")!;
    assert.ok(Number.isFinite(ema.test.mae));
    assert.ok(Number.isFinite(vol.test.mae));
    assert.ok(ema.test.mae <= vol.test.mae + 0.15);
    assert.ok(Number.isFinite(report.winnerMae));
    assert.ok(report.grade === "keep" || report.grade === "replace");
  });

  it("log spec is finite on positive depth", () => {
    const rows: PredictRow[] = [];
    for (let i = 0; i < 200; i++) {
      const depth = 0.5 + (i % 10) * 0.2;
      const bars = Math.max(1, Math.round(2 + 3 * Math.log(depth) - (i % 3 === 0 ? 0.4 : 0)));
      rows.push(row(i * 300_000, depth, i % 3 !== 0, bars));
    }
    const report = assembleOlsTune(rows);
    const log = report.specs.find((s) => s.name === "olsLog")!;
    assert.ok(Number.isFinite(log.test.mae));
  });
});
