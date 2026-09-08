import type { Interval } from "./types.ts";

export const SYMBOLS = [
  { id: "BTCUSDT", label: "BTC" },
  { id: "ETHUSDT", label: "ETH" },
  { id: "SOLUSDT", label: "SOL" },
  { id: "BNBUSDT", label: "BNB" },
  { id: "XRPUSDT", label: "XRP" },
  { id: "DOGEUSDT", label: "DOGE" },
  { id: "ADAUSDT", label: "ADA" },
  { id: "AVAXUSDT", label: "AVAX" },
  { id: "LINKUSDT", label: "LINK" },
  { id: "SUIUSDT", label: "SUI" },
  { id: "NEARUSDT", label: "NEAR" },
  { id: "APTUSDT", label: "APT" },
  { id: "ARBUSDT", label: "ARB" },
  { id: "LTCUSDT", label: "LTC" },
] as const;

export const INTERVALS: { id: Interval; label: string }[] = [
  { id: "1m", label: "1m" },
  { id: "5m", label: "5m" },
  { id: "15m", label: "15m" },
  { id: "1h", label: "1h" },
];

export const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

export const SMA_PERIOD = 15;
export const ATR_PERIOD = 14;
export const TREND_SMA_PERIOD = 50;
export const TREND_EMA_PERIOD = 20;
export const RSI_FAST = 7;
export const RSI_SLOW = 21;
export const CTI_PERIOD = 20;
/** RSI slow still in bull regime. */
export const RSI_SLOW_MIN = 50;
/** Fade when CTI is not positive — linear uptrend already bent. */
export const CTI_MAX = 0;
export const LOOKFORWARD_HOURS = 4;
export const CHART_BARS = 360;
/** Wick smaller than this ATR multiple is noise around SMA, not a dump. */
export const MIN_SIGNAL_ATR = 0.25;
export const VOL_SMA_PERIOD = 20;
/** Skip fade when selling volume ≥ this × SMA20(volume). */
export const VOL_DUMP_MULT = 2;
/** Only-buy hypothesis: selling volume ≥ this × SMA20. */
export const CLIMAX_VOL_MULT = 2.5;
/** Skip fade when predicted recovery candles are this many or fewer. */
export const FORECAST_MIN_BARS = 2;
/** Take profit this many candles before predicted SMA reclaim. */
export const TP_SLACK_BARS = 2;
/** Classic Bollinger: SMA20 ± 2σ (population). */
export const BB_PERIOD = 20;
export const BB_K = 2;
/** Trailing bars for causal width percentile (~1 day on 5m). */
export const BB_RANK_BARS = 288;
export const BB_SQUEEZE_P = 0.2;
export const BB_EXPAND_P = 0.8;
/** Live fade window around the 1.25–1.5× sweet spot. */
export const SCAN_ENTRY_LO = 1.15;
export const SCAN_ENTRY_HI = 1.75;
export const SCAN_NEAR_LO = 0.7;
export const SCAN_DEEP_HI = 2.2;
export const SCAN_BARS = 320;
export const PRED_SIGMA = 0.5;

export function intervalMs(interval: Interval): number {
  switch (interval) {
    case "1m":
      return 60_000;
    case "5m":
      return 5 * 60_000;
    case "15m":
      return 15 * 60_000;
    case "1h":
      return 60 * 60_000;
  }
}

export function intervalMinutes(interval: Interval): number {
  return intervalMs(interval) / 60_000;
}

/** Keep payloads and fetch count bounded. */
export function clampDays(interval: Interval, days: number): number {
  const maxCandles = 28_000;
  const maxByBars = Math.max(3, Math.floor((maxCandles * intervalMs(interval)) / 86_400_000));
  const hard = interval === "1m" ? Math.min(14, maxByBars) : Math.min(90, maxByBars);
  return Math.min(Math.max(1, days), hard);
}
