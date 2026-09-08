import { i as __toESM } from "../_runtime.mjs";
import { a as INTERVALS$1, c as clampDays, i as DAY_OPTIONS, o as MIN_SIGNAL_ATR, s as SYMBOLS } from "./symbols-Btt3FAtD.mjs";
import { R as require_react, v as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as Activity, n as RefreshCw, r as LoaderCircle, t as TriangleAlert } from "../_libs/lucide-react.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DB3jqk4L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
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
var loadStudy = createServerFn({ method: "POST" }).validator((d) => parseRequest(d)).handler(createSsrRpc("07af06d9289fbf741436e7520fb3c5bfc316976ba9e6fec2dc900d4cb21076b1"));
var VN = "vi-VN";
var TZ = "Asia/Ho_Chi_Minh";
function formatPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toFixed(digits)}%`;
}
function formatSignedPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	const body = `${Math.abs(n).toFixed(digits)}%`;
	if (n > 0) return `+${body}`;
	if (n < 0) return `−${body}`;
	return body;
}
function formatAtrMul(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toFixed(digits)}× ATR`;
}
function formatNum(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return n.toLocaleString("en-US", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	});
}
function formatPrice(n) {
	if (!Number.isFinite(n)) return "—";
	if (n >= 1e3) return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	if (n >= 1) return n.toFixed(4);
	return n.toPrecision(4);
}
function formatInt(n) {
	if (!Number.isFinite(n)) return "—";
	return Math.round(n).toLocaleString("en-US");
}
function formatTimeVn(ms) {
	return new Intl.DateTimeFormat(VN, {
		timeZone: TZ,
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).format(new Date(ms));
}
function formatDateVn(ms) {
	return new Intl.DateTimeFormat(VN, {
		timeZone: TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).format(new Date(ms));
}
function minutesLabel(mins) {
	if (!Number.isFinite(mins)) return "—";
	if (mins < 60) return `${Math.round(mins)} phút`;
	const h = mins / 60;
	if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)} giờ`;
	return `${(h / 24).toFixed(1)} ngày`;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 font-medium select-none transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sma/50 disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96]", {
	variants: {
		variant: {
			primary: "bg-accent text-accent-fg hover:bg-fg",
			ghost: "bg-transparent text-fg hover:bg-elevated",
			outline: "bg-transparent text-fg shadow-[var(--shadow-border)] hover:shadow-[var(--shadow-border-hover)]",
			subtle: "bg-elevated text-fg hover:bg-elevated/80"
		},
		size: {
			sm: "h-9 px-3 text-sm rounded-sm",
			md: "h-11 px-4 text-sm rounded-md",
			icon: "size-11 rounded-md"
		}
	},
	defaultVariants: {
		variant: "primary",
		size: "md"
	}
});
function Button({ className, variant, size, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		className: cn(buttonVariants({
			variant,
			size
		}), className),
		...props
	});
}
function SelectField({ label, value, options, onChange, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: cn("flex min-w-0 flex-col gap-1.5", className),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs font-medium tracking-wide text-subtle uppercase",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
			value,
			onChange: (e) => onChange(e.target.value),
			className: "h-11 min-h-11 w-full appearance-none rounded-md bg-elevated px-3 pr-8 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)] focus-visible:ring-2 focus-visible:ring-sma/50",
			style: {
				backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='%238f938a' d='M3 4.5 6 8l3-3.5'/></svg>\")",
				backgroundRepeat: "no-repeat",
				backgroundPosition: "right 12px center"
			},
			children: options.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
				value: opt.value,
				children: opt.label
			}, opt.value))
		})]
	});
}
function CandleChart({ candles, symbol }) {
	const wrapRef = (0, import_react.useRef)(null);
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const wrap = wrapRef.current;
		const canvas = canvasRef.current;
		if (!wrap || !canvas) return;
		const draw = () => {
			const cssW = wrap.clientWidth;
			const cssH = wrap.clientHeight;
			if (cssW < 40 || cssH < 40) return;
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.floor(cssW * dpr);
			canvas.height = Math.floor(cssH * dpr);
			canvas.style.width = `${cssW}px`;
			canvas.style.height = `${cssH}px`;
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const styles = getComputedStyle(document.documentElement);
			const fg = styles.getPropertyValue("--color-fg").trim() || "#ecece6";
			const muted = styles.getPropertyValue("--color-muted").trim() || "#8f938a";
			const subtle = styles.getPropertyValue("--color-subtle").trim() || "#6a6e67";
			const smaC = styles.getPropertyValue("--color-sma").trim() || "#8ea0b5";
			const up = styles.getPropertyValue("--color-up").trim() || "#6f9a7c";
			const down = styles.getPropertyValue("--color-down").trim() || "#c56b5c";
			const dip = styles.getPropertyValue("--color-dip").trim() || "#c56b5c";
			ctx.fillStyle = styles.getPropertyValue("--color-surface").trim() || "#121418";
			ctx.fillRect(0, 0, cssW, cssH);
			const padL = 8;
			const padR = 62;
			const padT = 16;
			const padB = 28;
			const plotW = cssW - padL - padR;
			const plotH = cssH - padT - padB;
			if (candles.length < 2 || plotW < 10) {
				ctx.fillStyle = muted;
				ctx.font = "13px IBM Plex Sans, sans-serif";
				ctx.fillText("Chưa có nến để vẽ", 16, cssH / 2);
				return;
			}
			plotW / candles.length;
			const vis = candles.length > plotW / 3 ? candles.slice(-Math.max(60, Math.floor(plotW / 3.2))) : candles;
			const w = plotW / vis.length;
			let lo = Infinity;
			let hi = -Infinity;
			for (const c of vis) {
				lo = Math.min(lo, c.l);
				hi = Math.max(hi, c.h);
				if (c.sma != null) {
					lo = Math.min(lo, c.sma);
					hi = Math.max(hi, c.sma);
				}
			}
			const pad = (hi - lo || 1) * .06;
			lo -= pad;
			hi += pad;
			const y = (price) => padT + (hi - price) / (hi - lo) * plotH;
			ctx.fillStyle = hexAlpha(dip, .12);
			let bandStart = null;
			vis.forEach((c, i) => {
				if (c.inDip && bandStart == null) bandStart = i;
				const end = !c.inDip || i === vis.length - 1;
				if (bandStart != null && end) {
					const last = c.inDip && i === vis.length - 1 ? i : i - 1;
					const x0 = padL + bandStart * w;
					const x1 = padL + (last + 1) * w;
					ctx.fillRect(x0, padT, x1 - x0, plotH);
					bandStart = null;
				}
			});
			ctx.strokeStyle = hexAlpha(subtle, .35);
			ctx.lineWidth = 1;
			ctx.setLineDash([3, 5]);
			const ticks = 4;
			ctx.font = "11px IBM Plex Mono, ui-monospace, monospace";
			ctx.fillStyle = muted;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			for (let i = 0; i <= ticks; i++) {
				const price = hi - (hi - lo) * i / ticks;
				const yy = padT + plotH * i / ticks;
				ctx.beginPath();
				ctx.moveTo(padL, yy);
				ctx.lineTo(padL + plotW, yy);
				ctx.stroke();
				ctx.fillText(formatPrice(price), padL + plotW + 8, yy);
			}
			ctx.setLineDash([]);
			vis.forEach((c, i) => {
				const x = padL + i * w + w / 2;
				const upBar = c.c >= c.o;
				ctx.strokeStyle = upBar ? up : down;
				ctx.fillStyle = upBar ? up : down;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x, y(c.h));
				ctx.lineTo(x, y(c.l));
				ctx.stroke();
				const bodyH = Math.max(1, Math.abs(y(c.c) - y(c.o)));
				const bodyY = Math.min(y(c.c), y(c.o));
				const bw = Math.max(1.2, w * .62);
				ctx.fillRect(x - bw / 2, bodyY, bw, bodyH);
			});
			ctx.beginPath();
			let started = false;
			vis.forEach((c, i) => {
				if (c.sma == null) return;
				const x = padL + i * w + w / 2;
				if (!started) {
					ctx.moveTo(x, y(c.sma));
					started = true;
				} else ctx.lineTo(x, y(c.sma));
			});
			ctx.strokeStyle = smaC;
			ctx.lineWidth = 1.6;
			ctx.stroke();
			ctx.fillStyle = muted;
			ctx.font = "11px IBM Plex Sans, sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "alphabetic";
			const first = vis[0];
			const last = vis[vis.length - 1];
			ctx.fillText(formatTimeVn(first.t), padL, cssH - 8);
			ctx.textAlign = "right";
			ctx.fillText(formatTimeVn(last.t), padL + plotW, cssH - 8);
			ctx.fillStyle = fg;
			ctx.textAlign = "left";
			ctx.font = "500 12px IBM Plex Sans, sans-serif";
			ctx.fillText(`${symbol} · SMA15`, padL, 14);
		};
		draw();
		const ro = new ResizeObserver(draw);
		ro.observe(wrap);
		return () => ro.disconnect();
	}, [candles, symbol]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: wrapRef,
		className: "h-64 w-full sm:h-80",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			className: "block h-full w-full"
		})
	});
}
function hexAlpha(hex, a) {
	const h = hex.replace("#", "").trim();
	if (h.length !== 6) return `rgba(197,107,92,${a})`;
	return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
function Histogram({ title, unit, bins, quantiles, formatTick }) {
	const max = Math.max(1, ...bins.map((b) => b.n));
	const span = bins.length ? bins[bins.length - 1].x1 - bins[0].x0 : 1;
	const marker = (value) => {
		if (!bins.length || !Number.isFinite(value) || span <= 0) return null;
		const pct = (value - bins[0].x0) / span * 100;
		if (pct < 0 || pct > 100) return null;
		return pct;
	};
	const p50 = marker(quantiles.p50);
	const p75 = marker(quantiles.p75);
	const p90 = marker(quantiles.p90);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex min-w-0 flex-col gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-medium text-fg",
					children: title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-xs text-muted",
					children: unit
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-xs text-subtle tabular-nums",
					children: "nhịp đã hồi"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative h-36",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute inset-x-0 bottom-0 flex h-32 items-end gap-px",
						children: bins.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "min-w-0 flex-1 rounded-t-xs bg-sma/80",
							style: { height: `${b.n / max * 100}%` },
							title: `${formatTick(b.x0)}–${formatTick(b.x1)} · ${b.n}`
						}, `${b.x0}-${i}`))
					}),
					p50 != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marker, {
						left: p50,
						label: "P50",
						className: "bg-fg"
					}),
					p75 != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marker, {
						left: p75,
						label: "P75",
						className: "bg-sma"
					}),
					p90 != null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Marker, {
						left: p90,
						label: "P90",
						className: "bg-dip"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "grid grid-cols-3 gap-2 text-xs",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "P25",
						v: formatTick(quantiles.p25)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "P50",
						v: formatTick(quantiles.p50)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "P75",
						v: formatTick(quantiles.p75)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "P90",
						v: formatTick(quantiles.p90)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "Mean",
						v: formatTick(quantiles.mean)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat$1, {
						k: "CV",
						v: Number.isFinite(quantiles.cv) ? quantiles.cv.toFixed(2) : "—"
					})
				]
			})
		]
	});
}
function Marker({ left, label, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute top-0 bottom-0",
		style: { left: `${left}%` },
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("h-full w-px opacity-80", className) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "absolute top-0 left-1 text-xs tracking-wide text-subtle uppercase",
			children: label
		})]
	});
}
function Stat$1({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-sm bg-elevated px-2 py-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-subtle",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "font-mono text-fg tabular-nums",
			children: v
		})]
	});
}
function BacktestPanel({ report }) {
	const [label, setLabel] = (0, import_react.useState)(report.bestLabel);
	(0, import_react.useEffect)(() => {
		setLabel(report.bestLabel);
	}, [report.bestLabel]);
	const run = report.runs.find((r) => r.label === label) ?? report.runs[0];
	if (!run) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-sma uppercase",
						children: "Backtest in-sample"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-1 text-xl font-medium tracking-tight",
						children: "Hiệu suất fade SMA15"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 max-w-2xl text-sm text-muted",
						children: [
							"Limit mua khi low chạm SMA − k×ATR, cắt lỗ ",
							report.stopAtr.toFixed(1),
							"× ATR. Bỏ lệnh nếu P50 nến hồi ≤ 2. TP đóng close sau P50 − 2 nến (vẫn cắt sớm nếu close về SMA15). Phí ",
							report.feeBps,
							" bps mỗi chiều."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-fg",
						children: verdictText(run)
					})
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: report.runs.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setLabel(r.label),
					className: cn("h-11 rounded-md px-3 text-sm transition-[background-color,color] duration-150", r.label === label ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg"),
					children: [r.label, r.label === report.bestLabel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-xs opacity-70",
						children: " best"
					})]
				}, r.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunHero, { run }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EquityChart, { run }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RunTable, {
				runs: report.runs,
				active: label,
				onPick: setLabel,
				best: report.bestLabel
			}),
			run.trades.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TradeTable, { trades: run.trades })
		]
	});
}
function RunHero({ run }) {
	const beat = Number.isFinite(run.compoundPct) && Number.isFinite(run.buyHoldPct) ? run.compoundPct - run.buyHoldPct : NaN;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				k: "Expectancy / lệnh",
				v: formatSignedPct(run.expectancy),
				hint: `${formatInt(run.n)} lệnh · bỏ ${formatInt(run.nSkipped)} (P50≤2: ${formatInt(run.nSkipForecast)})`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				k: "Win rate",
				v: formatPct(run.winRate * 100, 1),
				hint: `TP ${formatPct((run.tpShare || 0) * 100, 0)} · SMA ${formatPct((run.smaShare || 0) * 100, 0)}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				k: "Lợi nhuận kép",
				v: formatSignedPct(run.compoundPct),
				hint: `Buy-hold ${formatSignedPct(run.buyHoldPct)}`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
				k: "Max drawdown",
				v: formatPct(run.maxDd, 1),
				hint: `PF ${formatNum(run.profitFactor, 2)} · vs hold ${formatSignedPct(beat, 1)}`
			})
		]
	});
}
function Stat({ k, v, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: hint
			})
		]
	});
}
function EquityChart({ run }) {
	const pts = run.equity;
	if (pts.length < 2) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "Chưa đủ lệnh để vẽ equity."
	});
	const w = 640;
	const h = 160;
	const padL = 8;
	const padT = 12;
	const ys = pts.map((p) => p.eq);
	let lo = Math.min(...ys, 1);
	let hi = Math.max(...ys, 1);
	if (hi === lo) {
		hi += .01;
		lo -= .01;
	}
	const span = hi - lo;
	lo -= span * .06;
	hi += span * .06;
	const x = (i) => padL + i / (pts.length - 1) * 624;
	const y = (eq) => padT + (hi - eq) / (hi - lo) * 140;
	const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.eq).toFixed(1)}`).join(" ");
	const y0 = y(1);
	const last = pts[pts.length - 1].eq;
	const up = last >= 1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center justify-between text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equity (bắt đầu = 1.00)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("font-mono tabular-nums", up ? "text-recovery" : "text-dip"),
				children: formatNum(last, 3)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${w} ${h}`,
			className: "h-36 w-full",
			role: "img",
			"aria-label": "Đường equity backtest",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: padL,
				y1: y0,
				x2: 632,
				y2: y0,
				stroke: "currentColor",
				className: "text-border",
				strokeDasharray: "4 4"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d,
				fill: "none",
				stroke: "currentColor",
				className: up ? "text-sma" : "text-dip",
				strokeWidth: "1.8"
			})]
		})]
	});
}
function RunTable({ runs, active, onPick, best }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-2xl text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "text-xs tracking-wide text-subtle uppercase",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Chiến lược"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "n"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Bỏ P50"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Win"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "E[R]"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Kép"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "DD"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "TP"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Hold"
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: runs.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: cn("border-t border-border", r.label === active && "bg-elevated"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "text-left",
							onClick: () => onPick(r.label),
							children: [r.label, r.label === best ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-xs text-sma",
								children: " best"
							}) : null]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: formatInt(r.n)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: r.forecastOn ? formatInt(r.nSkipForecast) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: formatPct(r.winRate * 100, 0)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: cn("px-3 py-2 font-mono tabular-nums", tone$7(r.expectancy)),
						children: formatSignedPct(r.expectancy)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: cn("px-3 py-2 font-mono tabular-nums", tone$7(r.compoundPct)),
						children: formatSignedPct(r.compoundPct)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: formatPct(r.maxDd, 1)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: r.forecastOn ? formatPct((r.tpShare || 0) * 100, 0) : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: minutesLabel(r.avgMin)
					})
				]
			}, r.label)) })]
		})
	});
}
function TradeTable({ trades }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
		className: "mb-2 text-sm font-medium",
		children: "Lệnh gần đây"
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
			className: "w-full min-w-xl text-left text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
				className: "text-xs tracking-wide text-subtle uppercase",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Vào"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "PnL"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Thoát"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Hold"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Vol"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Trend"
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: trades.slice(0, 16).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
				className: "border-t border-border",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono text-xs tabular-nums",
						children: formatTimeVn(t.entryT)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: cn("px-3 py-2 font-mono tabular-nums", tone$7(t.pnlPct)),
						children: formatSignedPct(t.pnlPct)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 text-muted",
						children: reasonLabel(t.reason)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: [t.bars, " nến"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 font-mono tabular-nums",
						children: Number.isFinite(t.volRatio) ? `${formatNum(t.volRatio, 1)}×` : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "px-3 py-2 text-muted",
						children: t.uptrend ? "Up" : "Down"
					})
				]
			}, `${t.entryT}-${t.exitT}`)) })]
		})
	})] });
}
function reasonLabel(reason) {
	if (reason === "sma") return "Hồi SMA";
	if (reason === "stop") return "Stop";
	if (reason === "tp") return "TP P50−2";
	return "Hết giờ";
}
function tone$7(n) {
	if (!Number.isFinite(n) || n === 0) return "";
	return n > 0 ? "text-recovery" : "text-dip";
}
function verdictText(run) {
	if (!Number.isFinite(run.expectancy) || run.n < 8) return "Chưa đủ lệnh để đánh giá.";
	if (run.expectancy > 0 && run.compoundPct > run.buyHoldPct) return "Expectancy dương và vượt buy-hold trên mẫu này.";
	if (run.expectancy > 0) return "Expectancy dương nhưng kém buy-hold.";
	return "Sau phí và stop, expectancy âm: bounce về SMA không bù được nhịp thua 1.5× ATR.";
}
var TREND_ROWS = [
	{
		key: "up",
		label: "Uptrend SMA50"
	},
	{
		key: "all",
		label: "Mọi trend"
	},
	{
		key: "down",
		label: "Downtrend"
	}
];
function cellOf(report, atr, trend) {
	return report.cells.find((c) => c.entryAtr === atr && c.trend === trend);
}
function titleOf$7(report) {
	if (report.verdict === "edge") return "ATR + uptrend có expectancy dương trên mẫu này";
	if (report.verdict === "filter") return "ATR + uptrend chỉ giảm lỗ, chưa phải edge";
	return "ATR + trend không tách được PnL trên mẫu này";
}
function tone$6(cell) {
	if (!cell || !Number.isFinite(cell.expectancy) || cell.n < 8) return "bg-elevated text-muted";
	if (cell.expectancy > 0) return "bg-up/20 text-fg";
	if (cell.expectancy > -.05) return "bg-elevated text-fg";
	return "bg-down/15 text-fg";
}
function EdgePanel({ report }) {
	const best = report.best;
	const bestLabel = `${best.entryAtr.toFixed(1)}× ${best.trend}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "Edge ATR + trend"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$7(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Lưới 3 độ sâu × 3 regime, không lọc volume, phí 4 bps/chiều, stop 1.5× ATR. Best in-sample: ",
						bestLabel,
						" · E",
						" ",
						formatSignedPct(best.expectancy),
						" · ",
						formatInt(best.n),
						" lệnh. Walk-forward nửa đầu ",
						formatSignedPct(best.firstE),
						" (",
						formatInt(best.nFirst),
						") / nửa sau",
						" ",
						formatSignedPct(best.secondE),
						" (",
						formatInt(best.nSecond),
						").",
						" ",
						Math.abs(report.trendLift) >= Math.abs(report.atrLift) ? "Hầu hết lift đến từ lọc SMA50, không từ độ sâu ATR." : "Hầu hết lift đến từ vào sâu hơn theo ATR."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$6, {
						k: "Δ ATR 1.0→1.5 all",
						v: formatSignedPct(report.atrLift, 3),
						d: "sâu hơn, cùng mọi trend"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$6, {
						k: "Δ up vs all tại 1.5×",
						v: formatSignedPct(report.trendLift, 3),
						d: "lọc close trên SMA50"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$6, {
						k: "Δ down vs all tại 1.5×",
						v: formatSignedPct(report.downLift, 3),
						d: "fade khi SMA50 đang xuống"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$6, {
						k: "Δ 1.5 up vs 1.0 all",
						v: formatSignedPct(report.combinedLift, 3),
						d: "cả ATR và trend cộng lại"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid min-w-[28rem] grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {}),
						report.depths.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "px-1 text-xs font-medium tracking-wide text-subtle uppercase",
							children: [d.toFixed(2).replace(/0$/, ""), "× ATR"]
						}, d)),
						TREND_ROWS.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row$1, {
							report,
							trend: row.key,
							label: row.label
						}, row.key))
					]
				})
			})
		]
	});
}
function Row$1({ report, trend, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "flex items-center text-sm text-muted",
		children: label
	}), report.depths.map((d) => {
		const cell = cellOf(report, d, trend);
		const isBest = cell && cell.entryAtr === report.best.entryAtr && cell.trend === report.best.trend;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("rounded-md px-3 py-3", tone$6(cell), isBest && "shadow-[var(--shadow-border-hover)]"),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-lg tabular-nums",
					children: cell ? formatSignedPct(cell.expectancy) : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted",
					children: cell ? `${formatInt(cell.n)} lệnh · WR ${formatPct((cell.winRate || 0) * 100, 0)}` : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-0.5 text-xs text-subtle",
					children: [cell && Number.isFinite(cell.stopShare) ? `stop ${formatPct(cell.stopShare * 100, 0)}` : "", isBest ? " · best" : ""]
				})
			]
		}, `${trend}-${d}`);
	})] });
}
function Mini$6({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg tabular-nums text-fg",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: d
			})
		]
	});
}
function fmtDepth(n) {
	return `${n.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}×`;
}
function titleOf$6(report) {
	const peak = fmtDepth(report.peakUp.entryAtr);
	if (report.verdict === "sweet-spot") return `Expectancy đỉnh tại ${peak} ATR; sâu hơn mất occupancy`;
	if (report.verdict === "deeper-helps") return "Vào sâu hơn theo ATR cải thiện E trên mẫu này";
	if (report.verdict === "shallow-better") return "Wick nông có E cao hơn — sâu hơn không bù occupancy";
	return "Độ sâu ATR không đổi expectancy trên mẫu này";
}
function tone$5(p, peak) {
	if (p.n < 12 || !Number.isFinite(p.expectancy)) return "text-muted";
	if (p.entryAtr === peak.entryAtr) return "text-fg";
	if (p.expectancy > 0) return "text-recovery";
	return "text-dip";
}
function DepthPanel({ report }) {
	const peak = report.peakUp;
	const ema = `EMA${report.emaPeriod}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "Độ sâu ATR"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$6(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Quét 8 ngưỡng vào lệnh trên fade ",
						ema,
						" up, SMA-exit vs TP P50−2. Mọi trend giữ nguyên để đối chiếu. Đỉnh E: ",
						fmtDepth(peak.entryAtr),
						" · ",
						formatSignedPct(peak.expectancy),
						" · ",
						formatInt(peak.n),
						" lệnh. Nửa đầu ",
						formatSignedPct(peak.firstE),
						" / nửa sau ",
						formatSignedPct(peak.secondE),
						".",
						Number.isFinite(report.skipFloor) ? ` Skip P50≤2 chỉ còn cắt dưới ${fmtDepth(report.skipFloor)}.` : ""
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$5, {
						k: "Đỉnh E (EMA up)",
						v: `${fmtDepth(peak.entryAtr)} ${formatSignedPct(peak.expectancy)}`,
						d: `${formatInt(peak.n)} lệnh · WR ${formatPct((peak.winRate || 0) * 100, 0)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$5, {
						k: "ΔE 0.5× → đỉnh",
						v: formatSignedPct(report.deltaE, 3),
						d: `slope ${formatSignedPct(report.slopeUp, 3)} mỗi 1× ATR`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$5, {
						k: "Occupancy",
						v: Number.isFinite(report.occupancyDrop) ? `${formatNum(report.occupancyDrop, 1)}×` : "—",
						d: "số lệnh 0.5× so với đỉnh — nhiều lệnh, E thấp hơn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$5, {
						k: "Slope mọi trend",
						v: formatSignedPct(report.slopeAll, 3),
						d: "sâu hơn không sửa fade khi mất trend"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepthChart, { report }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-3xl text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs tracking-wide text-subtle uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "ATR"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "n up"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "E SMA"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "E TP"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Bỏ P50"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Stop"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Nửa 1 / 2"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "E all"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Kép up"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.up.map((p, i) => {
						const fc = report.forecast[i];
						const all = report.all[i];
						const isPeak = p.entryAtr === peak.entryAtr;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: cn("border-t border-border", isPeak && "bg-elevated"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: [fmtDepth(p.entryAtr), isPeak ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 text-xs text-sma",
										children: " đỉnh"
									}) : null]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatInt(p.n)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: cn("px-3 py-2 font-mono tabular-nums", tone$5(p, peak)),
									children: formatSignedPct(p.expectancy)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatSignedPct(fc.expectancy)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: fc.nSkipForecast > 0 ? formatInt(fc.nSkipForecast) : "0"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatPct((p.stopShare || 0) * 100, 0)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "px-3 py-2 font-mono tabular-nums text-muted",
									children: [
										formatSignedPct(p.firstE, 2),
										" / ",
										formatSignedPct(p.secondE, 2)
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: cn("px-3 py-2 font-mono tabular-nums", all.expectancy > 0 ? "text-recovery" : "text-dip"),
									children: formatSignedPct(all.expectancy)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatSignedPct(p.compoundPct)
								})
							]
						}, p.entryAtr);
					}) })]
				})
			})
		]
	});
}
function DepthChart({ report }) {
	const pts = report.up.filter((p) => Number.isFinite(p.expectancy));
	const all = report.all.filter((p) => Number.isFinite(p.expectancy));
	if (pts.length < 2) return null;
	const w = 640;
	const h = 140;
	const padL = 8;
	const padT = 12;
	const ys = [...pts, ...all].map((p) => p.expectancy);
	let lo = Math.min(...ys, 0);
	let hi = Math.max(...ys, 0);
	if (hi === lo) {
		hi += .05;
		lo -= .05;
	}
	const span = hi - lo;
	lo -= span * .08;
	hi += span * .08;
	const xOf = (i, n) => padL + (n <= 1 ? 0 : i / (n - 1)) * 624;
	const yOf = (e) => padT + (hi - e) / (hi - lo) * 110;
	const path = (xs) => xs.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i, xs.length).toFixed(1)} ${yOf(p.expectancy).toFixed(1)}`).join(" ");
	const y0 = yOf(0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center justify-between text-xs text-muted",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Expectancy theo độ sâu ATR" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sma",
					children: "EMA up"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "mx-2",
					children: "·"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-dip",
					children: "mọi trend"
				})
			] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			viewBox: `0 0 ${w} ${h}`,
			className: "h-32 w-full",
			role: "img",
			"aria-label": "Expectancy theo độ sâu ATR",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
					x1: padL,
					y1: y0,
					x2: 632,
					y2: y0,
					stroke: "currentColor",
					className: "text-border",
					strokeDasharray: "4 4"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: path(all),
					fill: "none",
					stroke: "currentColor",
					className: "text-dip",
					strokeWidth: "1.6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
					d: path(pts),
					fill: "none",
					stroke: "currentColor",
					className: "text-sma",
					strokeWidth: "1.8"
				}),
				pts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
					cx: xOf(i, pts.length),
					cy: yOf(p.expectancy),
					r: p.entryAtr === report.peakUp.entryAtr ? 3.2 : 2,
					className: p.entryAtr === report.peakUp.entryAtr ? "fill-sma" : "fill-fg"
				}, p.entryAtr))
			]
		})]
	});
}
function Mini$5({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function titleOf$5(report) {
	if (report.verdict === "squeeze") return "Squeeze BB thêm edge; dải rộng kém hơn trên mẫu này";
	if (report.verdict === "expand") return "Fade khi BB đang rộng tốt hơn squeeze trên mẫu này";
	if (report.verdict === "below") return "Low xuyên dải dưới BB thêm E so với fade 1.25×";
	if (report.verdict === "proxy") return "BB width gần như ATR% — không phải tín hiệu mới";
	return "BB width không tách expectancy trên fade EMA up";
}
function tone$4(e, n) {
	if (!Number.isFinite(e) || n < 8) return "text-muted";
	if (e > 0) return "text-recovery";
	if (e > -.05) return "text-fg";
	return "text-dip";
}
function BbPanel({ report, live }) {
	const squeeze = report.books.find((b) => b.key === "squeeze");
	const expand = report.books.find((b) => b.key === "expand");
	const winner = report.books.find((b) => b.key === report.winner);
	const liveLabel = live.bbSqueeze ? "squeeze" : live.bbExpand ? "rộng" : "giữa dải";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "Bollinger width"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$5(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"BB",
						report.period,
						" ± ",
						formatNum(report.k, 0),
						"σ. Squeeze = percentile độ rộng ≤ ",
						formatPct(report.squeezeP * 100, 0),
						" trên ",
						formatInt(report.rankBars),
						" nến vừa rồi (nhân quả). Nền fade SMA15 ",
						formatNum(report.entryAtr, 2),
						"× ATR, close trên EMA",
						report.emaPeriod,
						". Pearson width vs ATR% = ",
						formatNum(report.corrWidthAtrPct, 2),
						"; width vs nến hồi = ",
						formatNum(report.corrWidthRecovery, 2),
						". ΔE squeeze − rộng = ",
						formatSignedPct(report.deltaSE, 3),
						". Nến cuối width ",
						live.bbWidthPct != null ? formatPct(live.bbWidthPct) : "—",
						" · P",
						live.bbPctile != null ? formatNum(live.bbPctile, 0) : "—",
						" ",
						liveLabel,
						live.bbBelowLower ? " · low dưới dải dưới." : "."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$4, {
						k: "Δ squeeze − all",
						v: formatSignedPct(report.squeezeLift, 3),
						d: "vol co so với nền EMA up"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$4, {
						k: "Δ rộng − all",
						v: formatSignedPct(report.expandLift, 3),
						d: "vol nở so với nền"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$4, {
						k: "Width vs ATR%",
						v: formatNum(report.corrWidthAtrPct, 2),
						d: "gần 1 = BB chỉ là ATR đổi vỏ"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$4, {
						k: "Width vs nến hồi",
						v: formatNum(report.corrWidthRecovery, 2),
						d: "dải rộng có hồi chậm hơn không"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-5",
				children: report.books.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookCard$2, {
					book: b,
					best: b.key === report.winner
				}, b.key))
			}),
			winner && winner.key !== "all" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Walk-forward ",
					winner.label,
					": nửa đầu ",
					formatSignedPct(winner.firstE),
					" (",
					formatInt(winner.nFirst),
					") / nửa sau ",
					formatSignedPct(winner.secondE),
					" (",
					formatInt(winner.nSecond),
					").",
					squeeze && expand ? ` Squeeze ${formatInt(squeeze.n)} lệnh vs rộng ${formatInt(expand.n)} — occupancy không đều.` : ""
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Lọc BB không thắng nền EMA up trên mẫu này. Occupancy squeeze ",
					squeeze ? formatInt(squeeze.n) : "—",
					" / rộng ",
					expand ? formatInt(expand.n) : "—",
					"."
				]
			})
		]
	});
}
function BookCard$2({ book, best }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-md bg-elevated px-3 py-3", best && "shadow-[var(--shadow-border-hover)]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-subtle",
				children: [book.label, best ? " · thắng" : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-1 font-mono text-lg tabular-nums", tone$4(book.expectancy, book.n)),
				children: formatSignedPct(book.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					formatInt(book.n),
					" lệnh · WR ",
					formatPct((book.winRate || 0) * 100, 0)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-0.5 text-xs text-subtle",
				children: ["stop ", formatPct((book.stopShare || 0) * 100, 0)]
			})
		]
	});
}
function Mini$4({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg tabular-nums text-fg",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function titleOf$4(report) {
	const e = `EMA${report.emaPeriod}`;
	if (report.winner === "ema20") return `${e} lọc tốt hơn SMA50 trên mẫu này`;
	if (report.winner === "sma50") return `SMA50 lọc tốt hơn ${e} trên mẫu này`;
	if (report.winner === "and") return `Cần cả SMA50 và ${e}`;
	return `SMA50 và ${e} gần như trùng trên mẫu này`;
}
function tone$3(e, n) {
	if (!Number.isFinite(e) || n < 8) return "text-muted";
	if (e > 0) return "text-recovery";
	if (e > -.05) return "text-fg";
	return "text-dip";
}
function TrendComparePanel({ report }) {
	const sma = report.books.find((b) => b.key === "sma50");
	const ema = report.books.find((b) => b.key === "ema20");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: ["SMA50 vs EMA", report.emaPeriod]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$4(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Cùng fade ",
						report.entryAtr.toFixed(2).replace(/0$/, ""),
						"× ATR, stop 1.5×, phí 4 bps/chiều. ΔE EMA",
						report.emaPeriod,
						" − SMA50 =",
						" ",
						formatSignedPct(report.deltaE, 3),
						". Hai đường cùng hướng ",
						formatPct(report.agreeRate * 100, 0),
						" lệnh mọi-trend. SMA50 chậm hơn, EMA",
						report.emaPeriod,
						" phản ứng sớm hơn — bucket chỉ-EMA là nến SMA50 chưa xác nhận."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: report.books.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookCard$1, {
					book: b,
					best: b.key === report.winner
				}, b.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-subtle uppercase",
				children: "Lệnh mọi-trend, tách theo đồng thuận"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: report.buckets.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BucketCard, { bucket: b }, b.key))
			})] }),
			sma && ema ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Walk-forward: SMA50 nửa đầu ",
					formatSignedPct(sma.firstE),
					" / nửa sau ",
					formatSignedPct(sma.secondE),
					". EMA",
					report.emaPeriod,
					" ",
					formatSignedPct(ema.firstE),
					" / ",
					formatSignedPct(ema.secondE),
					"."
				]
			}) : null
		]
	});
}
function BookCard$1({ book, best }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-md bg-elevated px-3 py-3", best && "shadow-[var(--shadow-border-hover)]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-subtle",
				children: [book.label, best && book.key !== "all" ? " · thắng" : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-1 font-mono text-lg tabular-nums", tone$3(book.expectancy, book.n)),
				children: formatSignedPct(book.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					formatInt(book.n),
					" lệnh · WR ",
					formatPct((book.winRate || 0) * 100, 0)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-0.5 text-xs text-subtle",
				children: ["stop ", formatPct((book.stopShare || 0) * 100, 0)]
			})
		]
	});
}
function BucketCard({ bucket }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: bucket.label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-1 font-mono text-lg tabular-nums", tone$3(bucket.expectancy, bucket.n)),
				children: formatSignedPct(bucket.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					formatInt(bucket.n),
					" lệnh · WR ",
					formatPct((bucket.winRate || 0) * 100, 0)
				]
			})
		]
	});
}
function titleOf$3(report) {
	const e = `EMA${report.emaPeriod}`;
	if (report.winner === "cti") return "CTI không dương thêm edge; RSI không cộng được";
	if (report.winner === "slowCti") return "RSI slow + CTI tốt hơn CTI đơn trên mẫu này";
	if (report.winner === "fastCti") return "RSI fast + CTI tốt hơn các cặp khác trên mẫu này";
	if (report.winner === "combo") return `AND cả ba oscillator cải thiện cuốn ${e}`;
	if (report.winner === "fastSlow") return "RSI fast + slow tốt hơn CTI trên mẫu này";
	if (report.winner === "fast") return "RSI fast dưới slow tốt hơn combo trên mẫu này";
	if (report.winner === "slow") return "RSI slow còn trên 50 tốt hơn combo trên mẫu này";
	if (report.winner === "base") return `Oscillator không thêm edge trên cuốn ${e}`;
	return `Oscillator gần như không đổi cuốn ${e}`;
}
function tone$2(e, n) {
	if (!Number.isFinite(e) || n < 8) return "text-muted";
	if (e > 0) return "text-recovery";
	if (e > -.05) return "text-fg";
	return "text-dip";
}
function OscPanel({ report, live }) {
	const combo = report.pairs.find((b) => b.key === "combo");
	const cti = report.books.find((b) => b.key === "cti");
	const winner = [...report.books, ...report.pairs].find((b) => b.key === report.winner) ?? cti;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "RSI + CTI"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$3(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Nền: fade SMA15 ",
						report.entryAtr.toFixed(2).replace(/0$/, ""),
						"× ATR, close trên EMA",
						report.emaPeriod,
						". Cửa đơn: RSI",
						report.rsiFast,
						" dưới RSI",
						report.rsiSlow,
						", RSI",
						report.rsiSlow,
						" trên ",
						report.rsiSlowMin,
						", CTI",
						report.ctiPeriod,
						" không dương. Cặp = AND từng đôi; cả ba = AND đủ 3 cửa. RSI 7 dưới 30 gần như không xảy ra khi giá còn trên EMA",
						report.emaPeriod,
						". ΔE cả-ba − EMA",
						report.emaPeriod,
						" = ",
						formatSignedPct(report.deltaE, 3),
						". Nến cuối RSI",
						report.rsiFast,
						" ",
						live.rsiFast != null ? formatNum(live.rsiFast, 1) : "—",
						" · RSI",
						report.rsiSlow,
						" ",
						live.rsiSlow != null ? formatNum(live.rsiSlow, 1) : "—",
						" · CTI ",
						live.cti != null ? formatNum(live.cti, 2) : "—",
						live.oscCombo ? " — đủ combo." : "."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: report.books.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookCard, {
					book: b,
					best: b.key === report.winner
				}, b.key))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-subtle uppercase",
				children: "Kết hợp AND"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: report.pairs.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookCard, {
					book: b,
					best: b.key === report.winner
				}, b.key))
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Đối chứng CTI dương: ",
					formatSignedPct(report.anti.expectancy),
					" · ",
					formatInt(report.anti.n),
					" lệnh · WR",
					" ",
					formatPct((report.anti.winRate || 0) * 100, 0),
					" · stop ",
					formatPct((report.anti.stopShare || 0) * 100, 0),
					Number.isFinite(report.anti.expectancy) && report.anti.expectancy <= 0 ? " — fade khi CTI còn dương mất edge." : "."
				]
			}),
			winner ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Walk-forward ",
					winner.label,
					": nửa đầu ",
					formatSignedPct(winner.firstE),
					" (",
					formatInt(winner.nFirst),
					") / nửa sau ",
					formatSignedPct(winner.secondE),
					" (",
					formatInt(winner.nSecond),
					").",
					combo && winner.key !== "combo" ? ` Cả ba: ${formatSignedPct(combo.firstE)} (${formatInt(combo.nFirst)}) / ${formatSignedPct(combo.secondE)} (${formatInt(combo.nSecond)}).` : ""
				]
			}) : null
		]
	});
}
function BookCard({ book, best }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-md bg-elevated px-3 py-3", best && "shadow-[var(--shadow-border-hover)]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-subtle",
				children: [book.label, best ? " · thắng" : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: cn("mt-1 font-mono text-lg tabular-nums", tone$2(book.expectancy, book.n)),
				children: formatSignedPct(book.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-xs text-muted",
				children: [
					formatInt(book.n),
					" lệnh · WR ",
					formatPct((book.winRate || 0) * 100, 0)
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-0.5 text-xs text-subtle",
				children: ["stop ", formatPct((book.stopShare || 0) * 100, 0)]
			})
		]
	});
}
function depthLabel(cell) {
	if (cell.depthHi == null) return `${cell.depthLo}× trở lên`;
	return `${cell.depthLo}–${cell.depthHi}×`;
}
function titleOf$2(report) {
	if (Number.isFinite(report.corr) && report.corr >= .6) return "Độ sâu ATR quyết định số nến hồi; trend chỉ tăng tốc wick nông";
	if (Number.isFinite(report.trendLift) && report.trendLift <= -1) return `Uptrend EMA${report.emaPeriod} hồi nhanh hơn downtrend trên mẫu này`;
	return "Số nến hồi chưa tách rõ theo ATR hay trend trên mẫu này";
}
function tone$1(cell) {
	if (!Number.isFinite(cell.p50) || cell.nRec < 8) return "bg-elevated text-muted";
	if (cell.p50 <= 3) return "bg-up/20 text-fg";
	if (cell.p50 <= 8) return "bg-elevated text-fg";
	return "bg-down/15 text-fg";
}
function barsLabel(n) {
	if (!Number.isFinite(n)) return "—";
	return `${formatNum(n, 0)} nến`;
}
function RecoveryPanel({ report }) {
	const ema = `EMA${report.emaPeriod}`;
	const depths = report.depths;
	const fade = report.cells.find((c) => c.trend === "ema" && c.depthLo === 1);
	const fc = report.forecast;
	const rows = [
		{
			key: "ema",
			label: `${ema} up`
		},
		{
			key: "all",
			label: "Mọi trend"
		},
		{
			key: "down",
			label: `${ema} down`
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "Nến hồi"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$2(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Pearson độ sâu ATR vs số nến hồi = ",
						formatNum(report.corr, 2),
						" (",
						ema,
						" ",
						formatNum(report.corrEma, 2),
						" · down",
						" ",
						formatNum(report.corrDown, 2),
						"). Hồi ≈ ",
						formatNum(report.intercept, 1),
						" + ",
						formatNum(report.slope, 1),
						" × ATR. Δ P50 ",
						ema,
						" − down = ",
						formatNum(report.trendLift, 1),
						" nến. Chỉ nhịp sâu từ 0.25× ATR, hồi trong 4 giờ."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$3, {
						k: "P50 mọi trend",
						v: barsLabel(report.p50All),
						d: `${minutesLabel(report.p50All * report.intervalMin)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$3, {
						k: `P50 ${ema} up`,
						v: barsLabel(report.p50Ema),
						d: `close trên ${ema} lúc xuyên`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$3, {
						k: `P50 ${ema} down`,
						v: barsLabel(report.p50Down),
						d: `close dưới ${ema} lúc xuyên`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$3, {
						k: "Mỗi 1× ATR thêm",
						v: Number.isFinite(report.slope) ? `+${formatNum(report.slope, 1)} nến` : "—",
						d: "hồi tuyến tính theo độ sâu"
					})
				]
			}),
			fc ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md bg-elevated px-4 py-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium tracking-wide text-subtle uppercase",
						children: fc.source === "live" ? "Ước lượng nhịp hiện tại" : "Ước lượng nhịp điển hình"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 font-mono text-2xl tabular-nums text-fg",
						children: [barsLabel(fc.p50), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "ml-2 text-sm text-muted",
							children: [
								"P75 ",
								barsLabel(fc.p75),
								" · ",
								minutesLabel(fc.p50 * report.intervalMin)
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-muted",
						children: [
							"Ô ",
							fc.trend === "ema" ? `${ema} up` : fc.trend === "down" ? `${ema} down` : "mọi trend",
							" ·",
							" ",
							formatNum(fc.depthLo, 2),
							fc.depthHi != null ? `–${formatNum(fc.depthHi, 2)}` : "+",
							"× ATR · ",
							formatInt(fc.n),
							" nhịp · hồi",
							" ",
							formatPct((fc.recRate || 0) * 100, 0),
							".",
							fade && Number.isFinite(fade.p50) ? ` Fade 1.0–1.5× trên ${ema}: P50 ${barsLabel(fade.p50)}.` : ""
						]
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid min-w-[36rem] grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {}),
						depths.map((d) => {
							const sample = report.cells.find((c) => c.trend === "all" && c.depthLo === d);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "px-1 text-xs font-medium tracking-wide text-subtle uppercase",
								children: sample ? depthLabel(sample) : `${d}×`
							}, d);
						}),
						rows.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							report,
							trend: row.key,
							label: row.label,
							forecast: fc
						}, row.key))
					]
				})
			})
		]
	});
}
function Row({ report, trend, label, forecast }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "flex items-center text-xs text-muted",
		children: label
	}), report.depths.map((d) => {
		const cell = report.cells.find((c) => c.trend === trend && c.depthLo === d);
		const active = forecast != null && cell != null && forecast.trend === cell.trend && forecast.depthLo === cell.depthLo;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: cn("rounded-md px-2 py-2", tone$1(cell ?? emptyCell(trend, d)), active && "shadow-[var(--shadow-border-hover)]"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-sm tabular-nums",
				children: cell ? barsLabel(cell.p50) : "—"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-0.5 text-xs text-subtle",
				children: cell ? `${formatInt(cell.n)} · P75 ${barsLabel(cell.p75)}` : "—"
			})]
		}, `${trend}-${d}`);
	})] });
}
function emptyCell(trend, lo) {
	return {
		trend,
		depthLo: lo,
		depthHi: null,
		n: 0,
		nRec: 0,
		recRate: NaN,
		p50: NaN,
		p75: NaN,
		p90: NaN
	};
}
function Mini$3({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function titleOf$1(report) {
	if (report.winner === report.baseline) return `EMA${report.baseline} đã tối ưu độ chính xác trên mẫu này`;
	if (report.winner < report.baseline) return `EMA${report.winner} chính xác hơn EMA${report.baseline} trên mẫu này`;
	return `EMA${report.winner} ổn định hơn EMA${report.baseline} trên mẫu này`;
}
function tone(cell) {
	if (!Number.isFinite(cell.expectancy) || cell.n < 12) return "text-muted";
	if (cell.expectancy > 0 && cell.stability > 0) return "text-recovery";
	if (cell.expectancy > 0) return "text-fg";
	return "text-dip";
}
function EmaTunePanel({ report }) {
	const w = report.winnerCell;
	const b = report.baselineCell;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "Tối ưu EMA"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf$1(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Quét ",
						report.cells.length,
						" chu kỳ, fade ",
						report.entryAtr.toFixed(2).replace(/0$/, ""),
						"× ATR, close trên EMA. Chọn period có min(E nửa đầu, E nửa sau) lớn nhất, cả hai nửa dương, n tối thiểu 30. Độ chính xác = win rate cuốn đó. EMA",
						report.baseline,
						" là mốc cũ."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$2, {
						k: "Period thắng",
						v: `EMA${report.winner}`,
						d: `${formatInt(w.n)} lệnh · occup. lọc trend`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$2, {
						k: "Độ chính xác",
						v: formatPct(w.winRate * 100, 0),
						d: `EMA${b.period} ${formatPct(b.winRate * 100, 0)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$2, {
						k: `Δ WR vs EMA${b.period}`,
						v: formatSignedPct(report.deltaWr * 100, 1),
						d: "điểm win rate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$2, {
						k: `Δ E vs EMA${b.period}`,
						v: formatSignedPct(report.deltaE, 3),
						d: "expectancy sau phí"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-xl text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs tracking-wide text-subtle uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "EMA"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "n"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "WR"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "E"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Nửa đầu"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Nửa sau"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "min WF"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Stop"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.cells.map((c) => {
						const win = c.period === report.winner;
						const base = c.period === report.baseline && !win;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: cn("border-t border-border", win && "bg-up/15", base && "bg-elevated"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: cn("px-3 py-2 font-mono tabular-nums", tone(c)),
									children: [c.period, win ? " · thắng" : base ? " · mốc" : ""]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatInt(c.n)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: cn("px-3 py-2 font-mono tabular-nums", tone(c)),
									children: formatPct(c.winRate * 100, 0)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: cn("px-3 py-2 font-mono tabular-nums", tone(c)),
									children: formatSignedPct(c.expectancy)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatSignedPct(c.firstE)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatSignedPct(c.secondE)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatSignedPct(c.stability)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "px-3 py-2 font-mono tabular-nums",
									children: formatPct(c.stopShare * 100, 0)
								})
							]
						}, c.period);
					}) })]
				})
			})
		]
	});
}
function Mini$2({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function titleOf(report) {
	if (report.winner === "sma") return `SMA${report.bestSma.period} chính xác hơn EMA${report.bestEma.period} khi mỗi bên tối ưu period`;
	if (report.winner === "ema") return `EMA${report.bestEma.period} vẫn thắng SMA${report.bestSma.period} khi mỗi bên tối ưu period`;
	return "EMA và SMA gần như trùng khi tối ưu period";
}
function deltaTone(d) {
	if (!Number.isFinite(d)) return "text-muted";
	if (d > .001) return "text-recovery";
	if (d < -.001) return "text-dip";
	return "text-fg";
}
function MaTypePanel({ report }) {
	const sma = report.bestSma;
	const ema = report.bestEma;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-sma uppercase",
					children: "EMA vs SMA"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-1 text-xl font-medium tracking-tight",
					children: titleOf(report)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 max-w-3xl text-sm text-muted",
					children: [
						"Cùng fade ",
						report.entryAtr.toFixed(2).replace(/0$/, ""),
						"× ATR, cùng chu kỳ. SMA50 vs EMA20 lần trước lẫn period với loại đường. ΔE = EMA − SMA (dương = EMA hơn). Thắng kiểu = min walk-forward lớn hơn giữa hai cuốn tối ưu. SMA thắng ",
						formatInt(report.smaWins),
						"/",
						formatInt(report.pairs.length),
						" period, EMA ",
						formatInt(report.emaWins),
						"."
					]
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$1, {
						k: `SMA tối ưu · ${sma.period}`,
						v: formatPct(sma.winRate * 100, 0),
						d: `${formatInt(sma.n)} lệnh · E ${formatSignedPct(sma.expectancy)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$1, {
						k: `EMA tối ưu · ${ema.period}`,
						v: formatPct(ema.winRate * 100, 0),
						d: `${formatInt(ema.n)} lệnh · E ${formatSignedPct(ema.expectancy)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$1, {
						k: "Δ WR best",
						v: formatSignedPct(report.deltaBestWr * 100, 1),
						d: "EMA − SMA, điểm win rate"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini$1, {
						k: "Δ E best",
						v: formatSignedPct(report.deltaBestE, 3),
						d: "EMA − SMA, expectancy"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-xl text-left text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "text-xs tracking-wide text-subtle uppercase",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-border",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "Period"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "SMA n"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "SMA WR"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "SMA E"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "EMA n"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "EMA WR"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "EMA E"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "px-3 py-2 font-medium",
									children: "ΔE"
								})
							]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: report.pairs.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PairRow, {
						pair: p,
						matched: p.period === report.matched.period
					}, p.period)) })]
				})
			})
		]
	});
}
function PairRow({ pair, matched }) {
	const smaBetter = pair.deltaE < -.001;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
		className: cn("border-t border-border", matched && "bg-up/15"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
				className: "px-3 py-2 font-mono tabular-nums",
				children: [pair.period, matched ? " · EMA live" : ""]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-3 py-2 font-mono tabular-nums",
				children: formatInt(pair.sma.n)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: cn("px-3 py-2 font-mono tabular-nums", smaBetter ? "text-recovery" : "text-fg"),
				children: formatPct(pair.sma.winRate * 100, 0)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-3 py-2 font-mono tabular-nums",
				children: formatSignedPct(pair.sma.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-3 py-2 font-mono tabular-nums",
				children: formatInt(pair.ema.n)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: cn("px-3 py-2 font-mono tabular-nums", !smaBetter && pair.deltaE > .001 ? "text-recovery" : "text-fg"),
				children: formatPct(pair.ema.winRate * 100, 0)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: "px-3 py-2 font-mono tabular-nums",
				children: formatSignedPct(pair.ema.expectancy)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
				className: cn("px-3 py-2 font-mono tabular-nums", deltaTone(pair.deltaE)),
				children: formatSignedPct(pair.deltaE, 3)
			})
		]
	});
}
function Mini$1({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function Dashboard() {
	const [symbol, setSymbol] = (0, import_react.useState)("BTCUSDT");
	const [interval, setInterval] = (0, import_react.useState)("5m");
	const [days, setDays] = (0, import_react.useState)(30);
	const [trend, setTrend] = (0, import_react.useState)("all");
	const [study, setStudy] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const [tick, setTick] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		setLoading(true);
		setError(null);
		loadStudy({ data: {
			symbol,
			interval,
			days
		} }).then((res) => {
			if (!cancelled) setStudy(res);
		}).catch((err) => {
			if (cancelled) return;
			setStudy(null);
			setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [
		symbol,
		interval,
		days,
		tick
	]);
	const stats = study ? study.stats[trend] : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Controls, {
					symbol,
					interval,
					days,
					loading,
					onSymbol: setSymbol,
					onInterval: setInterval,
					onDays: setDays,
					onRefresh: () => setTick((n) => n + 1)
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3 rounded-lg bg-surface px-4 py-3 text-sm shadow-[var(--shadow-border)]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "mt-0.5 size-4 shrink-0 text-dip" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted",
						children: error
					})]
				}),
				loading && !study && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadingState, {}),
				study && stats && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Results, {
					study,
					stats,
					trend,
					onTrend: setTrend
				})
			]
		})
	});
}
function Header() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-[0.18em] text-sma uppercase",
					children: "SMA15 Lab"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-3xl font-medium tracking-tight text-fg sm:text-4xl",
					children: "Giá sập dưới SMA15 bao nhiêu trước khi hồi?"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 max-w-xl text-sm leading-normal text-muted",
					children: "Tải nến thật, đo độ sâu tối đa dưới SMA15 trên từng nhịp sập, rồi so sánh đơn vị phần trăm với bội số ATR — xem cái nào ổn định hơn để vào lệnh mean-reversion."
				})
			]
		})
	});
}
function Controls(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-2 gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:grid-cols-4 sm:p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
				label: "Cặp",
				value: props.symbol,
				onChange: props.onSymbol,
				options: SYMBOLS.map((s) => ({
					value: s.id,
					label: `${s.label} / USDT`
				}))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
				label: "Khung nến",
				value: props.interval,
				onChange: (v) => props.onInterval(v),
				options: INTERVALS$1.map((s) => ({
					value: s.id,
					label: s.label
				}))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectField, {
				label: "Lịch sử",
				value: String(props.days),
				onChange: (v) => props.onDays(Number(v)),
				options: DAY_OPTIONS.map((d) => ({
					value: String(d),
					label: `${d} ngày`
				}))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					className: "w-full",
					onClick: props.onRefresh,
					disabled: props.loading,
					children: [props.loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "size-4" }), "Tải lại nến"]
				})
			})
		]
	});
}
function LoadingState() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-40 animate-pulse rounded-xl bg-surface" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse rounded-lg bg-surface" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse rounded-lg bg-surface" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse rounded-lg bg-surface" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse rounded-lg bg-surface" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Đang tải nến và đo các nhịp sập dưới SMA15…"
			})
		]
	});
}
function Results({ study, stats, trend, onTrend }) {
	const v = study.atrVerdict;
	const live = study.live;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6 sm:gap-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hero, {
				study,
				stats
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LiveStrip, { study }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Số nhịp sập",
						value: formatInt(stats.nEvents),
						hint: `${formatInt(stats.nSignal)} nhịp ≥ ${MIN_SIGNAL_ATR}× ATR`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Tỷ lệ hồi ≤ 4 giờ",
						value: formatPct(stats.recoveryRate * 100, 1),
						hint: `1 nến: ${formatPct(stats.recoveredWithin.c1 * 100, 0)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Thời gian hồi (P50)",
						value: minutesLabel(stats.durationMin.p50),
						hint: `${formatNum(stats.durationCandles.p50, 0)} nến`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kpi, {
						label: "Bounce từ đáy (P50)",
						value: formatPct(stats.bouncePct.p50),
						hint: `P75 ${formatPct(stats.bouncePct.p75)}`
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendTabs, {
				trend,
				onTrend,
				stats: study.stats
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "overflow-hidden rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandleChart, {
					candles: study.chart,
					symbol: study.symbol
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 px-1 text-xs text-subtle",
					children: [
						"Vùng đỏ nhạt: nhịp đang dưới SMA15. Dữ liệu ",
						study.source,
						" · ",
						formatInt(study.candleCount),
						" nến ·",
						" ",
						formatDateVn(study.from),
						" → ",
						formatTimeVn(study.to)
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-3 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Histogram, {
					title: "Phân phối độ sâu (%)",
					unit: `(SMA − low) / SMA, nhịp hồi sâu ≥ ${MIN_SIGNAL_ATR}× ATR`,
					bins: stats.histPct,
					quantiles: stats.pct,
					formatTick: (n) => formatPct(n)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Histogram, {
					title: "Phân phối độ sâu (ATR)",
					unit: `(SMA − low) / ATR14, cùng lọc ≥ ${MIN_SIGNAL_ATR}× ATR`,
					bins: stats.histAtr,
					quantiles: stats.atr,
					formatTick: (n) => `${formatNum(n, 2)}×`
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AtrVerdict, {
				study,
				stats
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RecoveryPanel, { report: study.recovery }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmaTunePanel, { report: study.emaTune }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MaTypePanel, { report: study.maType }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EdgePanel, { report: study.edge }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepthPanel, { report: study.depth }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BbPanel, {
				report: study.bb,
				live: study.live
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendComparePanel, { report: study.trendCompare }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OscPanel, {
				report: study.osc,
				live: study.live
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumePanel, {
				volume: study.volume,
				live: study.live
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BacktestPanel, { report: study.backtest }),
			study.regimes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RegimeTable, { rows: study.regimes }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventTable, { events: study.events }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Method, {
				study,
				live,
				v
			})
		]
	});
}
function Hero({ study, stats }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "grid gap-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:grid-cols-2 sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs font-medium tracking-wide text-subtle uppercase",
				children: [
					"Trung vị trước khi hồi · ",
					study.symbol,
					" · ",
					study.interval,
					" · lọc nhiễu"
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 font-display text-5xl font-medium tracking-tight text-fg tabular-nums sm:text-6xl",
				children: formatPct(stats.pct.p50)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted",
				children: [
					"Vùng thường gặp P25–P75: ",
					formatPct(stats.pct.p25),
					" – ",
					formatPct(stats.pct.p75),
					". Sập sâu P90:",
					" ",
					formatPct(stats.pct.p90),
					"."
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "sm:border-l sm:border-border sm:pl-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-medium tracking-wide text-subtle uppercase",
					children: "Cùng sự kiện, đo bằng ATR"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 font-display text-5xl font-medium tracking-tight text-sma tabular-nums sm:text-6xl",
					children: Number.isFinite(stats.atr.p50) ? `${formatNum(stats.atr.p50, 2)}×` : "—"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-2 text-sm text-muted",
					children: [
						"P25–P75: ",
						formatAtrMul(stats.atr.p25),
						" – ",
						formatAtrMul(stats.atr.p75),
						". P90:",
						" ",
						formatAtrMul(stats.atr.p90),
						"."
					]
				})
			]
		})]
	});
}
function LiveStrip({ study }) {
	const live = study.live;
	const below = live.below;
	const p = live.pctileAmongRecovered;
	const fc = study.recovery.forecast;
	let hint = "Giá đang trên SMA15.";
	if (below && live.volClimax) hint = `Volume climax ${formatNum(live.volRatio, 1)}× SMA20 — đối chiếu backtest chỉ-xả 2.5×.`;
	else if (below && live.volDump) hint = `Volume xả ${formatNum(live.volRatio, 1)}× — chưa tới ngưỡng climax 2.5×.`;
	else if (below && p != null) {
		if (p < 40) hint = "Sập còn nông so với lịch sử — chưa tới vùng P50.";
		else if (p < 75) hint = "Đang trong vùng độ sâu điển hình trước khi hồi.";
		else hint = "Sâu hơn phần lớn nhịp hồi — hoặc mean-reversion mạnh, hoặc gãy trend.";
	}
	if (below && fc && Number.isFinite(fc.p50) && fc.p50 <= 2) hint = `P50 hồi ${formatNum(fc.p50, 0)} nến — luật mới bỏ lệnh (ngưỡng 2).`;
	else if (below && fc && Number.isFinite(fc.p50)) hint = `${hint} Ước lượng hồi P50 ${formatNum(fc.p50, 0)} nến (P75 ${formatNum(fc.p75, 0)}). TP ${formatNum(Math.max(1, Math.round(fc.p50) - 2), 0)} nến.`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2 rounded-lg bg-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center gap-2 text-sm",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Activity, { className: cn("size-4", below ? "text-dip" : "text-recovery") }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-medium",
					children: study.symbol
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-mono tabular-nums",
					children: formatPrice(live.last)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-subtle",
					children: ["SMA15 ", live.sma != null ? formatPrice(live.sma) : "—"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: cn("text-subtle", live.aboveSma50 ? "text-recovery" : "text-dip"),
					children: ["SMA50 ", live.aboveSma50 ? "up" : "down"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: cn("text-subtle", live.aboveEma20 ? "text-recovery" : "text-dip"),
					children: [
						"EMA",
						live.emaPeriod,
						" ",
						live.aboveEma20 ? "up" : "down"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-subtle",
					children: ["RSI7 ", live.rsiFast != null ? formatNum(live.rsiFast, 0) : "—"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-subtle",
					children: ["RSI21 ", live.rsiSlow != null ? formatNum(live.rsiSlow, 0) : "—"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: cn("text-subtle", live.cti != null && live.cti > 0 ? "text-dip" : "text-recovery"),
					children: ["CTI ", live.cti != null ? formatNum(live.cti, 2) : "—"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: cn("text-subtle", live.bbSqueeze ? "text-recovery" : live.bbExpand ? "text-dip" : ""),
					children: [
						"BB ",
						live.bbWidthPct != null ? formatPct(live.bbWidthPct) : "—",
						live.bbSqueeze ? " squeeze" : live.bbExpand ? " rộng" : ""
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: below ? `Đang dưới SMA ${formatPct(live.undershootPct)} · ${formatAtrMul(live.undershootAtr)}${p != null ? ` · P${formatNum(p, 0)} lịch sử` : ""}. ${hint}` : hint
		})]
	});
}
function Kpi({ label, value, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-xl text-fg tabular-nums",
				children: value
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: hint
			})
		]
	});
}
function TrendTabs({ trend, onTrend, stats }) {
	const items = [
		{
			id: "all",
			label: "Mọi nhịp",
			n: stats.all.nEvents
		},
		{
			id: "up",
			label: "Uptrend (> SMA50)",
			n: stats.up.nEvents
		},
		{
			id: "down",
			label: "Downtrend",
			n: stats.down.nEvents
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex flex-wrap gap-2",
		children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => onTrend(it.id),
			className: cn("h-11 rounded-md px-4 text-sm transition-[background-color,color] duration-150", trend === it.id ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg"),
			children: [it.label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "ml-2 font-mono text-xs tabular-nums opacity-70",
				children: it.n
			})]
		}, it.id))
	});
}
function AtrVerdict({ study, stats }) {
	const v = study.atrVerdict;
	const title = v.grade === "strong" ? "ATR chuẩn hóa tốt hơn %" : v.grade === "partial" ? "ATR chuẩn hóa được một phần" : "ATR chưa ổn định hơn % trên mẫu này";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-sma uppercase",
				children: "Chuẩn hóa ATR"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 text-xl font-medium tracking-tight",
				children: title
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "max-w-3xl text-sm leading-normal text-muted",
				children: [
					"Hệ số biến thiên (CV = σ/μ) của độ sâu theo % là",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-fg tabular-nums",
						children: formatNum(v.cvPct, 2)
					}),
					", theo ATR là",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-fg tabular-nums",
						children: formatNum(v.cvAtr, 2)
					}),
					v.atrMoreStable ? " — ATR biến động ít hơn, nên dùng làm ngưỡng vào lệnh khi volatility đổi." : " — trên mẫu này % chưa lệch nhiều so với ATR.",
					" ",
					"Tương quan ATR% (biến động hiện tại) với độ sâu % là",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-fg tabular-nums",
						children: formatNum(v.corrAtrPctVsDumpPct, 2)
					}),
					v.corrAtrPctVsDumpPct >= .45 ? ": khi ATR lớn, giá sập sâu hơn theo %, đúng với giả thuyết chuẩn hóa." : "."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						k: "Ngưỡng gợi ý (P50 ATR)",
						v: formatAtrMul(stats.atr.p50),
						d: "Chờ sập tới mức này dưới SMA15 rồi mới fade."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						k: "Quy đổi % hiện tại",
						v: study.live.atrPct != null && Number.isFinite(stats.atr.p50) ? formatPct(study.live.atrPct * stats.atr.p50) : "—",
						d: "P50 ATR × ATR% nến cuối — % tương đương lúc này, không phải % cố định."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
						k: "Đáy ngay nến đầu",
						v: formatPct(stats.firstCandleIsTroughRate * 100, 0),
						d: "Tỷ lệ nhịp hồi có low thấp nhất ngay cây nến xuyên SMA."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted",
				children: [
					"Spread tương đối P10–P90 / P50: % = ",
					formatNum(v.relativeSpreadPct, 2),
					", ATR =",
					" ",
					formatNum(v.relativeSpreadAtr, 2),
					".",
					" ",
					v.relativeSpreadAtr < v.relativeSpreadPct ? "Dải ATR hẹp hơn — cùng một ngưỡng 0.4–0.7× ATR dùng được nhiều chế độ biến động." : "Dải hai đơn vị gần nhau; vẫn nên xem bảng chế độ ATR% bên dưới."
				]
			})
		]
	});
}
function Mini({ k, v, d }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-md bg-elevated px-3 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-subtle",
				children: k
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 font-mono text-lg text-fg tabular-nums",
				children: v
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs leading-snug text-muted",
				children: d
			})
		]
	});
}
function RegimeTable({ rows }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: "Độ sâu theo chế độ biến động (tứ phân vị ATR%)"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: "Nếu cột % tăng theo ATR% trong khi cột ×ATR đứng yên — ATR đang chuẩn hóa đúng."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-xl text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs tracking-wide text-subtle uppercase",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Chế độ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "ATR%"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "n"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "P50 %"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "P50 ×ATR"
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5",
							children: r.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: formatPct(r.atrPctMid)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: r.n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: formatPct(r.medPct)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: formatAtrMul(r.medAtr)
						})
					]
				}, r.label)) })]
			})
		})]
	});
}
function VolumePanel({ volume, live }) {
	const { upAny, upSkip, allAny, allSkip } = volume.books;
	const title = volume.weak ? "Lọc volume gần như không đổi setup tốt nhất" : Number.isFinite(volume.deltaE) && volume.deltaE > .03 ? "Tránh xả có cải thiện expectancy" : "Volume không tách được lệnh thắng / thua";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium tracking-wide text-sma uppercase",
				children: "Lọc volume"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mt-1 text-xl font-medium tracking-tight",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 max-w-3xl text-sm text-muted",
				children: [
					"1.5× ATR + uptrend đã loại gần hết nến climax trước khi volume kịp lọc: chỉ ",
					formatInt(volume.nSkip),
					" / ",
					formatInt(volume.nBase + volume.nSkip),
					" tín hiệu bị bỏ (",
					formatPct(volume.skipShare * 100, 1),
					"). Delta E = ",
					formatSignedPct(volume.deltaE, 3),
					" so với mọi vol. Vol P50 lệnh hồi SMA ",
					Number.isFinite(volume.volP50Sma) ? `${formatNum(volume.volP50Sma, 2)}×` : "—",
					" vs lệnh dính stop",
					" ",
					Number.isFinite(volume.volP50Stop) ? `${formatNum(volume.volP50Stop, 2)}×` : "—",
					" — gần như trùng.",
					" ",
					"Vol nến cuối ",
					Number.isFinite(live.volRatio) ? `${formatNum(live.volRatio, 2)}×` : "—",
					"."
				]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
					k: "1.5× up · mọi vol",
					v: upAny.n ? formatSignedPct(upAny.expectancy) : "—",
					d: upAny.n ? `${formatInt(upAny.n)} lệnh · climax ${formatPct((upAny.dumpShare || 0) * 100, 0)}` : ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
					k: "1.5× up · tránh 2.5×",
					v: upSkip.n || upSkip.nSkipped ? formatSignedPct(upSkip.expectancy) : "—",
					d: `${formatInt(upSkip.n)} lệnh · bỏ ${formatInt(upSkip.nSkipped)}`
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
					k: "1.5× all · mọi vol",
					v: allAny.n ? formatSignedPct(allAny.expectancy) : "—",
					d: allAny.n ? `${formatInt(allAny.n)} lệnh · E ${formatSignedPct(allAny.expectancy)}` : ""
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mini, {
					k: "1.5× all · tránh 2.5×",
					v: allSkip.n || allSkip.nSkipped ? formatSignedPct(allSkip.expectancy) : "—",
					d: `${formatInt(allSkip.n)} lệnh · bỏ ${formatInt(allSkip.nSkipped)}`
				})
			]
		})]
	});
}
function EventTable({ events }) {
	const rows = (0, import_react.useMemo)(() => events.slice(0, 40), [events]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 py-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-sm font-medium",
				children: "Nhịp sập gần đây"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted",
				children: "40 sự kiện mới nhất. Hồi = close trở lại trên SMA15 trong 4 giờ."
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full min-w-2xl text-left text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-xs tracking-wide text-subtle uppercase",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Bắt đầu"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Độ sâu %"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "×ATR"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Hồi"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Bounce"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Vol"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "px-5 py-2 font-medium",
								children: "Trend"
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: rows.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono text-xs tabular-nums",
							children: formatTimeVn(e.startT)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: formatPct(e.undershootPct)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: formatNum(e.undershootAtr, 2)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: cn("px-5 py-2.5", e.recovered ? "text-recovery" : "text-dip"),
							children: e.recovered ? `${e.recoveryCandles} nến` : "không"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 font-mono tabular-nums",
							children: e.bouncePct == null ? "—" : formatPct(e.bouncePct)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							className: cn("px-5 py-2.5 font-mono tabular-nums", e.volumeDump && "text-dip"),
							children: [Number.isFinite(e.volRatioTrough) ? `${formatNum(e.volRatioTrough, 1)}×` : "—", e.volumeDump && e.volRatioTrough >= 2.5 ? " climax" : e.volumeDump ? " xả" : ""]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-5 py-2.5 text-muted",
							children: e.uptrend ? "Up" : "Down"
						})
					]
				}, `${e.startT}-${e.endT}`)) })]
			})
		})]
	});
}
function Method({ study, live, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-xl bg-surface px-5 py-5 text-sm leading-normal text-muted shadow-[var(--shadow-border)] sm:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-fg font-medium",
				children: "Cách đo"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "mt-3 list-decimal space-y-2 pl-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Nến ",
						study.interval,
						" từ ",
						study.source,
						". SMA",
						study.smaPeriod,
						" trên close. ATR",
						study.atrPeriod,
						" Wilder."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Một nhịp sập bắt đầu khi low xuyên dưới SMA15. Độ sâu thống kê chỉ lấy nhịp hồi sâu ≥ 0.25× ATR (lọc wick nhiễu). Độ sâu là khoảng cách lớn nhất (SMA − low) trong nhịp, tính trên SMA/ATR tại từng nến — không lấy SMA lúc vừa xuyên." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Hồi khi close trở lại ≥ SMA15 trong ",
						study.lookforwardHours,
						" giờ (",
						study.lookforwardCandles,
						" nến). Nhịp không hồi bị loại khỏi phân phối “trước khi hồi”, nhưng vẫn tính tỷ lệ thất bại."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Uptrend mặc định: close trên SMA50. Trend filter live dùng EMA thắng từ lưới tối ưu (mốc EMA20)." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"ATR “chuẩn hóa được” nếu CV và dải P10–P90 của bội số ATR hẹp hơn % , và ATR% tương quan với độ sâu %. Grade hiện tại: ",
						v.grade,
						". ATR nến cuối ",
						live.atr != null ? formatPrice(live.atr) : "—",
						" (",
						live.atrPct != null ? formatPct(live.atrPct) : "—",
						" giá)."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Edge ATR + trend: lưới 1.0 / 1.25 / 1.5× ATR × up / all / down, không lọc volume. Walk-forward chia nến làm hai nửa theo thời gian. Expectancy sau phí 4 bps/chiều." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"RSI fast ",
						study.osc.rsiFast,
						" / slow ",
						study.osc.rsiSlow,
						" Wilder + CTI",
						study.osc.ctiPeriod,
						". Combo AND trên nền fade EMA",
						study.live.emaPeriod,
						"."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Hồi: lưới 5 độ sâu ATR × EMA",
						study.live.emaPeriod,
						" up / mọi / down. P50 số nến close trở lại SMA15. Pearson và hồi quy tuyến tính nến ≈ a + b × ATR trên nhịp hồi."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Tối ưu EMA: quét 8–50, chọn period có min(E nửa đầu, E nửa sau) lớn nhất khi cả hai nửa dương. Độ chính xác = win rate cuốn close trên EMA đó." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "EMA vs SMA: cùng fade, cùng period. Không so SMA50 với EMA ngắn. Thắng kiểu = cuốn tối ưu period của mỗi loại, theo min walk-forward." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Backtest: bỏ lệnh khi P50 nến hồi ≤ 2. TP đóng close sau P50 trừ 2 nến; stop 1.5× ATR; thoát sớm nếu close về SMA15 trước đó. Lưới P50 lấy từ cùng mẫu — in-sample." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Độ sâu ATR: quét 0.5–2.5× trên fade EMA",
						study.live.emaPeriod,
						" up (SMA-exit và TP P50−2) đối chiếu mọi trend. Đỉnh = max E với ít nhất 12 lệnh; occupancy = n tại 0.5× chia n tại đỉnh."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						"Bollinger: SMA",
						study.bb.period,
						" ± ",
						study.bb.k,
						"σ, width = (upper − lower) / mid. Squeeze = percentile nhân quả trên ",
						study.bb.rankBars,
						" nến ≤ ",
						Math.round(study.bb.squeezeP * 100),
						". Fade 1.25× ATR, EMA",
						study.live.emaPeriod,
						" up. Pearson width vs ATR% để bắt proxy."
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-xs text-subtle",
				children: "Đây là thống kê in-sample trên 30 ngày gần nhất, không phải lời khuyên đầu tư. Nửa mẫu walk-forward không thay thế out-of-sample."
			})
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dashboard, {});
}
//#endregion
export { Home as component };
