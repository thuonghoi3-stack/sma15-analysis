import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acf,
  assembleResiduals,
  chi2Sf,
  durbinWatson,
  ljungBox,
  residualOf,
  type ResidualReport,
} from "./residuals.ts";
import type { PredictRow } from "./predict.ts";

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

describe("chi2Sf / ACF / DW", () => {
  it("chi2Sf(df) at median is near 0.5", () => {
    const p = chi2Sf(10, 10);
    assert.ok(p > 0.35 && p < 0.65);
    assert.ok(chi2Sf(0, 5) === 1);
    assert.ok(chi2Sf(40, 5) < 0.01);
  });

  it("white noise has DW near 2 and small ACF1", () => {
    const rng = mulberry(42);
    const xs: number[] = [];
    for (let i = 0; i < 400; i++) xs.push(gauss(rng));
    const dw = durbinWatson(xs);
    const r1 = acf(xs, 1)[1]!;
    assert.ok(dw > 1.7 && dw < 2.3, `DW=${dw}`);
    assert.ok(Math.abs(r1) < 0.12, `ACF1=${r1}`);
    const lb = ljungBox(xs, 10);
    assert.ok(lb.p > 0.05, `p=${lb.p}`);
  });

  it("AR(1) 0.7 has DW well below 2 and ACF1 ~ 0.7", () => {
    const rng = mulberry(7);
    const xs: number[] = [];
    let e = 0;
    for (let i = 0; i < 500; i++) {
      e = 0.7 * e + gauss(rng);
      xs.push(e);
    }
    const dw = durbinWatson(xs);
    const r1 = acf(xs, 1)[1]!;
    assert.ok(dw < 1.2);
    assert.ok(r1 > 0.5);
    const lb = ljungBox(xs, 10);
    assert.ok(lb.p < 0.01);
  });
});

function row(t: number, depth: number, emaUp: boolean, bars: number): PredictRow {
  return { t, depthMax: depth, depthFirst: depth * 0.6, emaUp, bars, recovered: true, volRatio: 1 };
}

describe("assembleResiduals", () => {
  it("grades a well-specified linear generator as clean or weak-ac", () => {
    const rng = mulberry(99);
    const rows: PredictRow[] = [];
    const locked = { intercept: -0.3, depth: 4.7, ema: -0.4, vol: 0 };
    for (let i = 0; i < 400; i++) {
      const depth = 0.4 + (i % 16) * 0.12;
      const emaUp = i % 3 !== 0;
      const y = locked.intercept + locked.depth * depth + locked.ema * (emaUp ? 1 : 0) + gauss(rng) * 0.4;
      rows.push(row(i * 300_000, depth, emaUp, Math.max(1, y)));
    }
    const report: ResidualReport = assembleResiduals({
      symbols: [{ symbol: "AAA", rows }],
      locked,
    });
    assert.ok(report.grade === "clean" || report.grade === "weak-ac");
    assert.ok(Math.abs(report.meanAcf1) < 0.2);
    assert.ok(report.lag1.nTest > 50);
  });

  it("flags clustered AR residuals as strong-ac", () => {
    const rows: PredictRow[] = [];
    const rng = mulberry(3);
    let shock = 0;
    for (let i = 0; i < 400; i++) {
      shock = 0.75 * shock + gauss(rng);
      const depth = 0.5 + (i % 10) * 0.1;
      const y = 1 + 4 * depth + shock * 3;
      rows.push(row(i * 300_000, depth, i % 2 === 0, Math.max(1, Math.round(y))));
    }
    const report = assembleResiduals({ symbols: [{ symbol: "BBB", rows }] });
    assert.equal(report.grade, "strong-ac");
    assert.ok(report.meanAcf1 > 0.2);
  });

  it("residualOf is bars minus linear fit", () => {
    const r = row(0, 2, true, 10);
    const e = residualOf({ intercept: 0, depth: 4, ema: -1, vol: 0 }, r);
    assert.equal(e, 10 - (0 + 8 - 1));
  });
});
