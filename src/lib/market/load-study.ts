import { createServerFn } from "@tanstack/react-start";
import { clampDays } from "./symbols.ts";
import type { Interval, StudyRequest, StudyResult } from "./types.ts";

const cache = new Map<string, { at: number; value: StudyResult }>();
const TTL_MS = 2 * 60_000;

const INTERVALS: Interval[] = ["1m", "5m", "15m", "1h"];

function parseRequest(raw: unknown): StudyRequest {
  const d = (raw ?? {}) as Record<string, unknown>;
  const symbol = String(d.symbol ?? "BTCUSDT").toUpperCase();
  const interval = INTERVALS.includes(d.interval as Interval)
    ? (d.interval as Interval)
    : "5m";
  const days = clampDays(interval, Number(d.days) || 30);
  return { symbol, interval, days };
}

export const loadStudy = createServerFn({ method: "POST" })
  .validator((d: unknown) => parseRequest(d))
  .handler(async ({ data }): Promise<StudyResult> => {
    const key = `v17:${data.symbol}:${data.interval}:${data.days}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    const { fetchKlines } = await import("./fetch-klines.server.ts");
    const { runStudy } = await import("./analyze.ts");
    const { candles, source } = await fetchKlines(data);
    const value = runStudy({
      candles,
      symbol: data.symbol,
      interval: data.interval,
      source,
      days: data.days,
    });
    cache.set(key, { at: Date.now(), value });
    return value;
  });
