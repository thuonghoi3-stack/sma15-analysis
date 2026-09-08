import { l as intervalMinutes, n as BB_SQUEEZE_P, o as MIN_SIGNAL_ATR, r as CLIMAX_VOL_MULT, t as BB_EXPAND_P } from "./symbols-Btt3FAtD.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analyze-Bf5ialcx.js
function mean(values) {
	if (values.length === 0) return NaN;
	let s = 0;
	for (const v of values) s += v;
	return s / values.length;
}
function stdev(values, avg = mean(values)) {
	if (values.length < 2) return 0;
	let s = 0;
	for (const v of values) {
		const d = v - avg;
		s += d * d;
	}
	return Math.sqrt(s / (values.length - 1));
}
function quantile(sorted, q) {
	if (sorted.length === 0) return NaN;
	if (sorted.length === 1) return sorted[0];
	const pos = (sorted.length - 1) * q;
	const lo = Math.floor(pos);
	const hi = Math.ceil(pos);
	const a = sorted[lo];
	const b = sorted[hi];
	if (lo === hi) return a;
	return a * (hi - pos) + b * (pos - lo);
}
function summarize(values) {
	if (values.length === 0) return {
		mean: NaN,
		std: NaN,
		cv: NaN,
		p10: NaN,
		p25: NaN,
		p50: NaN,
		p75: NaN,
		p90: NaN,
		p95: NaN
	};
	const sorted = values.slice().sort((a, b) => a - b);
	const avg = mean(sorted);
	const sd = stdev(sorted, avg);
	return {
		mean: avg,
		std: sd,
		cv: avg !== 0 ? sd / Math.abs(avg) : NaN,
		p10: quantile(sorted, .1),
		p25: quantile(sorted, .25),
		p50: quantile(sorted, .5),
		p75: quantile(sorted, .75),
		p90: quantile(sorted, .9),
		p95: quantile(sorted, .95)
	};
}
function pearson(xs, ys) {
	const n = Math.min(xs.length, ys.length);
	if (n < 3) return NaN;
	let sx = 0;
	let sy = 0;
	for (let i = 0; i < n; i++) {
		sx += xs[i];
		sy += ys[i];
	}
	const mx = sx / n;
	const my = sy / n;
	let num = 0;
	let dx = 0;
	let dy = 0;
	for (let i = 0; i < n; i++) {
		const a = xs[i] - mx;
		const b = ys[i] - my;
		num += a * b;
		dx += a * a;
		dy += b * b;
	}
	const den = Math.sqrt(dx * dy);
	if (den === 0) return NaN;
	return num / den;
}
/** Empirical percentile of `value` in `sorted` (0–100). */
function percentileOf(sorted, value) {
	if (sorted.length === 0) return NaN;
	let lo = 0;
	let hi = sorted.length;
	while (lo < hi) {
		const mid = lo + hi >> 1;
		if (sorted[mid] <= value) lo = mid + 1;
		else hi = mid;
	}
	return lo / sorted.length * 100;
}
function histogram(values, bins, hiCap) {
	if (values.length === 0 || bins <= 0) return [];
	const sorted = values.slice().sort((a, b) => a - b);
	const lo = 0;
	const width = ((hiCap ?? Math.max(sorted[sorted.length - 1], sorted[0] + 1e-9)) - lo) / bins || 1;
	const out = [];
	for (let i = 0; i < bins; i++) out.push({
		x0: lo + i * width,
		x1: lo + (i + 1) * width,
		n: 0
	});
	for (const v of values) {
		if (v < lo) continue;
		let idx = Math.floor((v - lo) / width);
		if (idx >= bins) idx = bins - 1;
		if (idx < 0) idx = 0;
		out[idx].n += 1;
	}
	return out;
}
function computeSma(values, period) {
	const n = values.length;
	const out = new Array(n).fill(null);
	if (period <= 0 || n === 0) return out;
	let sum = 0;
	for (let i = 0; i < n; i++) {
		sum += values[i];
		if (i >= period) sum -= values[i - period];
		if (i >= period - 1) out[i] = sum / period;
	}
	return out;
}
/** EMA seeded with SMA of the first `period` closes. k = 2 / (period + 1). */
function computeEma(values, period) {
	const n = values.length;
	const out = new Array(n).fill(null);
	if (period <= 0 || n === 0) return out;
	const k = 2 / (period + 1);
	let sum = 0;
	for (let i = 0; i < n; i++) {
		const v = values[i];
		if (i < period - 1) {
			sum += v;
			continue;
		}
		if (i === period - 1) {
			sum += v;
			out[i] = sum / period;
			continue;
		}
		out[i] = v * k + out[i - 1] * (1 - k);
	}
	return out;
}
/** Wilder ATR. First value is the SMA of the first `period` true ranges. */
function computeAtr(candles, period) {
	const n = candles.length;
	const out = new Array(n).fill(null);
	if (period <= 0 || n < period) return out;
	const tr = new Array(n);
	for (let i = 0; i < n; i++) {
		const h = candles[i].h;
		const l = candles[i].l;
		if (i === 0) tr[i] = h - l;
		else {
			const pc = candles[i - 1].c;
			tr[i] = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
		}
	}
	let sum = 0;
	for (let i = 0; i < period; i++) sum += tr[i];
	out[period - 1] = sum / period;
	for (let i = period; i < n; i++) out[i] = (out[i - 1] * (period - 1) + tr[i]) / period;
	return out;
}
/** Wilder RSI. Flat tape seeds at 50. */
function computeRsi(values, period) {
	const n = values.length;
	const out = new Array(n).fill(null);
	if (period <= 0 || n <= period) return out;
	let gain = 0;
	let loss = 0;
	for (let i = 1; i <= period; i++) {
		const d = values[i] - values[i - 1];
		if (d >= 0) gain += d;
		else loss -= d;
	}
	gain /= period;
	loss /= period;
	out[period] = rsiFrom(gain, loss);
	for (let i = period + 1; i < n; i++) {
		const d = values[i] - values[i - 1];
		const g = d > 0 ? d : 0;
		const l = d < 0 ? -d : 0;
		gain = (gain * (period - 1) + g) / period;
		loss = (loss * (period - 1) + l) / period;
		out[i] = rsiFrom(gain, loss);
	}
	return out;
}
function rsiFrom(gain, loss) {
	if (gain === 0 && loss === 0) return 50;
	if (loss === 0) return 100;
	if (gain === 0) return 0;
	return 100 - 100 / (1 + gain / loss);
}
/** Ehlers CTI: Pearson of close vs a straight line over `period` bars. */
function computeCti(values, period) {
	const n = values.length;
	const out = new Array(n).fill(null);
	if (period < 3 || n < period) return out;
	const xs = Array.from({ length: period }, (_, i) => i);
	const ys = new Array(period);
	for (let i = period - 1; i < n; i++) {
		for (let k = 0; k < period; k++) ys[k] = values[i - period + 1 + k];
		const r = pearson(xs, ys);
		out[i] = Number.isFinite(r) ? r : 0;
	}
	return out;
}
/** Bollinger: SMA ± k × σ population. Width = (upper − lower) / mid × 100. */
function computeBb(values, period, k) {
	const n = values.length;
	const mid = computeSma(values, period);
	const upper = new Array(n).fill(null);
	const lower = new Array(n).fill(null);
	const widthPct = new Array(n).fill(null);
	const pctB = new Array(n).fill(null);
	if (period <= 1 || n < period) return {
		mid,
		upper,
		lower,
		widthPct,
		pctB
	};
	for (let i = period - 1; i < n; i++) {
		const m = mid[i];
		if (m == null) continue;
		let ss = 0;
		for (let j = 0; j < period; j++) {
			const d = values[i - period + 1 + j] - m;
			ss += d * d;
		}
		const sd = Math.sqrt(ss / period);
		const u = m + k * sd;
		const l = m - k * sd;
		upper[i] = u;
		lower[i] = l;
		const span = u - l;
		widthPct[i] = m > 0 ? span / m * 100 : 0;
		pctB[i] = span > 0 ? (values[i] - l) / span : .5;
	}
	return {
		mid,
		upper,
		lower,
		widthPct,
		pctB
	};
}
/** Causal percentile of `values[i]` among the trailing `lookback` finite points. */
function rankInWindow(values, lookback) {
	const n = values.length;
	const out = new Array(n).fill(null);
	if (lookback < 8) return out;
	for (let i = 0; i < n; i++) {
		const v = values[i];
		if (v == null || !Number.isFinite(v)) continue;
		const from = Math.max(0, i - lookback + 1);
		let c = 0;
		let le = 0;
		for (let j = from; j <= i; j++) {
			const w = values[j];
			if (w == null || !Number.isFinite(w)) continue;
			c += 1;
			if (w <= v) le += 1;
		}
		if (c < 20) continue;
		out[i] = le / c;
	}
	return out;
}
var RECOVERY_DEPTHS = [
	.25,
	.5,
	1,
	1.5,
	2.5
];
function depthIndex(atr) {
	if (atr < .5) return 0;
	if (atr < 1) return 1;
	if (atr < 1.5) return 2;
	if (atr < 2.5) return 3;
	return 4;
}
function forecastRecoveryBars(cells, undershootAtr, emaUp) {
	const trend = emaUp ? "ema" : "down";
	const lo = RECOVERY_DEPTHS[depthIndex(undershootAtr)];
	const hit = cells.find((c) => c.trend === trend && c.depthLo === lo) ?? cells.find((c) => c.trend === "all" && c.depthLo === lo);
	return hit && Number.isFinite(hit.p50) ? hit.p50 : NaN;
}
function ols$1(xs, ys) {
	const n = Math.min(xs.length, ys.length);
	if (n < 8) return {
		slope: NaN,
		intercept: NaN
	};
	let sx = 0;
	let sy = 0;
	let sxx = 0;
	let sxy = 0;
	for (let i = 0; i < n; i++) {
		const x = xs[i];
		const y = ys[i];
		sx += x;
		sy += y;
		sxx += x * x;
		sxy += x * y;
	}
	const den = n * sxx - sx * sx;
	if (den === 0) return {
		slope: NaN,
		intercept: NaN
	};
	const slope = (n * sxy - sx * sy) / den;
	return {
		slope,
		intercept: (sy - slope * sx) / n
	};
}
function summarizeBars(events) {
	const rec = events.filter((e) => e.recovered);
	const bars = rec.map((e) => e.recoveryCandles).sort((a, b) => a - b);
	return {
		n: events.length,
		nRec: rec.length,
		recRate: events.length ? rec.length / events.length : NaN,
		p50: quantile(bars, .5),
		p75: quantile(bars, .75),
		p90: quantile(bars, .9)
	};
}
function cellOf(trend, depthIdx, events) {
	const lo = RECOVERY_DEPTHS[depthIdx];
	const hi = RECOVERY_DEPTHS[depthIdx + 1] ?? null;
	const s = summarizeBars(events);
	return {
		trend,
		depthLo: lo,
		depthHi: hi,
		n: s.n,
		nRec: s.nRec,
		recRate: s.recRate,
		p50: s.p50,
		p75: s.p75,
		p90: s.p90
	};
}
function buildRecovery(input) {
	const tagged = input.events.filter((e) => e.undershootAtr >= MIN_SIGNAL_ATR).map((e) => {
		const bar = input.candles[e.startIdx];
		const ema = input.ema20[e.startIdx];
		return {
			e,
			emaUp: bar != null && ema != null && bar.c > ema
		};
	});
	const byTrend = {
		ema: tagged.filter((t) => t.emaUp).map((t) => t.e),
		down: tagged.filter((t) => !t.emaUp).map((t) => t.e),
		all: tagged.map((t) => t.e)
	};
	const cells = [];
	for (const trend of [
		"ema",
		"all",
		"down"
	]) {
		const xs = byTrend[trend];
		for (let i = 0; i < RECOVERY_DEPTHS.length; i++) {
			const slice = xs.filter((e) => depthIndex(e.undershootAtr) === i);
			cells.push(cellOf(trend, i, slice));
		}
	}
	const recAll = byTrend.all.filter((e) => e.recovered);
	const recEma = byTrend.ema.filter((e) => e.recovered);
	const recDown = byTrend.down.filter((e) => e.recovered);
	const fit = ols$1(recAll.map((e) => e.undershootAtr), recAll.map((e) => e.recoveryCandles));
	const p50All = quantile(recAll.map((e) => e.recoveryCandles).sort((a, b) => a - b), .5);
	const p50Ema = quantile(recEma.map((e) => e.recoveryCandles).sort((a, b) => a - b), .5);
	const p50Down = quantile(recDown.map((e) => e.recoveryCandles).sort((a, b) => a - b), .5);
	const liveTrend = input.live.aboveEma20 ? "ema" : "down";
	const liveDepth = input.live.below && input.live.undershootAtr >= .25 ? input.live.undershootAtr : NaN;
	const typicalDepth = quantile(recAll.map((e) => e.undershootAtr).sort((a, b) => a - b), .5);
	const depth = Number.isFinite(liveDepth) ? liveDepth : typicalDepth;
	const trend = Number.isFinite(liveDepth) ? liveTrend : liveTrend;
	const lo = RECOVERY_DEPTHS[Number.isFinite(depth) ? depthIndex(depth) : 2] ?? 1;
	const hit = cells.find((c) => c.trend === trend && c.depthLo === lo) ?? cells.find((c) => c.trend === "all" && c.depthLo === lo);
	const forecast = hit ? {
		source: Number.isFinite(liveDepth) ? "live" : "typical",
		trend: hit.trend,
		depthLo: hit.depthLo,
		depthHi: hit.depthHi,
		n: hit.n,
		recRate: hit.recRate,
		p50: hit.p50,
		p75: hit.p75,
		p90: hit.p90
	} : null;
	return {
		intervalMin: input.intervalMin,
		depths: [...RECOVERY_DEPTHS],
		cells,
		corr: pearson(recAll.map((e) => e.undershootAtr), recAll.map((e) => e.recoveryCandles)),
		corrEma: pearson(recEma.map((e) => e.undershootAtr), recEma.map((e) => e.recoveryCandles)),
		corrDown: pearson(recDown.map((e) => e.undershootAtr), recDown.map((e) => e.recoveryCandles)),
		slope: fit.slope,
		intercept: fit.intercept,
		p50All,
		p50Ema,
		p50Down,
		trendLift: p50Ema - p50Down,
		forecast,
		emaPeriod: input.emaPeriod
	};
}
function volRatio(volume, volSma) {
	if (volSma == null || volSma <= 0 || !Number.isFinite(volume)) return NaN;
	return volume / volSma;
}
/** Selling pressure: red candle or close stuck in the lower 30% of the range. */
function isSellingBar(bar) {
	if (bar.c < bar.o) return true;
	const range = bar.h - bar.l;
	if (range <= 0) return bar.c <= bar.o;
	return (bar.c - bar.l) / range <= .3;
}
/** True when we should not fade: dump volume ≥ maxMult × SMA(volume). maxMult ≤ 0 disables. */
function isVolumeDump(bar, volSma, maxMult) {
	if (!(maxMult > 0)) return false;
	const r = volRatio(bar.v, volSma);
	if (!Number.isFinite(r) || r < maxMult) return false;
	return isSellingBar(bar);
}
function defaultDump(bar, volSma) {
	return isVolumeDump(bar, volSma, 2);
}
var STOP_ATR = 1.5;
var EDGE_DEPTHS = [
	1,
	1.25,
	1.5
];
var EDGE_TRENDS = [
	"up",
	"all",
	"down"
];
function fillPrice(open, limit) {
	return open < limit ? open : limit;
}
function exitPrice(open, stop) {
	return open < stop ? open : stop;
}
function netPnlPct(entry, exit, feeBps) {
	const f = feeBps / 1e4;
	return (exit * (1 - f) / (entry * (1 + f)) - 1) * 100;
}
function resolveTrend(input) {
	if (input.trendFilter) return input.trendFilter;
	return input.uptrendOnly ? "up" : "all";
}
function backtestFade(input) {
	const { candles, sma, atr, smaTrend, entryAtr, stopAtr, lookforward, intervalMin, feeBps } = input;
	const skipVolMult = input.skipVolMult ?? 0;
	const requireVolMult = input.requireVolMult ?? 0;
	const extraTrend = input.extraTrend;
	const keepAllTrades = input.keepAllTrades ?? false;
	const allow = input.allow;
	const recoveryCells = input.recoveryCells;
	const emaSeries = input.emaSeries;
	const minForecastBars = input.minForecastBars ?? 0;
	const tpSlackBars = input.tpSlackBars ?? 0;
	const forecastOn = Boolean(recoveryCells && recoveryCells.length && (minForecastBars > 0 || tpSlackBars > 0));
	const trendFilter = resolveTrend(input);
	const volSma = computeSma(candles.map((c) => c.v), 20);
	const n = candles.length;
	const trades = [];
	let nSkipped = 0;
	let nSkipForecast = 0;
	let i = 0;
	while (i < n) {
		const s = sma[i];
		const a = atr[i];
		const bar = candles[i];
		if (s == null || a == null || a <= 0) {
			i += 1;
			continue;
		}
		const trend = smaTrend[i];
		const uptrend = trend != null ? bar.c > trend : bar.c > s;
		const extra = extraTrend ? extraTrend[i] : null;
		const extraUp = extraTrend ? extra != null ? bar.c > extra : uptrend : true;
		if (trendFilter === "up" && (!uptrend || !extraUp)) {
			i += 1;
			continue;
		}
		if (trendFilter === "down" && (uptrend || !extraUp)) {
			i += 1;
			continue;
		}
		const limit = s - entryAtr * a;
		if (!(bar.l <= limit)) {
			i += 1;
			continue;
		}
		if (allow && allow[i] === false) {
			i += 1;
			continue;
		}
		if (requireVolMult > 0) {
			if (!isVolumeDump(bar, volSma[i] ?? null, requireVolMult)) {
				nSkipped += 1;
				i += 1;
				continue;
			}
		} else if (isVolumeDump(bar, volSma[i] ?? null, skipVolMult)) {
			nSkipped += 1;
			i += 1;
			continue;
		}
		let tpHold = null;
		if (forecastOn && recoveryCells) {
			const ema = emaSeries ? emaSeries[i] : null;
			const emaUp = ema != null ? bar.c > ema : uptrend;
			const p50 = forecastRecoveryBars(recoveryCells, (s - bar.l) / a, emaUp);
			if (Number.isFinite(p50) && p50 <= minForecastBars) {
				nSkipped += 1;
				nSkipForecast += 1;
				i += 1;
				continue;
			}
			if (Number.isFinite(p50) && tpSlackBars > 0) tpHold = Math.max(1, Math.round(p50) - tpSlackBars);
		}
		const entry = fillPrice(bar.o, limit);
		const stop = entry - stopAtr * a;
		let exit = bar.c;
		let reason = "time";
		let exitIdx = i;
		const tryExit = (idx, held) => {
			const b = candles[idx];
			const sj = sma[idx];
			if (b.l <= stop) {
				exit = exitPrice(b.o, stop);
				reason = "stop";
				exitIdx = idx;
				return true;
			}
			if (sj != null && b.c >= sj) {
				exit = b.c;
				reason = "sma";
				exitIdx = idx;
				return true;
			}
			if (tpHold != null && held + 1 >= tpHold) {
				exit = b.c;
				reason = "tp";
				exitIdx = idx;
				return true;
			}
			if (held >= lookforward) {
				exit = b.c;
				reason = "time";
				exitIdx = idx;
				return true;
			}
			return false;
		};
		if (!tryExit(i, 0)) {
			let held = 1;
			let j = i + 1;
			let closed = false;
			while (j < n) {
				if (tryExit(j, held)) {
					closed = true;
					break;
				}
				held += 1;
				j += 1;
			}
			if (!closed) {
				exitIdx = n - 1;
				exit = candles[exitIdx].c;
				reason = "time";
			}
		}
		const bars = exitIdx - i + 1;
		trades.push({
			entryT: bar.t,
			exitT: candles[exitIdx].t,
			entry,
			exit,
			pnlPct: netPnlPct(entry, exit, feeBps),
			bars,
			durationMin: bars * intervalMin,
			reason,
			uptrend,
			volRatio: volRatio(bar.v, volSma[i] ?? null)
		});
		i = exitIdx + 1;
	}
	return summarizeRun(trades, candles, feeBps, entryAtr, stopAtr, trendFilter, skipVolMult, requireVolMult, nSkipped, nSkipForecast, forecastOn, keepAllTrades);
}
function meanPnl(xs) {
	if (xs.length === 0) return NaN;
	let s = 0;
	for (const t of xs) s += t.pnlPct;
	return s / xs.length;
}
function summarizeRun(trades, candles, feeBps, entryAtr, stopAtr, trendFilter, skipVolMult, requireVolMult, nSkipped, nSkipForecast, forecastOn, keepAllTrades = false) {
	const first = candles[0];
	const last = candles[candles.length - 1];
	const buyHoldPct = first.c > 0 ? (last.c - first.c) / first.c * 100 : NaN;
	const pnls = trades.map((t) => t.pnlPct);
	const wins = pnls.filter((p) => p > 0);
	const losses = pnls.filter((p) => p <= 0);
	const grossWin = wins.reduce((s, v) => s + v, 0);
	const grossLoss = losses.reduce((s, v) => s + v, 0);
	const expectancy = pnls.length ? pnls.reduce((s, v) => s + v, 0) / pnls.length : NaN;
	const profitFactor = grossLoss < 0 ? grossWin / Math.abs(grossLoss) : wins.length > 0 ? 99 : NaN;
	let eq = 1;
	let peak = 1;
	let maxDd = 0;
	const equity = [{
		t: first.t,
		eq: 1
	}];
	for (const t of trades) {
		eq *= 1 + t.pnlPct / 100;
		if (eq > peak) peak = eq;
		const dd = peak > 0 ? (peak - eq) / peak : 0;
		if (dd > maxDd) maxDd = dd;
		equity.push({
			t: t.exitT,
			eq
		});
	}
	const step = equity.length <= 80 ? 1 : Math.ceil(equity.length / 80);
	const sampled = [];
	for (let k = 0; k < equity.length; k += step) sampled.push(equity[k]);
	if (sampled[sampled.length - 1] !== equity[equity.length - 1]) sampled.push(equity[equity.length - 1]);
	const midT = candles[Math.floor(candles.length / 2)].t;
	const firstHalf = trades.filter((t) => t.entryT < midT);
	const secondHalf = trades.filter((t) => t.entryT >= midT);
	return {
		entryAtr,
		stopAtr,
		uptrendOnly: trendFilter === "up",
		trendFilter,
		skipVolMult,
		requireVolMult,
		volMode: requireVolMult > 0 ? "require" : skipVolMult > 0 ? "skip" : "any",
		nSkipped,
		nSkipForecast,
		forecastOn,
		feeBps,
		n: trades.length,
		wins: wins.length,
		losses: losses.length,
		winRate: trades.length ? wins.length / trades.length : NaN,
		avgWin: wins.length ? grossWin / wins.length : NaN,
		avgLoss: losses.length ? grossLoss / losses.length : NaN,
		expectancy,
		profitFactor,
		totalPnlPct: pnls.reduce((s, v) => s + v, 0),
		compoundPct: (eq - 1) * 100,
		maxDd: maxDd * 100,
		avgBars: trades.length ? trades.reduce((s, t) => s + t.bars, 0) / trades.length : NaN,
		avgMin: trades.length ? trades.reduce((s, t) => s + t.durationMin, 0) / trades.length : NaN,
		buyHoldPct,
		trades: keepAllTrades ? trades : trades.slice(-40).reverse(),
		equity: sampled,
		volP50Sma: quantile(trades.filter((x) => x.reason === "sma" && Number.isFinite(x.volRatio)).map((x) => x.volRatio).sort((a, b) => a - b), .5),
		volP50Stop: quantile(trades.filter((x) => x.reason === "stop" && Number.isFinite(x.volRatio)).map((x) => x.volRatio).sort((a, b) => a - b), .5),
		dumpShare: trades.length ? trades.filter((x) => Number.isFinite(x.volRatio) && x.volRatio >= 2.5).length / trades.length : NaN,
		stopShare: trades.length ? trades.filter((x) => x.reason === "stop").length / trades.length : NaN,
		smaShare: trades.length ? trades.filter((x) => x.reason === "sma").length / trades.length : NaN,
		tpShare: trades.length ? trades.filter((x) => x.reason === "tp").length / trades.length : NaN,
		firstE: meanPnl(firstHalf),
		secondE: meanPnl(secondHalf),
		nFirst: firstHalf.length,
		nSecond: secondHalf.length
	};
}
function runLabel(entryAtr, trendFilter, skipVolMult, requireVolMult, forecastOn) {
	const trend = trendFilter === "up" ? "up" : trendFilter === "down" ? "down" : "all";
	let vol = "mọi vol";
	if (requireVolMult > 0) vol = `chỉ xả ≥ ${requireVolMult.toFixed(1)}×`;
	else if (skipVolMult > 0) vol = `tránh xả ${skipVolMult.toFixed(1)}×`;
	if (forecastOn) return `${fmtAtr(entryAtr)}× ${trend} · TP P50−2`;
	return `${fmtAtr(entryAtr)}× ${trend} · ${vol}`;
}
function fmtAtr(n) {
	return n.toFixed(2).replace(/0$/, "").replace(/\.$/, "");
}
function runBacktests(input) {
	const forecastOn = Boolean(input.recoveryCells && input.recoveryCells.length);
	const trendSeries = input.ema20 ?? input.smaTrend;
	const runs = (forecastOn ? [
		{
			entryAtr: 1.25,
			trendFilter: "up",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: true,
			series: trendSeries
		},
		{
			entryAtr: 1.25,
			trendFilter: "up",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: false,
			series: trendSeries
		},
		{
			entryAtr: 1.5,
			trendFilter: "up",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: true,
			series: trendSeries
		},
		{
			entryAtr: 1.25,
			trendFilter: "all",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: true,
			series: trendSeries
		}
	] : [
		{
			entryAtr: 1.5,
			trendFilter: "up",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: false,
			series: input.smaTrend
		},
		{
			entryAtr: 1.5,
			trendFilter: "up",
			skipVolMult: 2.5,
			requireVolMult: 0,
			useForecast: false,
			series: input.smaTrend
		},
		{
			entryAtr: 1.5,
			trendFilter: "all",
			skipVolMult: 0,
			requireVolMult: 0,
			useForecast: false,
			series: input.smaTrend
		},
		{
			entryAtr: 1.5,
			trendFilter: "all",
			skipVolMult: 2.5,
			requireVolMult: 0,
			useForecast: false,
			series: input.smaTrend
		}
	]).map((s) => {
		return {
			...backtestFade({
				candles: input.candles,
				sma: input.sma,
				atr: input.atr,
				smaTrend: s.series,
				lookforward: input.lookforward,
				intervalMin: input.intervalMin,
				entryAtr: s.entryAtr,
				uptrendOnly: s.trendFilter === "up",
				trendFilter: s.trendFilter,
				skipVolMult: s.skipVolMult,
				requireVolMult: s.requireVolMult,
				stopAtr: STOP_ATR,
				feeBps: 4,
				emaSeries: input.ema20,
				recoveryCells: s.useForecast ? input.recoveryCells : void 0,
				minForecastBars: s.useForecast ? 2 : 0,
				tpSlackBars: s.useForecast ? 2 : 0
			}),
			label: runLabel(s.entryAtr, s.trendFilter, s.skipVolMult, s.requireVolMult, s.useForecast)
		};
	});
	const ranked = runs.filter((r) => r.n >= 12 && Number.isFinite(r.expectancy));
	const pool = ranked.length ? ranked : runs.filter((r) => r.n > 0);
	let best = pool[0] ?? runs[0];
	for (const r of pool) if ((r.expectancy ?? -Infinity) > (best.expectancy ?? -Infinity)) best = r;
	return {
		feeBps: 4,
		stopAtr: STOP_ATR,
		lookforwardBars: input.lookforward,
		volPeriod: 20,
		runs,
		bestLabel: best.label
	};
}
function toCell(run, trend, entryAtr) {
	return {
		entryAtr,
		trend,
		n: run.n,
		winRate: run.winRate,
		expectancy: run.expectancy,
		profitFactor: run.profitFactor,
		compoundPct: run.compoundPct,
		maxDd: run.maxDd,
		stopShare: run.stopShare,
		smaShare: run.smaShare,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond
	};
}
function findCell(cells, atr, trend) {
	return cells.find((c) => c.entryAtr === atr && c.trend === trend);
}
function deltaE(a, b) {
	if (!a || !b || !Number.isFinite(a.expectancy) || !Number.isFinite(b.expectancy)) return NaN;
	return a.expectancy - b.expectancy;
}
function pickBest(cells) {
	const ranked = cells.filter((c) => c.n >= 12 && Number.isFinite(c.expectancy));
	const pool = ranked.length ? ranked : cells.filter((c) => c.n > 0);
	let best = pool[0] ?? cells[0];
	for (const c of pool) if ((c.expectancy ?? -Infinity) > (best.expectancy ?? -Infinity)) best = c;
	return best;
}
function gradeEdge(input) {
	const { best, combinedLift } = input;
	const pos = best.n >= 12 && best.expectancy > 0;
	const halves = Number.isFinite(best.firstE) && Number.isFinite(best.secondE) && best.firstE > 0 && best.secondE > 0 && best.nFirst >= 5 && best.nSecond >= 5;
	if (pos && halves) return "edge";
	if (Number.isFinite(combinedLift) && combinedLift > .03) return "filter";
	return "none";
}
function runEdgeGrid(input) {
	const cells = [];
	for (const trend of EDGE_TRENDS) for (const entryAtr of EDGE_DEPTHS) {
		const raw = backtestFade({
			...input,
			entryAtr,
			uptrendOnly: trend === "up",
			trendFilter: trend,
			skipVolMult: 0,
			requireVolMult: 0,
			stopAtr: STOP_ATR,
			feeBps: 4
		});
		cells.push(toCell(raw, trend, entryAtr));
	}
	const deepAll = findCell(cells, 1.5, "all");
	const shallowAll = findCell(cells, 1, "all");
	const deepUp = findCell(cells, 1.5, "up");
	const deepDown = findCell(cells, 1.5, "down");
	const atrLift = deltaE(deepAll, shallowAll);
	const trendLift = deltaE(deepUp, deepAll);
	const downLift = deltaE(deepDown, deepAll);
	const combinedLift = deltaE(deepUp, shallowAll);
	const stopDelta = deepAll && shallowAll && Number.isFinite(deepAll.stopShare) && Number.isFinite(shallowAll.stopShare) ? deepAll.stopShare - shallowAll.stopShare : NaN;
	const best = pickBest(cells);
	return {
		depths: EDGE_DEPTHS,
		cells,
		atrLift,
		trendLift,
		downLift,
		combinedLift,
		stopDelta,
		best,
		verdict: gradeEdge({
			best,
			combinedLift
		})
	};
}
var ENTRY_ATR$4 = 1.25;
var EPS$2 = .01;
function isUp(barC, series, i, sma) {
	const t = series[i];
	return t != null ? barC > t : barC > sma;
}
function bookOf$2(key, label, run) {
	return {
		key,
		label,
		n: run.n,
		expectancy: run.expectancy,
		winRate: run.winRate,
		stopShare: run.stopShare,
		compoundPct: run.compoundPct,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond
	};
}
function bucketOf(key, label, trades) {
	const n = trades.length;
	const wins = trades.filter((t) => t.pnlPct > 0).length;
	const e = n ? trades.reduce((s, t) => s + t.pnlPct, 0) / n : NaN;
	const stops = n ? trades.filter((t) => t.reason === "stop").length / n : NaN;
	return {
		key,
		label,
		n,
		expectancy: e,
		winRate: n ? wins / n : NaN,
		stopShare: stops
	};
}
function pickWinner$2(books) {
	const ranked = [
		books.find((b) => b.key === "sma50"),
		books.find((b) => b.key === "ema20"),
		books.find((b) => b.key === "and")
	].filter((b) => !!b && b.n >= 12 && Number.isFinite(b.expectancy));
	if (ranked.length === 0) return "tie";
	let best = ranked[0];
	for (const b of ranked) if (b.expectancy > best.expectancy) best = b;
	const second = ranked.filter((b) => b.key !== best.key).sort((a, c) => c.expectancy - a.expectancy)[0];
	if (second && best.expectancy - second.expectancy < EPS$2) return "tie";
	if (best.key === "all") return "tie";
	return best.key;
}
function runTrendCompare(input) {
	const base = {
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: ENTRY_ATR$4,
		stopAtr: STOP_ATR,
		feeBps: 4,
		skipVolMult: 0,
		requireVolMult: 0
	};
	const all = backtestFade({
		...base,
		smaTrend: input.sma50,
		uptrendOnly: false,
		trendFilter: "all",
		keepAllTrades: true
	});
	const smaBook = backtestFade({
		...base,
		smaTrend: input.sma50,
		uptrendOnly: true,
		trendFilter: "up"
	});
	const emaBook = backtestFade({
		...base,
		smaTrend: input.ema20,
		uptrendOnly: true,
		trendFilter: "up"
	});
	const andBook = backtestFade({
		...base,
		smaTrend: input.sma50,
		extraTrend: input.ema20,
		uptrendOnly: true,
		trendFilter: "up"
	});
	const books = [
		bookOf$2("all", "Mọi trend", all),
		bookOf$2("sma50", `SMA50 up`, smaBook),
		bookOf$2("ema20", `EMA${input.emaPeriod} up`, emaBook),
		bookOf$2("and", "Cả hai up", andBook)
	];
	const idx = /* @__PURE__ */ new Map();
	for (let i = 0; i < input.candles.length; i++) idx.set(input.candles[i].t, i);
	const both = [];
	const smaOnly = [];
	const emaOnly = [];
	const neither = [];
	let agree = 0;
	for (const tr of all.trades) {
		const i = idx.get(tr.entryT);
		if (i == null) continue;
		const bar = input.candles[i];
		const s = input.sma[i];
		if (s == null) continue;
		const smaUp = isUp(bar.c, input.sma50, i, s);
		const emaUp = isUp(bar.c, input.ema20, i, s);
		if (smaUp === emaUp) agree += 1;
		if (smaUp && emaUp) both.push(tr);
		else if (smaUp) smaOnly.push(tr);
		else if (emaUp) emaOnly.push(tr);
		else neither.push(tr);
	}
	const tagged = both.length + smaOnly.length + emaOnly.length + neither.length;
	const buckets = [
		bucketOf("both", "Cả hai up", both),
		bucketOf("smaOnly", "Chỉ SMA50", smaOnly),
		bucketOf("emaOnly", `Chỉ EMA${input.emaPeriod}`, emaOnly),
		bucketOf("neither", "Cả hai down", neither)
	];
	const deltaE = Number.isFinite(emaBook.expectancy) && Number.isFinite(smaBook.expectancy) ? emaBook.expectancy - smaBook.expectancy : NaN;
	return {
		entryAtr: ENTRY_ATR$4,
		smaPeriod: 50,
		emaPeriod: input.emaPeriod,
		agreeRate: tagged ? agree / tagged : NaN,
		books,
		buckets,
		deltaE,
		winner: pickWinner$2(books)
	};
}
var ENTRY_ATR$3 = 1.25;
var EPS$1 = .01;
function gate(n, pred) {
	const out = new Array(n);
	for (let i = 0; i < n; i++) out[i] = pred(i);
	return out;
}
function bookOf$1(key, label, run) {
	return {
		key,
		label,
		n: run.n,
		expectancy: run.expectancy,
		winRate: run.winRate,
		stopShare: run.stopShare,
		compoundPct: run.compoundPct,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond
	};
}
function pickWinner$1(books) {
	const ranked = books.filter((b) => b.n >= 12 && Number.isFinite(b.expectancy));
	if (ranked.length === 0) return "tie";
	let best = ranked[0];
	for (const b of ranked) if (b.expectancy > best.expectancy) best = b;
	const second = ranked.filter((b) => b.key !== best.key).sort((a, c) => c.expectancy - a.expectancy)[0];
	if (second && best.expectancy - second.expectancy < EPS$1) return "tie";
	return best.key;
}
function runOscCompare(input) {
	const n = input.candles.length;
	const baseArgs = {
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		smaTrend: input.ema20,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: ENTRY_ATR$3,
		stopAtr: STOP_ATR,
		feeBps: 4,
		uptrendOnly: true,
		trendFilter: "up"
	};
	const fastG = gate(n, (i) => {
		const a = input.rsiFast[i];
		const b = input.rsiSlow[i];
		return a != null && b != null && a < b;
	});
	const slowG = gate(n, (i) => {
		const r = input.rsiSlow[i];
		return r != null && r > 50;
	});
	const ctiG = gate(n, (i) => {
		const c = input.cti[i];
		return c != null && c <= 0;
	});
	const ctiPosG = gate(n, (i) => {
		const c = input.cti[i];
		return c != null && c > 0;
	});
	const fastSlowG = gate(n, (i) => fastG[i] === true && slowG[i] === true);
	const fastCtiG = gate(n, (i) => fastG[i] === true && ctiG[i] === true);
	const slowCtiG = gate(n, (i) => slowG[i] === true && ctiG[i] === true);
	const comboG = gate(n, (i) => fastG[i] === true && slowG[i] === true && ctiG[i] === true);
	const books = [
		bookOf$1("base", `EMA${input.emaPeriod} only`, backtestFade(baseArgs)),
		bookOf$1("fast", `RSI7 dưới RSI21`, backtestFade({
			...baseArgs,
			allow: fastG
		})),
		bookOf$1("slow", `RSI21 trên 50`, backtestFade({
			...baseArgs,
			allow: slowG
		})),
		bookOf$1("cti", `CTI20 không dương`, backtestFade({
			...baseArgs,
			allow: ctiG
		}))
	];
	const pairs = [
		bookOf$1("fastSlow", "RSI fast + slow", backtestFade({
			...baseArgs,
			allow: fastSlowG
		})),
		bookOf$1("fastCti", "RSI fast + CTI", backtestFade({
			...baseArgs,
			allow: fastCtiG
		})),
		bookOf$1("slowCti", "RSI slow + CTI", backtestFade({
			...baseArgs,
			allow: slowCtiG
		})),
		bookOf$1("combo", "Cả ba", backtestFade({
			...baseArgs,
			allow: comboG
		}))
	];
	const anti = bookOf$1("ctiPos", "CTI dương", backtestFade({
		...baseArgs,
		allow: ctiPosG
	}));
	const combo = pairs.find((b) => b.key === "combo");
	const base = books.find((b) => b.key === "base");
	return {
		entryAtr: ENTRY_ATR$3,
		rsiFast: 7,
		rsiSlow: 21,
		ctiPeriod: 20,
		rsiSlowMin: 50,
		ctiMax: 0,
		books,
		pairs,
		anti,
		deltaE: combo && base && Number.isFinite(combo.expectancy) && Number.isFinite(base.expectancy) ? combo.expectancy - base.expectancy : NaN,
		winner: pickWinner$1([...books, ...pairs]),
		emaPeriod: input.emaPeriod
	};
}
var DEPTH_SWEEP = [
	.5,
	.75,
	1,
	1.25,
	1.5,
	1.75,
	2,
	2.5
];
function ols(xs, ys) {
	const n = Math.min(xs.length, ys.length);
	if (n < 3) return NaN;
	let sx = 0;
	let sy = 0;
	let sxx = 0;
	let sxy = 0;
	for (let i = 0; i < n; i++) {
		const x = xs[i];
		const y = ys[i];
		sx += x;
		sy += y;
		sxx += x * x;
		sxy += x * y;
	}
	const den = n * sxx - sx * sx;
	if (den === 0) return NaN;
	return (n * sxy - sx * sy) / den;
}
function toPoint(run, entryAtr) {
	return {
		entryAtr,
		n: run.n,
		expectancy: run.expectancy,
		winRate: run.winRate,
		stopShare: run.stopShare,
		smaShare: run.smaShare,
		tpShare: run.tpShare,
		compoundPct: run.compoundPct,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond,
		nSkipForecast: run.nSkipForecast,
		avgBars: run.avgBars
	};
}
function usable(p) {
	return p.n >= 12 && Number.isFinite(p.expectancy);
}
function pickPeak(points) {
	const pool = points.filter(usable);
	const src = pool.length ? pool : points.filter((p) => p.n > 0);
	let best = src[0] ?? points[0];
	for (const p of src) if (p.expectancy > best.expectancy) best = p;
	else if (p.expectancy === best.expectancy && p.n > best.n) best = p;
	return best;
}
function slopeOf(points) {
	const ok = points.filter(usable);
	return ols(ok.map((p) => p.entryAtr), ok.map((p) => p.expectancy));
}
function grade$1(input) {
	const { up, all, peak } = input;
	const valid = up.filter(usable);
	const first = valid[0];
	const last = valid[valid.length - 1];
	const shallow = up.find((p) => p.entryAtr === .5) ?? first;
	const delta = first && Number.isFinite(peak.expectancy) && shallow && Number.isFinite(shallow.expectancy) ? peak.expectancy - shallow.expectancy : NaN;
	const halves = Number.isFinite(peak.firstE) && Number.isFinite(peak.secondE) && peak.firstE > 0 && peak.secondE > 0 && peak.nFirst >= 5 && peak.nSecond >= 5;
	const interior = first != null && last != null && peak.entryAtr !== first.entryAtr && peak.entryAtr !== last.entryAtr;
	const slopeAll = slopeOf(all);
	const allFlat = !Number.isFinite(slopeAll) || Math.abs(slopeAll) < .02;
	if (interior && halves && Number.isFinite(delta) && delta > .02 && allFlat) return "sweet-spot";
	if (last && peak.entryAtr === last.entryAtr && halves && Number.isFinite(delta) && delta > .02) return "deeper-helps";
	if (first && peak.entryAtr === first.entryAtr) return "shallow-better";
	return "flat";
}
function runDepthSweep(input) {
	const { candles, sma, atr, ema20, recoveryCells, lookforward, intervalMin } = input;
	const run = (entryAtr, trendFilter, forecast) => backtestFade({
		candles,
		sma,
		atr,
		smaTrend: ema20,
		entryAtr,
		stopAtr: STOP_ATR,
		lookforward,
		intervalMin,
		uptrendOnly: trendFilter === "up",
		trendFilter,
		feeBps: 4,
		emaSeries: ema20,
		recoveryCells: forecast ? recoveryCells : void 0,
		minForecastBars: forecast ? 2 : 0,
		tpSlackBars: forecast ? 2 : 0
	});
	const up = [];
	const forecast = [];
	const all = [];
	for (const d of DEPTH_SWEEP) {
		up.push(toPoint(run(d, "up", false), d));
		forecast.push(toPoint(run(d, "up", true), d));
		all.push(toPoint(run(d, "all", false), d));
	}
	const peakUp = pickPeak(up);
	const peakForecast = pickPeak(forecast);
	const shallow = up[0];
	const occupancyDrop = shallow && peakUp.n > 0 ? shallow.n / peakUp.n : NaN;
	const skipFloor = forecast.find((p) => p.nSkipForecast === 0 && p.n > 0)?.entryAtr ?? NaN;
	const deltaE = shallow && Number.isFinite(shallow.expectancy) && Number.isFinite(peakUp.expectancy) ? peakUp.expectancy - shallow.expectancy : NaN;
	return {
		depths: [...DEPTH_SWEEP],
		emaPeriod: input.emaPeriod,
		up,
		forecast,
		all,
		peakUp,
		peakForecast,
		slopeUp: slopeOf(up),
		slopeAll: slopeOf(all),
		deltaE,
		occupancyDrop,
		skipFloor,
		verdict: grade$1({
			up,
			all,
			peak: peakUp
		})
	};
}
var EMA_TUNE_PERIODS = [
	8,
	9,
	10,
	12,
	14,
	16,
	18,
	20,
	26,
	34,
	50
];
var EMA_BASELINE = 20;
var ENTRY_ATR$2 = 1.25;
var MIN_N = 30;
var MIN_HALF = 12;
function tuneCell(period, run) {
	const stability = Number.isFinite(run.firstE) && Number.isFinite(run.secondE) ? Math.min(run.firstE, run.secondE) : NaN;
	return {
		period,
		n: run.n,
		expectancy: run.expectancy,
		winRate: run.winRate,
		stopShare: run.stopShare,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond,
		stability
	};
}
function pickEmaPeriod(cells) {
	const stable = cells.filter((c) => c.n >= MIN_N && c.nFirst >= MIN_HALF && c.nSecond >= MIN_HALF && c.firstE > 0 && c.secondE > 0 && Number.isFinite(c.stability));
	const pool = stable.length ? stable : cells.filter((c) => c.n >= 12 && Number.isFinite(c.expectancy));
	if (pool.length === 0) return EMA_BASELINE;
	return pool.slice().sort((a, b) => {
		const sa = Number.isFinite(a.stability) ? a.stability : a.expectancy;
		const sb = Number.isFinite(b.stability) ? b.stability : b.expectancy;
		if (Math.abs(sb - sa) > .001) return sb - sa;
		if (Math.abs(b.winRate - a.winRate) > .005) return b.winRate - a.winRate;
		return b.expectancy - a.expectancy;
	})[0].period;
}
function runEmaTune(input) {
	const closes = input.candles.map((c) => c.c);
	const base = {
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: ENTRY_ATR$2,
		stopAtr: STOP_ATR,
		feeBps: 4,
		skipVolMult: 0,
		requireVolMult: 0,
		uptrendOnly: true,
		trendFilter: "up"
	};
	const cells = EMA_TUNE_PERIODS.map((period) => {
		const ema = computeEma(closes, period);
		return tuneCell(period, backtestFade({
			...base,
			smaTrend: ema
		}));
	});
	const winner = pickEmaPeriod(cells);
	const winnerCell = cells.find((c) => c.period === winner) ?? cells[0];
	const baselineCell = cells.find((c) => c.period === EMA_BASELINE) ?? winnerCell;
	return {
		entryAtr: ENTRY_ATR$2,
		baseline: EMA_BASELINE,
		winner,
		cells,
		deltaE: winnerCell.expectancy - baselineCell.expectancy,
		deltaWr: winnerCell.winRate - baselineCell.winRate,
		baselineCell,
		winnerCell
	};
}
var ENTRY_ATR$1 = 1.25;
var EPS = .03;
function bookOf(key, label, run) {
	return {
		key,
		label,
		n: run.n,
		expectancy: run.expectancy,
		winRate: run.winRate,
		stopShare: run.stopShare,
		compoundPct: run.compoundPct,
		firstE: run.firstE,
		secondE: run.secondE,
		nFirst: run.nFirst,
		nSecond: run.nSecond
	};
}
function pickWinner(books) {
	const ranked = books.filter((b) => b.n >= 12 && Number.isFinite(b.expectancy) && b.key !== "all");
	if (ranked.length === 0) return "tie";
	let best = ranked[0];
	for (const b of ranked) if (b.expectancy > best.expectancy) best = b;
	else if (b.expectancy === best.expectancy && b.n > best.n) best = b;
	const all = books.find((b) => b.key === "all");
	if (all && Number.isFinite(all.expectancy) && best.expectancy - all.expectancy < .01) return "tie";
	return best.key;
}
function grade(input) {
	const { winner, squeeze, expand, below, all, corrWidthAtrPct, deltaSE } = input;
	const proxy = Number.isFinite(corrWidthAtrPct) && Math.abs(corrWidthAtrPct) >= .85;
	const squeezeOk = squeeze.n >= 12 && Number.isFinite(squeeze.firstE) && Number.isFinite(squeeze.secondE) && squeeze.firstE > 0 && squeeze.secondE > 0;
	const expandOk = expand.n >= 12 && Number.isFinite(expand.firstE) && Number.isFinite(expand.secondE) && expand.firstE > 0 && expand.secondE > 0;
	const belowLift = below.n >= 12 && Number.isFinite(below.expectancy) && Number.isFinite(all.expectancy) ? below.expectancy - all.expectancy : NaN;
	if (Number.isFinite(deltaSE) && deltaSE >= EPS && squeezeOk) return "squeeze";
	if (Number.isFinite(deltaSE) && deltaSE <= -.03 && expandOk) return "expand";
	if (winner === "belowLower" && Number.isFinite(belowLift) && belowLift >= EPS) return "below";
	if (proxy) return "proxy";
	return "none";
}
function runBbWidth(input) {
	const n = input.candles.length;
	const bb = computeBb(input.candles.map((c) => c.c), 20, 2);
	const rank = rankInWindow(bb.widthPct, 288);
	const widthAtr = [];
	const atrPct = [];
	for (let i = 0; i < n; i++) {
		const w = bb.widthPct[i];
		const a = input.atr[i];
		const px = input.candles[i].c;
		if (w == null || a == null || !(px > 0) || !(a > 0)) continue;
		widthAtr.push(w);
		atrPct.push(a / px * 100);
	}
	const recW = [];
	const recBars = [];
	for (const e of input.events) {
		if (!e.recovered) continue;
		const w = bb.widthPct[e.startIdx];
		if (w == null || !Number.isFinite(w)) continue;
		recW.push(w);
		recBars.push(e.recoveryCandles);
	}
	const gate = (pred) => {
		const out = new Array(n);
		for (let i = 0; i < n; i++) out[i] = pred(i);
		return out;
	};
	const base = {
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		smaTrend: input.ema20,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: ENTRY_ATR$1,
		stopAtr: STOP_ATR,
		feeBps: 4,
		uptrendOnly: true,
		trendFilter: "up"
	};
	const all = bookOf("all", "Mọi BB", backtestFade(base));
	const squeeze = bookOf("squeeze", `Squeeze P≤${Math.round(BB_SQUEEZE_P * 100)}`, backtestFade({
		...base,
		allow: gate((i) => rank[i] != null && rank[i] <= .2)
	}));
	const mid = bookOf("mid", "Giữa dải", backtestFade({
		...base,
		allow: gate((i) => {
			const p = rank[i];
			return p != null && p > .2 && p < .8;
		})
	}));
	const expand = bookOf("expand", `Rộng P≥${Math.round(BB_EXPAND_P * 100)}`, backtestFade({
		...base,
		allow: gate((i) => rank[i] != null && rank[i] >= .8)
	}));
	const below = bookOf("belowLower", "Low dưới dải dưới", backtestFade({
		...base,
		allow: gate((i) => {
			const lo = bb.lower[i];
			return lo != null && input.candles[i].l < lo;
		})
	}));
	const books = [
		all,
		squeeze,
		mid,
		expand,
		below
	];
	const squeezeLift = squeeze.expectancy - all.expectancy;
	const expandLift = expand.expectancy - all.expectancy;
	const deltaSE = squeeze.expectancy - expand.expectancy;
	const winner = pickWinner(books);
	const corrWidthAtrPct = pearson(widthAtr, atrPct);
	const corrWidthRecovery = pearson(recW, recBars);
	return {
		period: 20,
		k: 2,
		rankBars: 288,
		squeezeP: BB_SQUEEZE_P,
		expandP: BB_EXPAND_P,
		entryAtr: ENTRY_ATR$1,
		emaPeriod: input.emaPeriod,
		books,
		corrWidthAtrPct,
		corrWidthRecovery,
		squeezeLift,
		expandLift,
		deltaSE,
		winner,
		verdict: grade({
			winner,
			squeeze,
			expand,
			below,
			all,
			corrWidthAtrPct,
			deltaSE
		})
	};
}
function liveBb(input) {
	const i = input.widthPct.length - 1;
	const width = input.widthPct[i] ?? null;
	const pctile = input.rank[i] ?? null;
	const pctB = input.pctB[i] ?? null;
	const lower = input.lower[i] ?? null;
	return {
		bbWidthPct: width,
		bbPctile: pctile != null ? pctile * 100 : null,
		bbSqueeze: pctile != null && pctile <= .2,
		bbExpand: pctile != null && pctile >= .8,
		bbPctB: pctB,
		bbBelowLower: lower != null && input.lastLow < lower
	};
}
var ENTRY_ATR = 1.25;
var EPS_E = .001;
var EPS_WR = .005;
function pickType(ema, sma) {
	const se = ema.stability;
	const ss = sma.stability;
	if (!Number.isFinite(se) && !Number.isFinite(ss)) return "tie";
	if (!Number.isFinite(se)) return "sma";
	if (!Number.isFinite(ss)) return "ema";
	if (Math.abs(ss - se) < EPS_E && Math.abs(ema.winRate - sma.winRate) < EPS_WR) return "tie";
	if (ss > se + EPS_E) return "sma";
	if (se > ss + EPS_E) return "ema";
	return sma.winRate > ema.winRate ? "sma" : "ema";
}
function runMaType(input) {
	const closes = input.candles.map((c) => c.c);
	const base = {
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: ENTRY_ATR,
		stopAtr: STOP_ATR,
		feeBps: 4,
		skipVolMult: 0,
		requireVolMult: 0,
		uptrendOnly: true,
		trendFilter: "up"
	};
	const emaByP = new Map(input.emaCells.map((c) => [c.period, c]));
	const pairs = EMA_TUNE_PERIODS.map((period) => {
		const smaRun = backtestFade({
			...base,
			smaTrend: computeSma(closes, period)
		});
		const sma = tuneCell(period, smaRun);
		const ema = emaByP.get(period) ?? tuneCell(period, smaRun);
		return {
			period,
			ema,
			sma,
			deltaE: ema.expectancy - sma.expectancy,
			deltaWr: ema.winRate - sma.winRate
		};
	});
	const emaCells = pairs.map((p) => p.ema);
	const smaCells = pairs.map((p) => p.sma);
	const bestEmaP = pickEmaPeriod(emaCells);
	const bestSmaP = pickEmaPeriod(smaCells);
	const bestEma = emaCells.find((c) => c.period === bestEmaP) ?? emaCells[0];
	const bestSma = smaCells.find((c) => c.period === bestSmaP) ?? smaCells[0];
	const matched = pairs.find((p) => p.period === input.emaWinner) ?? pairs.find((p) => p.period === bestEma.period) ?? pairs[0];
	let emaWins = 0;
	let smaWins = 0;
	for (const p of pairs) if (p.deltaE > EPS_E) emaWins += 1;
	else if (p.deltaE < -.001) smaWins += 1;
	return {
		entryAtr: ENTRY_ATR,
		pairs,
		emaWins,
		smaWins,
		bestEma,
		bestSma,
		matched,
		winner: pickType(bestEma, bestSma),
		deltaBestE: bestEma.expectancy - bestSma.expectancy,
		deltaBestWr: bestEma.winRate - bestSma.winRate
	};
}
function emptyStats() {
	const q = summarize([]);
	return {
		nEvents: 0,
		nRecovered: 0,
		nFailed: 0,
		nSignal: 0,
		recoveryRate: NaN,
		recoveredWithin: {
			c1: NaN,
			c3: NaN,
			c6: NaN,
			c12: NaN,
			c24: NaN
		},
		pct: q,
		atr: q,
		durationCandles: q,
		durationMin: q,
		bouncePct: q,
		firstCandleIsTroughRate: NaN,
		extraDumpPct: q,
		histPct: [],
		histAtr: []
	};
}
function buildGroup(events) {
	if (events.length === 0) return emptyStats();
	const recoveredAll = events.filter((e) => e.recovered);
	const recovered = recoveredAll.filter((e) => e.undershootAtr >= MIN_SIGNAL_ATR);
	const rate = (k) => events.filter((e) => e.recovered && e.recoveryCandles <= k).length / events.length;
	const pcts = recovered.map((e) => e.undershootPct);
	const atrs = recovered.map((e) => e.undershootAtr);
	const durs = recovered.map((e) => e.recoveryCandles);
	const mins = recovered.map((e) => e.durationMin);
	const bounce = recovered.map((e) => e.bouncePct).filter((v) => v != null);
	const extra = recovered.map((e) => Math.max(0, e.undershootPct - e.firstUndershootPct));
	const troughFirst = recovered.length === 0 ? NaN : recovered.filter((e) => e.troughT === e.startT).length / recovered.length;
	return {
		nEvents: events.length,
		nRecovered: recoveredAll.length,
		nFailed: events.length - recoveredAll.length,
		nSignal: recovered.length,
		recoveryRate: recoveredAll.length / events.length,
		recoveredWithin: {
			c1: rate(1),
			c3: rate(3),
			c6: rate(6),
			c12: rate(12),
			c24: rate(24)
		},
		pct: summarize(pcts),
		atr: summarize(atrs),
		durationCandles: summarize(durs),
		durationMin: summarize(mins),
		bouncePct: summarize(bounce),
		firstCandleIsTroughRate: troughFirst,
		extraDumpPct: summarize(extra),
		histPct: histogram(pcts, 18, Number.isFinite(summarize(pcts).p95) ? summarize(pcts).p95 * 1.15 : void 0),
		histAtr: histogram(atrs, 18, Number.isFinite(summarize(atrs).p95) ? summarize(atrs).p95 * 1.15 : void 0)
	};
}
function detectDips(candles, sma, atr, smaTrend, lookforward, intervalMin) {
	const n = candles.length;
	const volSma = computeSma(candles.map((c) => c.v), 20);
	const events = [];
	let i = 0;
	while (i < n) {
		const s = sma[i];
		const a = atr[i];
		const bar = candles[i];
		if (s == null || a == null || a <= 0 || !(bar.l < s)) {
			i += 1;
			continue;
		}
		const start = i;
		let recovered = false;
		let end = i;
		let minLow = bar.l;
		let troughIdx = i;
		let maxPct = (s - bar.l) / s * 100;
		let maxAtr = (s - bar.l) / a;
		let maxVolR = volRatio(bar.v, volSma[i] ?? null);
		const firstPct = maxPct;
		const trendSma = smaTrend[i];
		const uptrend = trendSma != null ? bar.c > trendSma : bar.c > s;
		if (bar.c >= s) {
			recovered = true;
			end = i;
		} else {
			const limit = Math.min(n - 1, i + lookforward);
			for (let j = i + 1; j <= limit; j++) {
				const sj = sma[j];
				const aj = atr[j];
				const cj = candles[j];
				if (sj != null && aj != null && aj > 0 && cj.l < sj) {
					const pct = (sj - cj.l) / sj * 100;
					const am = (sj - cj.l) / aj;
					if (cj.l < minLow) {
						minLow = cj.l;
						troughIdx = j;
					}
					if (pct > maxPct) maxPct = pct;
					if (am > maxAtr) maxAtr = am;
					const vr = volRatio(cj.v, volSma[j] ?? null);
					if (Number.isFinite(vr) && (!Number.isFinite(maxVolR) || vr > maxVolR)) maxVolR = vr;
				}
				if (sj != null && cj.c >= sj) {
					recovered = true;
					end = j;
					break;
				}
				end = j;
			}
		}
		const smaTrough = sma[troughIdx] ?? s;
		const atrTrough = atr[troughIdx] ?? a;
		const recBars = end - start + 1;
		const bounce = recovered && minLow > 0 ? (candles[end].c - minLow) / minLow * 100 : null;
		events.push({
			startT: candles[start].t,
			endT: candles[end].t,
			troughT: candles[troughIdx].t,
			startIdx: start,
			endIdx: end,
			recovered,
			recoveryCandles: recBars,
			durationMin: recBars * intervalMin,
			minLow,
			smaAtTrough: smaTrough,
			atrAtTrough: atrTrough,
			undershootPct: maxPct,
			undershootAtr: maxAtr,
			firstUndershootPct: firstPct,
			bouncePct: bounce,
			uptrend,
			closeStart: bar.c,
			volRatioTrough: volRatio(candles[troughIdx].v, volSma[troughIdx] ?? null),
			volRatioMax: maxVolR,
			volumeDump: defaultDump(candles[troughIdx], volSma[troughIdx] ?? null)
		});
		if (recovered) i = end + 1;
		else {
			let k = end + 1;
			while (k < n && (sma[k] == null || candles[k].c < sma[k])) k += 1;
			i = k;
		}
	}
	return events;
}
function relativeSpread(q) {
	if (!Number.isFinite(q.p50) || q.p50 === 0) return NaN;
	return (q.p90 - q.p10) / Math.abs(q.p50);
}
function gradeAtr(cvPct, cvAtr, corr) {
	const cvWin = Number.isFinite(cvPct) && Number.isFinite(cvAtr) && cvAtr < cvPct * .85;
	const corrHigh = Number.isFinite(corr) && corr >= .45;
	if (cvWin && corrHigh) return "strong";
	if (cvWin || corrHigh) return "partial";
	return "weak";
}
function buildRegimes(recovered) {
	if (recovered.length < 8) return [];
	const atrPct = recovered.map((e) => e.smaAtTrough > 0 ? e.atrAtTrough / e.smaAtTrough * 100 : 0);
	const sortedA = atrPct.slice().sort((a, b) => a - b);
	const cuts = [
		.25,
		.5,
		.75
	].map((q) => quantile(sortedA, q));
	const buckets = [
		[],
		[],
		[],
		[]
	];
	const mids = [
		0,
		0,
		0,
		0
	];
	recovered.forEach((e, idx) => {
		const v = atrPct[idx];
		const b = v <= cuts[0] ? 0 : v <= cuts[1] ? 1 : v <= cuts[2] ? 2 : 3;
		buckets[b].push(e);
		mids[b] += v;
	});
	const labels = [
		"ATR% thấp",
		"ATR% trung bình thấp",
		"ATR% trung bình cao",
		"ATR% cao"
	];
	return buckets.map((bucket, i) => {
		const pcts = bucket.map((e) => e.undershootPct).sort((a, b) => a - b);
		const atrs = bucket.map((e) => e.undershootAtr).sort((a, b) => a - b);
		return {
			label: labels[i],
			atrPctMid: bucket.length ? mids[i] / bucket.length : NaN,
			n: bucket.length,
			medPct: quantile(pcts, .5),
			medAtr: quantile(atrs, .5)
		};
	});
}
function buildVolume(events) {
	const high = events.filter((e) => e.volumeDump);
	const low = events.filter((e) => !e.volumeDump);
	const climax = events.filter((e) => e.volumeDump && Number.isFinite(e.volRatioTrough) && e.volRatioTrough >= 2.5);
	const rec = events.filter((e) => e.recovered);
	const fail = events.filter((e) => !e.recovered);
	const recVol = rec.map((e) => e.volRatioTrough).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
	const failVol = fail.map((e) => e.volRatioTrough).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
	const rate = (xs) => xs.length ? xs.filter((e) => e.recovered).length / xs.length : NaN;
	return {
		period: 20,
		dumpMult: 2,
		recoveredP50: quantile(recVol, .5),
		failedP50: quantile(failVol, .5),
		recoveryHigh: rate(high),
		recoveryLow: rate(low),
		nHigh: high.length,
		nLow: low.length,
		climaxMult: CLIMAX_VOL_MULT,
		recoveryClimax: rate(climax),
		nClimax: climax.length,
		weak: true,
		deltaE: NaN,
		skipShare: NaN,
		nSkip: 0,
		nBase: 0,
		volP50Sma: NaN,
		volP50Stop: NaN,
		dumpShare: NaN,
		books: {
			upAny: emptyVolMini(),
			upSkip: emptyVolMini(),
			allAny: emptyVolMini(),
			allSkip: emptyVolMini()
		}
	};
}
function emptyVolMini() {
	return {
		n: 0,
		expectancy: NaN,
		dumpShare: NaN,
		nSkipped: 0
	};
}
function toVolMini(run) {
	return {
		n: run.n,
		expectancy: run.expectancy,
		dumpShare: run.dumpShare,
		nSkipped: run.nSkipped
	};
}
function attachVolumeEffect(base, input) {
	const mk = (trend, skip) => backtestFade({
		candles: input.candles,
		sma: input.sma,
		atr: input.atr,
		smaTrend: input.smaTrend,
		lookforward: input.lookforward,
		intervalMin: input.intervalMin,
		entryAtr: 1.5,
		stopAtr: STOP_ATR,
		feeBps: 4,
		uptrendOnly: trend === "up",
		trendFilter: trend,
		skipVolMult: skip,
		requireVolMult: 0
	});
	const upAny = mk("up", 0);
	const upSkip = mk("up", CLIMAX_VOL_MULT);
	const allAny = mk("all", 0);
	const allSkip = mk("all", CLIMAX_VOL_MULT);
	const deltaE = upSkip.expectancy - upAny.expectancy;
	const denom = upAny.n + upSkip.nSkipped;
	const skipShare = denom > 0 ? upSkip.nSkipped / denom : NaN;
	const weak = upAny.n >= 8 && Number.isFinite(deltaE) && Math.abs(deltaE) < .03 && (Number.isFinite(skipShare) ? skipShare < .08 : true);
	return {
		...base,
		weak,
		deltaE,
		skipShare,
		nSkip: upSkip.nSkipped,
		nBase: upAny.n,
		volP50Sma: upAny.volP50Sma,
		volP50Stop: upAny.volP50Stop,
		dumpShare: upAny.dumpShare,
		books: {
			upAny: toVolMini(upAny),
			upSkip: toVolMini(upSkip),
			allAny: toVolMini(allAny),
			allSkip: toVolMini(allSkip)
		}
	};
}
function runStudy(input) {
	const { candles, symbol, interval, source, days } = input;
	if (candles.length < 80) throw new Error("Không đủ nến để tính SMA15 / ATR");
	const closes = candles.map((c) => c.c);
	const sma = computeSma(closes, 15);
	const sma50 = computeSma(closes, 50);
	const rsiFast = computeRsi(closes, 7);
	const rsiSlow = computeRsi(closes, 21);
	const cti = computeCti(closes, 20);
	const atr = computeAtr(candles, 14);
	const minutes = intervalMinutes(interval);
	const lookforward = Math.max(4, Math.round(240 / minutes));
	const emaTune = runEmaTune({
		candles,
		sma,
		atr,
		lookforward,
		intervalMin: minutes
	});
	const emaPeriod = emaTune.winner;
	const ema20 = computeEma(closes, emaPeriod);
	const bb = computeBb(closes, 20, 2);
	const bbRank = rankInWindow(bb.widthPct, 288);
	const maType = runMaType({
		candles,
		sma,
		atr,
		lookforward,
		intervalMin: minutes,
		emaWinner: emaPeriod,
		emaCells: emaTune.cells
	});
	const events = detectDips(candles, sma, atr, sma50, lookforward, minutes);
	const stats = {
		all: buildGroup(events),
		up: buildGroup(events.filter((e) => e.uptrend)),
		down: buildGroup(events.filter((e) => !e.uptrend))
	};
	const recovered = events.filter((e) => e.recovered && e.undershootAtr >= .25);
	const pcts = recovered.map((e) => e.undershootPct);
	const atrs = recovered.map((e) => e.undershootAtr);
	const corr = pearson(recovered.map((e) => e.smaAtTrough > 0 ? e.atrAtTrough / e.smaAtTrough * 100 : 0), pcts);
	const cvPct = stats.all.pct.cv;
	const cvAtr = stats.all.atr.cv;
	const volSmaLive = computeSma(candles.map((c) => c.v), 20);
	const last = candles[candles.length - 1];
	const lastSma = sma[sma.length - 1] ?? null;
	const lastAtr = atr[atr.length - 1] ?? null;
	const lastSma50 = sma50[sma50.length - 1] ?? null;
	const lastEma20 = ema20[ema20.length - 1] ?? null;
	const lastRsiFast = rsiFast[rsiFast.length - 1] ?? null;
	const lastRsiSlow = rsiSlow[rsiSlow.length - 1] ?? null;
	const lastCti = cti[cti.length - 1] ?? null;
	const lastBb = liveBb({
		widthPct: bb.widthPct,
		rank: bbRank,
		pctB: bb.pctB,
		lower: bb.lower,
		lastLow: last.l
	});
	const lastVolSma = volSmaLive[volSmaLive.length - 1] ?? null;
	const lastVolRatio = volRatio(last.v, lastVolSma);
	const lastVolDump = defaultDump(last, lastVolSma);
	const lastVolClimax = isVolumeDump(last, lastVolSma, CLIMAX_VOL_MULT);
	const below = lastSma != null && last.l < lastSma;
	const undershootPct = lastSma && lastSma > 0 ? Math.max(0, (lastSma - last.l) / lastSma * 100) : 0;
	const undershootAtr = lastSma != null && lastAtr && lastAtr > 0 ? Math.max(0, (lastSma - last.l) / lastAtr) : 0;
	const sortedPct = pcts.slice().sort((a, b) => a - b);
	const inDip = new Array(candles.length).fill(false);
	for (const e of events) for (let k = e.startIdx; k <= e.endIdx; k++) inDip[k] = true;
	const sliceFrom = Math.max(0, candles.length - 360);
	const chart = [];
	for (let i = sliceFrom; i < candles.length; i++) {
		const c = candles[i];
		chart.push({
			...c,
			sma: sma[i] ?? null,
			atr: atr[i] ?? null,
			inDip: inDip[i] ?? false
		});
	}
	const pctCap = Number.isFinite(stats.all.pct.p95) ? stats.all.pct.p95 * 1.15 : void 0;
	const atrCap = Number.isFinite(stats.all.atr.p95) ? stats.all.atr.p95 * 1.15 : void 0;
	const recovery = buildRecovery({
		events,
		candles,
		ema20,
		emaPeriod,
		live: {
			below,
			undershootAtr,
			aboveEma20: lastEma20 != null ? last.c > lastEma20 : false
		},
		intervalMin: minutes
	});
	const backtest = runBacktests({
		candles,
		sma,
		atr,
		smaTrend: sma50,
		ema20,
		recoveryCells: recovery.cells,
		lookforward,
		intervalMin: minutes
	});
	const edge = runEdgeGrid({
		candles,
		sma,
		atr,
		smaTrend: sma50,
		lookforward,
		intervalMin: minutes
	});
	const depth = runDepthSweep({
		candles,
		sma,
		atr,
		ema20,
		emaPeriod,
		recoveryCells: recovery.cells,
		lookforward,
		intervalMin: minutes
	});
	const trendCompare = runTrendCompare({
		candles,
		sma,
		atr,
		sma50,
		ema20,
		emaPeriod,
		lookforward,
		intervalMin: minutes
	});
	const osc = runOscCompare({
		candles,
		sma,
		atr,
		ema20,
		emaPeriod,
		rsiFast,
		rsiSlow,
		cti,
		lookforward,
		intervalMin: minutes
	});
	const bbWidth = runBbWidth({
		candles,
		sma,
		atr,
		ema20,
		emaPeriod,
		events,
		lookforward,
		intervalMin: minutes
	});
	const volume = attachVolumeEffect(buildVolume(events), {
		candles,
		sma,
		atr,
		smaTrend: sma50,
		lookforward,
		intervalMin: minutes
	});
	return {
		symbol,
		interval,
		source,
		days,
		smaPeriod: 15,
		atrPeriod: 14,
		lookforwardHours: 4,
		lookforwardCandles: lookforward,
		from: candles[0].t,
		to: last.t,
		candleCount: candles.length,
		live: {
			lastT: last.t,
			last: last.c,
			sma: lastSma,
			atr: lastAtr,
			atrPct: lastSma && lastAtr && lastSma > 0 ? lastAtr / lastSma * 100 : null,
			below,
			undershootPct,
			undershootAtr,
			pctileAmongRecovered: below ? percentileOf(sortedPct, undershootPct) : null,
			vol: last.v,
			volSma: lastVolSma,
			volRatio: lastVolRatio,
			volDump: lastVolDump,
			volClimax: lastVolClimax,
			sma50: lastSma50,
			ema20: lastEma20,
			aboveSma50: lastSma50 != null ? last.c > lastSma50 : false,
			aboveEma20: lastEma20 != null ? last.c > lastEma20 : false,
			rsiFast: lastRsiFast,
			rsiSlow: lastRsiSlow,
			cti: lastCti,
			oscCombo: lastRsiFast != null && lastRsiSlow != null && lastCti != null && lastRsiFast < lastRsiSlow && lastRsiSlow > 50 && lastCti <= 0,
			emaPeriod,
			...lastBb
		},
		stats,
		atrVerdict: {
			atrMoreStable: Number.isFinite(cvAtr) && Number.isFinite(cvPct) && cvAtr < cvPct,
			cvPct,
			cvAtr,
			corrAtrPctVsDumpPct: corr,
			relativeSpreadPct: relativeSpread(stats.all.pct),
			relativeSpreadAtr: relativeSpread(stats.all.atr),
			grade: gradeAtr(cvPct, cvAtr, corr)
		},
		regimes: buildRegimes(recovered),
		histPct: histogram(pcts, 18, pctCap),
		histAtr: histogram(atrs, 18, atrCap),
		events: events.slice(-120).reverse(),
		chart,
		volume,
		backtest,
		edge,
		depth,
		trendCompare,
		osc,
		recovery,
		emaTune,
		maType,
		bb: bbWidth
	};
}
//#endregion
export { runStudy };
