//#region node_modules/.nitro/vite/services/ssr/assets/symbols-Btt3FAtD.js
var SYMBOLS = [
	{
		id: "BTCUSDT",
		label: "BTC"
	},
	{
		id: "ETHUSDT",
		label: "ETH"
	},
	{
		id: "SOLUSDT",
		label: "SOL"
	},
	{
		id: "BNBUSDT",
		label: "BNB"
	},
	{
		id: "XRPUSDT",
		label: "XRP"
	},
	{
		id: "DOGEUSDT",
		label: "DOGE"
	},
	{
		id: "ADAUSDT",
		label: "ADA"
	},
	{
		id: "AVAXUSDT",
		label: "AVAX"
	},
	{
		id: "LINKUSDT",
		label: "LINK"
	},
	{
		id: "SUIUSDT",
		label: "SUI"
	},
	{
		id: "NEARUSDT",
		label: "NEAR"
	},
	{
		id: "APTUSDT",
		label: "APT"
	},
	{
		id: "ARBUSDT",
		label: "ARB"
	},
	{
		id: "LTCUSDT",
		label: "LTC"
	}
];
var INTERVALS = [
	{
		id: "1m",
		label: "1m"
	},
	{
		id: "5m",
		label: "5m"
	},
	{
		id: "15m",
		label: "15m"
	},
	{
		id: "1h",
		label: "1h"
	}
];
var DAY_OPTIONS = [
	7,
	14,
	30,
	60,
	90
];
/** Wick smaller than this ATR multiple is noise around SMA, not a dump. */
var MIN_SIGNAL_ATR = .25;
/** Only-buy hypothesis: selling volume ≥ this × SMA20. */
var CLIMAX_VOL_MULT = 2.5;
var BB_SQUEEZE_P = .2;
var BB_EXPAND_P = .8;
function intervalMs(interval) {
	switch (interval) {
		case "1m": return 6e4;
		case "5m": return 3e5;
		case "15m": return 9e5;
		case "1h": return 36e5;
	}
}
function intervalMinutes(interval) {
	return intervalMs(interval) / 6e4;
}
/** Keep payloads and fetch count bounded. */
function clampDays(interval, days) {
	const maxByBars = Math.max(3, Math.floor(28e3 * intervalMs(interval) / 864e5));
	return Math.min(Math.max(1, days), interval === "1m" ? Math.min(14, maxByBars) : Math.min(90, maxByBars));
}
//#endregion
export { INTERVALS as a, clampDays as c, DAY_OPTIONS as i, intervalMinutes as l, BB_SQUEEZE_P as n, MIN_SIGNAL_ATR as o, CLIMAX_VOL_MULT as r, SYMBOLS as s, BB_EXPAND_P as t, intervalMs as u };
