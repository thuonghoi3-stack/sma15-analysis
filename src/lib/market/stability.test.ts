import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assembleStability, rollingBounds, thirdsOf } from "./stability.ts";
import type { PredictRow } from "./predict.ts";

const DAY = 86_400_000;
const FROM = 1_700_000_000_000;
const TO = FROM + 90 * DAY;

function rows(slope: (t: number) => number, n = 900): PredictRow[] {
  const out: PredictRow[] = [];
  for (let i = 0; i < n; i++) {
    const t = FROM + (i / n) * (TO - FROM);
    const depth = 0.4 + (i % 18) * 0.12;
    const emaUp = i % 3 !== 0;
    const s = slope(t);
    const bars = Math.max(1, Math.round(0.2 + s * depth - 0.4 * (emaUp ? 1 : 0)));
    out.push({
      t,
      depthMax: depth,
      depthFirst: depth * 0.6,
      emaUp,
      bars,
      recovered: true,
      volRatio: 1,
    });
  }
  return out;
}

describe("window bounds", () => {
  it("splits 90d into 3 thirds", () => {
    const t = thirdsOf(FROM, TO);
    assert.equal(t.length, 3);
    assert.equal(t[0]!.from, FROM);
    assert.ok(Math.abs(t[2]!.to - TO) < 1);
  });

  it("rolling 30d / 7d yields ~9 windows on 90d", () => {
    const r = rollingBounds(FROM, TO, 30, 7);
    assert.ok(r.length >= 8 && r.length <= 10);
    assert.ok(r[0]!.to - r[0]!.from === 30 * DAY);
  });
});

describe("assembleStability", () => {
  it("grades a constant-slope universe as stable", () => {
    const report = assembleStability({
      interval: "5m",
      days: 90,
      from: FROM,
      to: TO,
      symbols: [
        { symbol: "AAA", rows: rows(() => 4.8, 600) },
        { symbol: "BBB", rows: rows(() => 5.0, 600) },
      ],
    });
    assert.equal(report.grade, "stable");
    assert.ok(report.slopeRange < 1);
    assert.ok(report.train60test30.ols.mae + 0.5 < report.train60test30.naive);
    assert.ok(Math.abs(report.pooled90.depth - 4.9) < 0.6);
  });

  it("grades a slope break as break or drift", () => {
    const report = assembleStability({
      interval: "5m",
      days: 90,
      from: FROM,
      to: TO,
      symbols: [
        {
          symbol: "CCC",
          rows: rows((t) => (t < FROM + 45 * DAY ? 2.2 : 8.5), 900),
        },
      ],
    });
    assert.ok(report.grade === "break" || report.grade === "drift");
    assert.ok(report.slopeRange > 1.2);
  });
});
