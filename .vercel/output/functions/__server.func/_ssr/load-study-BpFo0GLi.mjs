import { c as clampDays } from "./symbols-Btt3FAtD.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/load-study-BpFo0GLi.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var cache = /* @__PURE__ */ new Map();
var TTL_MS = 12e4;
var INTERVALS = [
	"1m",
	"5m",
	"15m",
	"1h"
];
function parseRequest(raw) {
	const d = raw ?? {};
	const symbol = String(d.symbol ?? "BTCUSDT").toUpperCase();
	const interval = INTERVALS.includes(d.interval) ? d.interval : "5m";
	return {
		symbol,
		interval,
		days: clampDays(interval, Number(d.days) || 30)
	};
}
var loadStudy_createServerFn_handler = createServerRpc({
	id: "07af06d9289fbf741436e7520fb3c5bfc316976ba9e6fec2dc900d4cb21076b1",
	name: "loadStudy",
	filename: "src/lib/market/load-study.ts"
}, (opts) => loadStudy.__executeServer(opts));
var loadStudy = createServerFn({ method: "POST" }).validator((d) => parseRequest(d)).handler(loadStudy_createServerFn_handler, async ({ data }) => {
	const key = `v16:${data.symbol}:${data.interval}:${data.days}`;
	const hit = cache.get(key);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
	const { fetchKlines } = await import("./fetch-klines.server-DsOmrdx9.mjs");
	const { runStudy } = await import("./analyze-Bf5ialcx.mjs");
	const { candles, source } = await fetchKlines(data);
	const value = runStudy({
		candles,
		symbol: data.symbol,
		interval: data.interval,
		source,
		days: data.days
	});
	cache.set(key, {
		at: Date.now(),
		value
	});
	return value;
});
//#endregion
export { loadStudy_createServerFn_handler };
