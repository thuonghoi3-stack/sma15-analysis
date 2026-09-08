import { c as clampDays, u as intervalMs } from "./symbols-Btt3FAtD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fetch-klines.server-DsOmrdx9.js
var UA = "Mozilla/5.0 (compatible; SMA15Lab/1.0; +https://grok.com) AppleWebKit/537.36";
async function getJson(url, timeoutMs = 12e3) {
	const ac = new AbortController();
	const timer = setTimeout(() => ac.abort(), timeoutMs);
	try {
		const res = await fetch(url, {
			headers: {
				accept: "application/json",
				"user-agent": UA
			},
			signal: ac.signal
		});
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}
function parseBinanceLike(raw) {
	if (!Array.isArray(raw)) throw new Error("unexpected kline payload");
	const out = [];
	for (const row of raw) {
		if (!Array.isArray(row) || row.length < 6) continue;
		const t = Number(row[0]);
		const o = Number(row[1]);
		const h = Number(row[2]);
		const l = Number(row[3]);
		const c = Number(row[4]);
		const v = Number(row[5]);
		if (![
			t,
			o,
			h,
			l,
			c,
			v
		].every(Number.isFinite)) continue;
		out.push({
			t,
			o,
			h,
			l,
			c,
			v
		});
	}
	return out;
}
function parseOkx(raw) {
	const data = raw?.data;
	if (!Array.isArray(data)) throw new Error("okx payload");
	const out = [];
	for (const row of data) {
		if (!Array.isArray(row) || row.length < 5) continue;
		const t = Number(row[0]);
		const o = Number(row[1]);
		const h = Number(row[2]);
		const l = Number(row[3]);
		const c = Number(row[4]);
		const v = Number(row[5] ?? 0);
		if (![
			t,
			o,
			h,
			l,
			c
		].every(Number.isFinite)) continue;
		out.push({
			t,
			o,
			h,
			l,
			c,
			v
		});
	}
	out.sort((a, b) => a.t - b.t);
	return out;
}
function parseBitget(raw) {
	const data = raw?.data;
	if (!Array.isArray(data)) throw new Error("bitget payload");
	const out = [];
	for (const row of data) {
		if (!Array.isArray(row) || row.length < 5) continue;
		const t = Number(row[0]);
		const o = Number(row[1]);
		const h = Number(row[2]);
		const l = Number(row[3]);
		const c = Number(row[4]);
		const v = Number(row[5] ?? 0);
		if (![
			t,
			o,
			h,
			l,
			c
		].every(Number.isFinite)) continue;
		out.push({
			t,
			o,
			h,
			l,
			c,
			v
		});
	}
	out.sort((a, b) => a.t - b.t);
	return out;
}
function dedupe(candles) {
	const map = /* @__PURE__ */ new Map();
	for (const c of candles) map.set(c.t, c);
	return [...map.values()].sort((a, b) => a.t - b.t);
}
async function mapPool(items, n, fn) {
	const out = new Array(items.length);
	let cursor = 0;
	async function worker() {
		while (true) {
			const idx = cursor++;
			if (idx >= items.length) return;
			out[idx] = await fn(items[idx]);
		}
	}
	const k = Math.min(n, items.length);
	await Promise.all(Array.from({ length: k }, () => worker()));
	return out;
}
function pagesFor(from, to, step, limit) {
	const pages = [];
	let cursor = from;
	while (cursor < to) {
		const end = Math.min(to, cursor + limit * step);
		pages.push({
			start: cursor,
			end
		});
		cursor = end;
	}
	return pages;
}
async function fetchBinanceVision(symbol, interval, from, to) {
	return dedupe((await mapPool(pagesFor(from, to, intervalMs(interval), 1e3), 5, async (p) => {
		return parseBinanceLike(await getJson(`https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${p.start}&endTime=${p.end}&limit=1000`));
	})).flat());
}
async function fetchMexc(symbol, interval, from, to) {
	return dedupe((await mapPool(pagesFor(from, to, intervalMs(interval), 500), 4, async (p) => {
		return parseBinanceLike(await getJson(`https://api.mexc.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${p.start}&endTime=${p.end}&limit=500`));
	})).flat());
}
function okxBar(interval) {
	if (interval === "1h") return "1H";
	return interval;
}
function okxInst(symbol) {
	if (symbol.endsWith("USDT")) return `${symbol.slice(0, -4)}-USDT`;
	return symbol;
}
async function fetchOkx(symbol, interval, from, to) {
	const instId = okxInst(symbol);
	const bar = okxBar(interval);
	const out = [];
	let after = String(to);
	for (let i = 0; i < 80; i++) {
		const batch = parseOkx(await getJson(`https://www.okx.com/api/v5/market/history-candles?instId=${instId}&bar=${bar}&limit=300&after=${after}`));
		if (batch.length === 0) break;
		out.push(...batch);
		const oldest = batch[0].t;
		if (oldest <= from) break;
		after = String(oldest);
	}
	return dedupe(out).filter((c) => c.t >= from && c.t <= to);
}
function bitgetGranularity(interval) {
	switch (interval) {
		case "1m": return "1min";
		case "5m": return "5min";
		case "15m": return "15min";
		case "1h": return "1h";
	}
}
async function fetchBitget(symbol, interval, from, to) {
	const gran = bitgetGranularity(interval);
	return dedupe((await mapPool(pagesFor(from, to, intervalMs(interval), 200), 4, async (p) => {
		return parseBitget(await getJson(`https://api.bitget.com/api/v2/spot/market/candles?symbol=${symbol}&granularity=${gran}&startTime=${p.start}&endTime=${p.end}&limit=200`));
	})).flat());
}
async function fetchKlines(input) {
	const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
	if (symbol.length < 5 || symbol.length > 20) throw new Error("Mã không hợp lệ");
	const interval = input.interval;
	const days = clampDays(interval, input.days);
	const to = Date.now();
	const from = to - days * 864e5;
	const sources = [
		{
			name: "Binance",
			run: () => fetchBinanceVision(symbol, interval, from, to)
		},
		{
			name: "MEXC",
			run: () => fetchMexc(symbol, interval, from, to)
		},
		{
			name: "OKX",
			run: () => fetchOkx(symbol, interval, from, to)
		},
		{
			name: "Bitget",
			run: () => fetchBitget(symbol, interval, from, to)
		}
	];
	let lastErr;
	for (const src of sources) try {
		const candles = await src.run();
		if (candles.length < 80) {
			lastErr = /* @__PURE__ */ new Error(`${src.name}: quá ít nến (${candles.length})`);
			continue;
		}
		return {
			candles,
			source: src.name
		};
	} catch (err) {
		lastErr = err;
	}
	const msg = lastErr instanceof Error ? lastErr.message : "không tải được nến";
	throw new Error(`Không tải được dữ liệu nến: ${msg}`);
}
//#endregion
export { fetchKlines };
