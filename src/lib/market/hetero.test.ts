import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleHetero, breuschPagan, fitGamma, r2Of } from "./hetero.ts";
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

function row(t: number, depth: number, bars: number): PredictRow {
  return {
    t,
    depthMax: depth,
    depthFirst: depth * 0.6,
    emaUp: (t / 300_000) % 2 === 0,
    bars,
    recovered: true,
    volRatio: 1,
  };
}

describe("hetero primitives", () => {
  it("r2Of is 1 on a perfect fit", () => {
    assert.equal(r2Of([1, 2, 3, 4], [1, 2, 3, 4]), 1);
  });

  it("gamma ~ 1 when |e| scales with depth", () => {
    const rng = mulberry(11);
    const e: number[] = [];
    const depth: number[] = [];
    for (let i = 0; i < 600; i++) {
      const d = 0.4 + (i % 20) * 0.15;
      depth.push(d);
      e.push(d * gauss(rng));
    }
    const g = fitGamma(e, depth);
    assert.ok(g.gamma > 0.7 && g.gamma < 1.3, `gamma=${g.gamma}`);
    const bp = breuschPagan(e, depth, depth.map((_, i) => (i % 2 === 0 ? 1 : 0)));
    assert.ok(bp.p < 0.01, `p=${bp.p}`);
  });

  it("gamma near 0 on homoskedastic noise", () => {
    const rng = mulberry(5);
    const e: number[] = [];
    const depth: number[] = [];
    for (let i = 0; i < 600; i++) {
      depth.push(0.4 + (i % 20) * 0.15);
      e.push(gauss(rng));
    }
    const g = fitGamma(e, depth);
    assert.ok(Math.abs(g.gamma) < 0.25, `gamma=${g.gamma}`);
  });
});

describe("assembleHetero", () => {
  it("flags multiplicative DGP", () => {
    const rng = mulberry(21);
    const rows: PredictRow[] = [];
    const locked = { intercept: 1, depth: 4, ema: 0, vol: 0 };
    for (let i = 0; i < 500; i++) {
      const d = 0.4 + (i % 18) * 0.14;
      const y = 1 + 4 * d + d * 1.2 * gauss(rng);
      rows.push(row(i * 300_000, d, Math.max(1, y)));
    }
    const report = assembleHetero({ symbols: [{ symbol: "H", rows }], locked });
    assert.ok(report.gamma > 0.6, `gamma=${report.gamma}`);
    assert.ok(report.bp.p < 0.01);
    assert.ok(report.grade === "multiplicative" || report.grade === "mixed" || report.grade === "count");
  });

  it("slack grows with depth on hetero DGP", () => {
    const rng = mulberry(8);
    const rows: PredictRow[] = [];
    const locked = { intercept: 0.2, depth: 4.5, ema: 0, vol: 0 };
    for (let i = 0; i < 500; i++) {
      const d = 0.3 + (i % 25) * 0.16;
      const y = 0.2 + 4.5 * d + d * gauss(rng);
      rows.push(row(i * 300_000, d, Math.max(1, y)));
    }
    const report = assembleHetero({ symbols: [{ symbol: "S", rows }], locked });
    const first = report.bins[0]!;
    const last = report.bins[report.bins.length - 1]!;
    assert.ok(last.mae > first.mae);
    assert.ok(last.slack >= first.slack);
  });
});
