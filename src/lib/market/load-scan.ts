import { createServerFn } from "@tanstack/react-start";
import { SCAN_BARS, SYMBOLS } from "./symbols.ts";
import type { Interval } from "./types.ts";
import type { ScanReport, ScanRow } from "./scan.ts";

const FRESH_MS = 8_000;
const STALE_MS = 45_000;
const POOL = 8;
let cache: { at: number; value: ScanReport } | null = null;
let inflight: Promise<ScanReport> | null = null;

async function mapPool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return out;
}

function blankError(id: string, label: string, msg: string): ScanRow {
  return {
    symbol: id,
    label,
    source: "",
    lastT: 0,
    last: NaN,
    sma: null,
    atr: null,
    ema: null,
    below: false,
    depth: 0,
    emaUp: false,
    predBars: NaN,
    sigma: NaN,
    slack: NaN,
    tpBars: NaN,
    volRatio: NaN,
    squeeze: false,
    climax: false,
    bbBelowLower: false,
    gates: {
      below: false,
      emaUp: false,
      depthOk: false,
      predOk: false,
      notSqueeze: true,
      notClimax: true,
    },
    status: "error",
    reasons: [msg],
    score: 0,
    error: msg,
  };
}

export async function runScan(): Promise<ScanReport> {
  const interval: Interval = "5m";
  const { fetchRecentKlines } = await import("./fetch-klines.server.ts");
  const { assembleScan, evaluateScan } = await import("./scan.ts");
  const rows = await mapPool([...SYMBOLS], POOL, async (s) => {
    try {
      const { candles, source } = await fetchRecentKlines({
        symbol: s.id,
        interval,
        limit: SCAN_BARS,
      });
      return evaluateScan({
        symbol: s.id,
        label: s.label,
        candles,
        source,
        interval,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "lỗi tải";
      return blankError(s.id, s.label, msg);
    }
  });
  return assembleScan(rows, interval);
}

function refresh(): Promise<ScanReport> {
  if (inflight) return inflight;
  inflight = runScan()
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Fresh cache hits immediately. Stale (<45s) returns now and refreshes in the background. */
export async function getScan(): Promise<ScanReport> {
  const now = Date.now();
  if (cache && now - cache.at < FRESH_MS) return cache.value;
  if (cache && now - cache.at < STALE_MS) {
    void refresh();
    return cache.value;
  }
  return refresh();
}

export const loadScan = createServerFn({ method: "POST" }).handler(async (): Promise<ScanReport> => {
  return getScan();
});
