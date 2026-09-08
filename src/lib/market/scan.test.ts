import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleScan, classifyLive, evaluateScan, nextBarTime } from "./scan.ts";
import type { Candle } from "./types.ts";

describe("classifyLive", () => {
  const base = {
    below: true,
    depth: 1.35,
    emaUp: true,
    predBars: 5,
    squeeze: false,
    climax: false,
    bbBelowLower: false,
  };

  it("marks a 1.35× EMA-up fade as entry", () => {
    const hit = classifyLive(base);
    assert.equal(hit.status, "entry");
    assert.ok(hit.score > 0.5);
  });

  it("skips when predicted recovery is 1–2 candles", () => {
    const hit = classifyLive({ ...base, depth: 0.3, predBars: 1 });
    assert.ok(hit.status === "blocked" || hit.status === "flat");
    assert.notEqual(hit.status, "entry");
  });

  it("blocks squeeze and climax even in the sweet spot", () => {
    assert.equal(classifyLive({ ...base, squeeze: true }).status, "blocked");
    assert.equal(classifyLive({ ...base, climax: true }).status, "blocked");
  });

  it("blocks when close is under EMA14", () => {
    assert.equal(classifyLive({ ...base, emaUp: false }).status, "blocked");
  });

  it("flags approaching depth as near", () => {
    const hit = classifyLive({ ...base, depth: 0.9, predBars: 4 });
    assert.equal(hit.status, "near");
  });

  it("is flat when not below SMA", () => {
    assert.equal(classifyLive({ ...base, below: false }).status, "flat");
  });
});

describe("nextBarTime", () => {
  it("ceils to the next 5m boundary", () => {
    const t = Date.UTC(2026, 8, 8, 10, 3, 20);
    const next = nextBarTime(t, 5);
    assert.equal(next, Date.UTC(2026, 8, 8, 10, 5, 0));
  });
});

describe("evaluateScan", () => {
  function bar(t: number, c: number, extra?: Partial<Candle>): Candle {
    return {
      t,
      o: extra?.o ?? c,
      h: extra?.h ?? c + 0.12,
      l: extra?.l ?? c - 0.1,
      c,
      v: extra?.v ?? 4,
    };
  }

  it("returns a row with gates on an uptrend dump", () => {
    const candles: Candle[] = [];
    let t = 1_700_000_000_000;
    let px = 100;
    for (let i = 0; i < 360; i++) {
      const dump = i === 359;
      const o = px;
      const c = dump ? px + 0.04 : px + 0.02;
      const l = dump ? px - 1.1 : px - 0.08;
      candles.push(bar(t, c, { o, h: Math.max(o, c) + 0.1, l, v: 5 }));
      px = px * 1.00012;
      t += 300_000;
    }
    const row = evaluateScan({
      symbol: "BTCUSDT",
      label: "BTC",
      candles,
      source: "synth",
      interval: "5m",
    });
    assert.equal(row.symbol, "BTCUSDT");
    assert.ok(row.last > 0);
    assert.ok(row.status === "entry" || row.status === "near" || row.status === "blocked" || row.status === "flat");
    const report = assembleScan([row], "5m", 1_700_000_000_000);
    assert.equal(report.n, 1);
    assert.ok(report.nextBar > report.at);
  });
});
