import { computeAtr, computeBb, computeEma, computeSma, rankInWindow } from "./indicators.ts";
import { predLocked } from "./ols-locked.ts";
import {
  ATR_PERIOD,
  BB_K,
  BB_PERIOD,
  BB_RANK_BARS,
  BB_SQUEEZE_P,
  CLIMAX_VOL_MULT,
  FORECAST_MIN_BARS,
  PRED_SIGMA,
  SCAN_DEEP_HI,
  SCAN_ENTRY_HI,
  SCAN_ENTRY_LO,
  SCAN_NEAR_LO,
  SMA_PERIOD,
  VOL_SMA_PERIOD,
} from "./symbols.ts";
import type { Candle, Interval } from "./types.ts";
import { isVolumeDump, volRatio } from "./volume.ts";

export const SCAN_EMA = 14;

export type ScanStatus = "entry" | "near" | "blocked" | "flat" | "error";

export type ScanGates = {
  below: boolean;
  emaUp: boolean;
  depthOk: boolean;
  predOk: boolean;
  notSqueeze: boolean;
  notClimax: boolean;
};

export type ScanRow = {
  symbol: string;
  label: string;
  source: string;
  lastT: number;
  last: number;
  sma: number | null;
  atr: number | null;
  ema: number | null;
  below: boolean;
  depth: number;
  emaUp: boolean;
  predBars: number;
  sigma: number;
  slack: number;
  tpBars: number;
  volRatio: number;
  squeeze: boolean;
  climax: boolean;
  bbBelowLower: boolean;
  gates: ScanGates;
  status: ScanStatus;
  reasons: string[];
  score: number;
  error?: string;
};

export type ScanReport = {
  interval: Interval;
  at: number;
  nextBar: number;
  n: number;
  nEntry: number;
  nNear: number;
  rows: ScanRow[];
};

export type LiveSnap = {
  below: boolean;
  depth: number;
  emaUp: boolean;
  predBars: number;
  squeeze: boolean;
  climax: boolean;
  bbBelowLower: boolean;
};

export function nextBarTime(at: number, intervalMin: number): number {
  const step = intervalMin * 60_000;
  return Math.ceil((at + 1) / step) * step;
}

export function classifyLive(snap: LiveSnap): { status: ScanStatus; reasons: string[]; score: number } {
  const reasons: string[] = [];
  if (!snap.below) return { status: "flat", reasons: ["Giá trên SMA15"], score: 0 };

  const predOk = Number.isFinite(snap.predBars) && snap.predBars > FORECAST_MIN_BARS;
  const depthEntry = snap.depth >= SCAN_ENTRY_LO && snap.depth <= SCAN_ENTRY_HI;
  const depthNear =
    (snap.depth >= SCAN_NEAR_LO && snap.depth < SCAN_ENTRY_LO) ||
    (snap.depth > SCAN_ENTRY_HI && snap.depth <= SCAN_DEEP_HI);

  if (!snap.emaUp) reasons.push("Close dưới EMA14");
  if (!predOk) reasons.push(`P50 hồi ≤ ${FORECAST_MIN_BARS} nến — skip`);
  if (snap.squeeze) reasons.push("BB squeeze");
  if (snap.climax) reasons.push("Volume climax");
  if (snap.depth < SCAN_NEAR_LO) reasons.push("Độ sâu còn nông");
  if (snap.depth > SCAN_DEEP_HI) reasons.push("Dump quá sâu");

  if (snap.emaUp && predOk && !snap.squeeze && !snap.climax && depthEntry) {
    const depthScore = 1 - Math.min(1, Math.abs(snap.depth - 1.35) / 0.55);
    const predScore = snap.predBars >= 3 && snap.predBars <= 10 ? 1 : 0.55;
    const bb = snap.bbBelowLower ? 0.12 : 0;
    return {
      status: "entry",
      reasons: [],
      score: depthScore * 0.7 + predScore * 0.3 + bb,
    };
  }
  if (snap.emaUp && predOk && !snap.squeeze && !snap.climax && depthNear) {
    const approaching = snap.depth < SCAN_ENTRY_LO;
    reasons.length = 0;
    reasons.push(approaching ? "Đang tiến tới 1.25×" : "Hơi sâu hơn sweet-spot");
    return { status: "near", reasons, score: approaching ? snap.depth / SCAN_ENTRY_LO : 0.3 };
  }
  if (!snap.emaUp || !predOk || snap.squeeze || snap.climax || (!depthEntry && !depthNear)) {
    if (!reasons.length) reasons.push("Chưa đủ cửa");
    return { status: "blocked", reasons, score: 0 };
  }
  return { status: "blocked", reasons: reasons.length ? reasons : ["Chưa đủ cửa"], score: 0 };
}

