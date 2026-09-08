import { clampDays, intervalMs } from "./symbols.ts";
import type { Candle, Interval } from "./types.ts";

const UA =
  "Mozilla/5.0 (compatible; SMA15Lab/1.0; +https://grok.com) AppleWebKit/537.36";

type Page = { start: number; end: number };

async function getJson(
  url: string,
  timeoutMs = 12_000,
  external?: AbortSignal,
): Promise<unknown> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const onAbort = () => ac.abort();
  external?.addEventListener("abort", onAbort);
  try {
    if (external?.aborted) throw new Error("aborted");
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: ac.signal,
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onAbort);
  }
}

function parseBinanceLike(raw: unknown): Candle[] {
  if (!Array.isArray(raw)) throw new Error("unexpected kline payload");
  const out: Candle[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const t = Number(row[0]);
    const o = Number(row[1]);
    const h = Number(row[2]);
    const l = Number(row[3]);
    const c = Number(row[4]);
    const v = Number(row[5]);
    if (![t, o, h, l, c, v].every(Number.isFinite)) continue;
    out.push({ t, o, h, l, c, v });
  }
  return out;
}

function parseOkx(raw: unknown): Candle[] {
  const data = (raw as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error("okx payload");
  const out: Candle[] = [];
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const t = Number(row[0]);
    const o = Number(row[1]);
    const h = Number(row[2]);
    const l = Number(row[3]);
    const c = Number(row[4]);
    const v = Number(row[5] ?? 0);
    if (![t, o, h, l, c].every(Number.isFinite)) continue;
    out.push({ t, o, h, l, c, v });
  }
  // OKX returns newest first
  out.sort((a, b) => a.t - b.t);
  return out;
}

function parseBitget(raw: unknown): Candle[] {
  const data = (raw as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error("bitget payload");
  const out: Candle[] = [];
  for (const row of data) {
    if (!Array.isArray(row) || row.length < 5) continue;
    const t = Number(row[0]);
    const o = Number(row[1]);
    const h = Number(row[2]);
    const l = Number(row[3]);
    const c = Number(row[4]);
    const v = Number(row[5] ?? 0);
    if (![t, o, h, l, c].every(Number.isFinite)) continue;
    out.push({ t, o, h, l, c, v });
  }
  out.sort((a, b) => a.t - b.t);
  return out;
}

function dedupe(candles: Candle[]): Candle[] {
  const map = new Map<number, Candle>();
  for (const c of candles) map.set(c.t, c);
  return [...map.values()].sort((a, b) => a.t - b.t);
}

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
  const k = Math.min(n, items.length);
  await Promise.all(Array.from({ length: k }, () => worker()));
  return out;
}

function pagesFor(from: number, to: number, step: number, limit: number): Page[] {
  const pages: Page[] = [];
  let cursor = from;
  while (cursor < to) {
    const end = Math.min(to, cursor + limit * step);
    pages.push({ start: cursor, end });
    cursor = end;
  }
  return pages;
}

async function fetchBinanceVision(
  symbol: string,
  interval: Interval,
  from: number,
  to: number,
): Promise<Candle[]> {
  const step = intervalMs(interval);
  const pages = pagesFor(from, to, step, 1000);
  const chunks = await mapPool(pages, 5, async (p) => {
    const url =
      `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}` +
      `&interval=${interval}&startTime=${p.start}&endTime=${p.end}&limit=1000`;
    return parseBinanceLike(await getJson(url));
  });
  return dedupe(chunks.flat());
}

async function fetchMexc(
  symbol: string,
  interval: Interval,
  from: number,
  to: number,
): Promise<Candle[]> {
  const step = intervalMs(interval);
  const pages = pagesFor(from, to, step, 500);
  const chunks = await mapPool(pages, 4, async (p) => {
    const url =
      `https://api.mexc.com/api/v3/klines?symbol=${symbol}` +
      `&interval=${interval}&startTime=${p.start}&endTime=${p.end}&limit=500`;
    return parseBinanceLike(await getJson(url));
  });
  return dedupe(chunks.flat());
}

function okxBar(interval: Interval): string {
  if (interval === "1h") return "1H";
  return interval;
}

function okxInst(symbol: string): string {
  if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}-USDT`;
  return symbol;
}

async function fetchOkx(
  symbol: string,
  interval: Interval,
  from: number,
  to: number,
): Promise<Candle[]> {
  const instId = okxInst(symbol);
  const bar = okxBar(interval);
  const out: Candle[] = [];
  let after = String(to);
  for (let i = 0; i < 80; i++) {
    const url =
      `https://www.okx.com/api/v5/market/history-candles?instId=${instId}` +
      `&bar=${bar}&limit=300&after=${after}`;
    const batch = parseOkx(await getJson(url));
    if (batch.length === 0) break;
    out.push(...batch);
    const oldest = batch[0]!.t;
    if (oldest <= from) break;
    after = String(oldest);
  }
  return dedupe(out).filter((c) => c.t >= from && c.t <= to);
}

