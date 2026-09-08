import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isSellingBar, isVolumeDump } from "./volume.ts";
import type { Candle } from "./types.ts";

const red: Candle = { t: 1, o: 100, h: 100.2, l: 98, c: 98.5, v: 50 };
const green: Candle = { t: 1, o: 99, h: 101, l: 98.8, c: 100.8, v: 50 };

describe("volume dump", () => {
  it("flags a red bar when volume is a multiple of SMA", () => {
    assert.equal(isSellingBar(red), true);
    assert.equal(isVolumeDump(red, 10, 2), true);
    assert.equal(isVolumeDump(red, 10, 8), false);
    assert.equal(isVolumeDump(red, 10, 0), false);
  });

  it("does not flag a high-volume bounce close near the high", () => {
    assert.equal(isSellingBar(green), false);
    assert.equal(isVolumeDump(green, 10, 2), false);
  });
});