export function evaluateScan(input: {
  symbol: string;
  label: string;
  candles: Candle[];
  source: string;
  interval: Interval;
}): ScanRow {
  const { symbol, label, candles, source } = input;
  const blank = (over: Partial<ScanRow>): ScanRow => ({
    symbol,
    label,
    source,
    lastT: candles.at(-1)?.t ?? 0,
    last: candles.at(-1)?.c ?? NaN,
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
    gates: { below: false, emaUp: false, depthOk: false, predOk: false, notSqueeze: true, notClimax: true },
    status: "error",
    reasons: [],
    score: 0,
    ...over,
  });
  if (candles.length < 80) return blank({ error: "quá ít nến", reasons: ["Không đủ nến"], status: "error" });

  const closes = candles.map((c) => c.c);
  const sma = computeSma(closes, SMA_PERIOD);
  const atr = computeAtr(candles, ATR_PERIOD);
  const ema = computeEma(closes, SCAN_EMA);
  const volSma = computeSma(candles.map((c) => c.v), VOL_SMA_PERIOD);
  const bb = computeBb(closes, BB_PERIOD, BB_K);
  const rank = rankInWindow(bb.widthPct, BB_RANK_BARS);
  const last = candles[candles.length - 1]!;
  const lastSma = sma[sma.length - 1] ?? null;
  const lastAtr = atr[atr.length - 1] ?? null;
  const lastEma = ema[ema.length - 1] ?? null;
  const lastVol = volSma[volSma.length - 1] ?? null;
  const lastRank = rank[rank.length - 1] ?? null;
  const lastLower = bb.lower[bb.lower.length - 1] ?? null;
  const squeeze = lastRank != null && lastRank <= BB_SQUEEZE_P;
  const bbBelowLower = lastLower != null && last.l < lastLower;
  const below = lastSma != null && last.l < lastSma;
  const depth =
    lastSma != null && lastAtr != null && lastAtr > 0 ? Math.max(0, (lastSma - last.l) / lastAtr) : 0;
  const emaUp = lastEma != null && last.c > lastEma;
  const predBars = predLocked(depth, emaUp);
  const sigma = Number.isFinite(predBars) ? PRED_SIGMA * predBars : NaN;
  const slack = Number.isFinite(sigma) ? Math.max(1, Math.round(sigma)) : NaN;
  const tpBars =
    Number.isFinite(predBars) ? Math.max(1, Math.round(predBars) - FORECAST_MIN_BARS) : NaN;
  const vr = volRatio(last.v, lastVol);
  const climax = isVolumeDump(last, lastVol, CLIMAX_VOL_MULT);
  const hit = classifyLive({
    below,
    depth,
    emaUp,
    predBars,
    squeeze,
    climax,
    bbBelowLower,
  });
  const depthOk = depth >= SCAN_ENTRY_LO && depth <= SCAN_ENTRY_HI;
  const predOk = Number.isFinite(predBars) && predBars > FORECAST_MIN_BARS;
  return {
    symbol,
    label,
    source,
    lastT: last.t,
    last: last.c,
    sma: lastSma,
    atr: lastAtr,
    ema: lastEma,
    below,
    depth,
    emaUp,
    predBars,
    sigma,
    slack,
    tpBars,
    volRatio: vr,
    squeeze,
    climax,
    bbBelowLower,
    gates: {
      below,
      emaUp,
      depthOk,
      predOk,
      notSqueeze: !squeeze,
      notClimax: !climax,
    },
    status: hit.status,
    reasons: hit.reasons,
    score: hit.score,
  };
}

export function assembleScan(rows: ScanRow[], interval: Interval, at = Date.now()): ScanReport {
  const ranked = rows.slice().sort((a, b) => {
    const rank = (s: ScanRow) =>
      s.status === "entry" ? 0 : s.status === "near" ? 1 : s.status === "blocked" ? 2 : 3;
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return b.score - a.score;
  });
  return {
    interval,
    at,
    nextBar: nextBarTime(at, interval === "5m" ? 5 : interval === "15m" ? 15 : interval === "1h" ? 60 : 1),
    n: ranked.length,
    nEntry: ranked.filter((r) => r.status === "entry").length,
    nNear: ranked.filter((r) => r.status === "near").length,
    rows: ranked,
  };
}