function bitgetGranularity(interval: Interval): string {
  switch (interval) {
    case "1m":
      return "1min";
    case "5m":
      return "5min";
    case "15m":
      return "15min";
    case "1h":
      return "1h";
  }
}

async function fetchBitget(
  symbol: string,
  interval: Interval,
  from: number,
  to: number,
): Promise<Candle[]> {
  const gran = bitgetGranularity(interval);
  const step = intervalMs(interval);
  const pages = pagesFor(from, to, step, 200);
  const chunks = await mapPool(pages, 4, async (p) => {
    const url =
      `https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}` +
      `&granularity=${gran}&startTime=${p.start}&endTime=${p.end}&limit=200`;
    return parseBitget(await getJson(url));
  });
  return dedupe(chunks.flat());
}

export async function fetchKlines(input: {
  symbol: string;
  interval: Interval;
  days: number;
}): Promise<{ candles: Candle[]; source: string }> {
  const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (symbol.length < 5 || symbol.length > 20) {
    throw new Error("Mã không hợp lệ");
  }
  const interval = input.interval;
  const days = clampDays(interval, input.days);
  const to = Date.now();
  const from = to - days * 86_400_000;

  const sources: { name: string; run: () => Promise<Candle[]> }[] = [
    { name: "Binance", run: () => fetchBinanceVision(symbol, interval, from, to) },
    { name: "MEXC", run: () => fetchMexc(symbol, interval, from, to) },
    { name: "OKX", run: () => fetchOkx(symbol, interval, from, to) },
    { name: "Bitget", run: () => fetchBitget(symbol, interval, from, to) },
  ];

  let lastErr: unknown;
  for (const src of sources) {
    try {
      const candles = await src.run();
      if (candles.length < 80) {
        lastErr = new Error(`${src.name}: quá ít nến (${candles.length})`);
        continue;
      }
      return { candles, source: src.name };
    } catch (err) {
      lastErr = err;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : "không tải được nến";
  throw new Error(`Không tải được dữ liệu nến: ${msg}`);
}

export async function fetchRecentKlines(input: {
  symbol: string;
  interval: Interval;
  limit?: number;
}): Promise<{ candles: Candle[]; source: string }> {
  const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (symbol.length < 5 || symbol.length > 20) {
    throw new Error("Mã không hợp lệ");
  }
  const interval = input.interval;
  const limit = Math.min(1000, Math.max(80, input.limit ?? 500));
  const instId = okxInst(symbol);
  const timeoutMs = 2_800;
  const ac = new AbortController();

  const tryBinance = (host: string, name: string) =>
    getJson(
      `https://${host}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      timeoutMs,
      ac.signal,
    ).then((raw) => {
      const candles = parseBinanceLike(raw);
      if (candles.length < 80) throw new Error(`${name}: quá ít nến`);
      return { candles, source: name };
    });
  const tryMexc = () =>
    getJson(
      `https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${Math.min(limit, 500)}`,
      timeoutMs,
      ac.signal,
    ).then((raw) => {
      const candles = parseBinanceLike(raw);
      if (candles.length < 80) throw new Error("MEXC: quá ít nến");
      return { candles, source: "MEXC" };
    });
  const tryOkx = () =>
    getJson(
      `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${okxBar(interval)}&limit=${Math.min(limit, 300)}`,
      timeoutMs,
    ).then((raw) => {
      const candles = parseOkx(raw);
      if (candles.length < 80) throw new Error("OKX: quá ít nến");
      return { candles, source: "OKX" };
    });

  const first = await new Promise<{ candles: Candle[]; source: string }>((resolve, reject) => {
    const racers = [
      () => tryBinance("data-api.binance.vision", "Binance"),
      () => tryBinance("api.binance.com", "Binance"),
      () => tryMexc(),
    ];
    let pending = racers.length;
    let lastErr: unknown = new Error("không tải được nến");
    let settled = false;
    for (const run of racers) {
      run()
        .then((hit) => {
          if (settled) return;
          settled = true;
          ac.abort();
          resolve(hit);
        })
        .catch((err) => {
          lastErr = err;
          pending -= 1;
          if (!settled && pending === 0) reject(lastErr);
        });
    }
  }).catch(async () => {
    ac.abort();
    return tryOkx();
  });
  return first;
}
