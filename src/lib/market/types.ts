export type Interval = "1m" | "5m" | "15m" | "1h";

export type TrendFilter = "all" | "up" | "down";

export type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Quantiles = {
  mean: number;
  std: number;
  cv: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
};

export type DipEvent = {
  startT: number;
  endT: number;
  troughT: number;
  startIdx: number;
  endIdx: number;
  recovered: boolean;
  recoveryCandles: number;
  durationMin: number;
  minLow: number;
  smaAtTrough: number;
  atrAtTrough: number;
  undershootPct: number;
  undershootAtr: number;
  firstUndershootPct: number;
  bouncePct: number | null;
  uptrend: boolean;
  closeStart: number;
  volRatioTrough: number;
  volRatioMax: number;
  volumeDump: boolean;
};

export type RegimeRow = {
  label: string;
  atrPctMid: number;
  n: number;
  medPct: number;
  medAtr: number;
};

export type HistogramBin = {
  x0: number;
  x1: number;
  n: number;
};

export type GroupStats = {
  nEvents: number;
  nRecovered: number;
  nFailed: number;
  nSignal: number;
  recoveryRate: number;
  recoveredWithin: {
    c1: number;
    c3: number;
    c6: number;
    c12: number;
    c24: number;
  };
  pct: Quantiles;
  atr: Quantiles;
  durationCandles: Quantiles;
  durationMin: Quantiles;
  bouncePct: Quantiles;
  firstCandleIsTroughRate: number;
  extraDumpPct: Quantiles;
  histPct: HistogramBin[];
  histAtr: HistogramBin[];
};

export type ChartCandle = Candle & {
  sma: number | null;
  atr: number | null;
  inDip: boolean;
};

export type LiveState = {
  lastT: number;
  last: number;
  sma: number | null;
  atr: number | null;
  atrPct: number | null;
  below: boolean;
  undershootPct: number;
  undershootAtr: number;
  pctileAmongRecovered: number | null;
  vol: number;
  volSma: number | null;
  volRatio: number;
  volDump: boolean;
  volClimax: boolean;
  sma50: number | null;
  ema20: number | null;
  aboveSma50: boolean;
  aboveEma20: boolean;
  rsiFast: number | null;
  rsiSlow: number | null;
  cti: number | null;
  oscCombo: boolean;
  emaPeriod: number;
  bbWidthPct: number | null;
  bbPctile: number | null;
  bbSqueeze: boolean;
  bbExpand: boolean;
  bbPctB: number | null;
  bbBelowLower: boolean;
};

export type StudyResult = {
  symbol: string;
  interval: Interval;
  source: string;
  days: number;
  smaPeriod: number;
  atrPeriod: number;
  lookforwardHours: number;
  lookforwardCandles: number;
  from: number;
  to: number;
  candleCount: number;
  live: LiveState;
  stats: {
    all: GroupStats;
    up: GroupStats;
    down: GroupStats;
  };
  atrVerdict: {
    atrMoreStable: boolean;
    cvPct: number;
    cvAtr: number;
    corrAtrPctVsDumpPct: number;
    relativeSpreadPct: number;
    relativeSpreadAtr: number;
    grade: "strong" | "partial" | "weak";
  };
  regimes: RegimeRow[];
  histPct: HistogramBin[];
  histAtr: HistogramBin[];
  events: DipEvent[];
  chart: ChartCandle[];
  volume: VolumeVerdict;
  backtest: BacktestReport;
  edge: EdgeReport;
  depth: DepthReport;
  trendCompare: TrendCompareReport;
  osc: OscReport;
  recovery: RecoveryReport;
  emaTune: EmaTuneReport;
  maType: MaTypeReport;
  bb: BbWidthReport;
};

export type VolumeMini = {
  n: number;
  expectancy: number;
  dumpShare: number;
  nSkipped: number;
};

export type VolumeVerdict = {
  period: number;
  dumpMult: number;
  recoveredP50: number;
  failedP50: number;
  recoveryHigh: number;
  recoveryLow: number;
  nHigh: number;
  nLow: number;
  climaxMult: number;
  recoveryClimax: number;
  nClimax: number;
  weak: boolean;
  deltaE: number;
  skipShare: number;
  nSkip: number;
  nBase: number;
  volP50Sma: number;
  volP50Stop: number;
  dumpShare: number;
  books: {
    upAny: VolumeMini;
    upSkip: VolumeMini;
    allAny: VolumeMini;
    allSkip: VolumeMini;
  };
};

export type Trade = {
  entryT: number;
  exitT: number;
  entry: number;
  exit: number;
  pnlPct: number;
  bars: number;
  durationMin: number;
  reason: "sma" | "stop" | "time" | "tp";
  uptrend: boolean;
  volRatio: number;
};

export type EquityPoint = {
  t: number;
  eq: number;
};

export type BacktestRun = {
  label: string;
  entryAtr: number;
  stopAtr: number;
  uptrendOnly: boolean;
  trendFilter: TrendFilter;
  skipVolMult: number;
  requireVolMult: number;
  volMode: "any" | "skip" | "require";
  nSkipped: number;
  nSkipForecast: number;
  forecastOn: boolean;
  tpShare: number;
  feeBps: number;
  n: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  totalPnlPct: number;
  compoundPct: number;
  maxDd: number;
  avgBars: number;
  avgMin: number;
  buyHoldPct: number;
  trades: Trade[];
  equity: EquityPoint[];
  volP50Sma: number;
  volP50Stop: number;
  dumpShare: number;
  stopShare: number;
  smaShare: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type BacktestReport = {
  feeBps: number;
  stopAtr: number;
  lookforwardBars: number;
  volPeriod: number;
  runs: BacktestRun[];
  bestLabel: string;
};

export type EdgeCell = {
  entryAtr: number;
  trend: TrendFilter;
  n: number;
  winRate: number;
  expectancy: number;
  profitFactor: number;
  compoundPct: number;
  maxDd: number;
  stopShare: number;
  smaShare: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type EdgeReport = {
  depths: number[];
  cells: EdgeCell[];
  atrLift: number;
  trendLift: number;
  downLift: number;
  combinedLift: number;
  stopDelta: number;
  best: EdgeCell;
  verdict: "edge" | "filter" | "none";
};

export type DepthPoint = {
  entryAtr: number;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  smaShare: number;
  tpShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
  nSkipForecast: number;
  avgBars: number;
};

export type DepthReport = {
  depths: number[];
  emaPeriod: number;
  up: DepthPoint[];
  forecast: DepthPoint[];
  all: DepthPoint[];
  peakUp: DepthPoint;
  peakForecast: DepthPoint;
  slopeUp: number;
  slopeAll: number;
  deltaE: number;
  occupancyDrop: number;
  skipFloor: number;
  verdict: "sweet-spot" | "deeper-helps" | "shallow-better" | "flat";
};

export type BbBook = {
  key: "all" | "squeeze" | "mid" | "expand" | "belowLower";
  label: string;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type BbWidthReport = {
  period: number;
  k: number;
  rankBars: number;
  squeezeP: number;
  expandP: number;
  entryAtr: number;
  emaPeriod: number;
  books: BbBook[];
  corrWidthAtrPct: number;
  corrWidthRecovery: number;
  squeezeLift: number;
  expandLift: number;
  deltaSE: number;
  winner: BbBook["key"] | "tie";
  verdict: "squeeze" | "expand" | "below" | "proxy" | "none";
};

export type TrendBook = {
  key: "all" | "sma50" | "ema20" | "and";
  label: string;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type TrendBucket = {
  key: "both" | "smaOnly" | "emaOnly" | "neither";
  label: string;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
};

export type TrendCompareReport = {
  entryAtr: number;
  smaPeriod: number;
  emaPeriod: number;
  agreeRate: number;
  books: TrendBook[];
  buckets: TrendBucket[];
  deltaE: number;
  winner: "sma50" | "ema20" | "and" | "tie";
};

export type OscBookKey =
  | "base"
  | "fast"
  | "slow"
  | "cti"
  | "combo"
  | "fastSlow"
  | "fastCti"
  | "slowCti"
  | "ctiPos";

export type OscBook = {
  key: OscBookKey;
  label: string;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  compoundPct: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
};

export type OscReport = {
  entryAtr: number;
  rsiFast: number;
  rsiSlow: number;
  ctiPeriod: number;
  rsiSlowMin: number;
  ctiMax: number;
  books: OscBook[];
  pairs: OscBook[];
  anti: OscBook;
  deltaE: number;
  winner: OscBookKey | "tie";
  emaPeriod: number;
};

export type EmaTuneCell = {
  period: number;
  n: number;
  expectancy: number;
  winRate: number;
  stopShare: number;
  firstE: number;
  secondE: number;
  nFirst: number;
  nSecond: number;
  stability: number;
};

export type EmaTuneReport = {
  entryAtr: number;
  baseline: number;
  winner: number;
  cells: EmaTuneCell[];
  deltaE: number;
  deltaWr: number;
  baselineCell: EmaTuneCell;
  winnerCell: EmaTuneCell;
};

export type MaPair = {
  period: number;
  ema: EmaTuneCell;
  sma: EmaTuneCell;
  deltaE: number;
  deltaWr: number;
};

export type MaTypeReport = {
  entryAtr: number;
  pairs: MaPair[];
  emaWins: number;
  smaWins: number;
  bestEma: EmaTuneCell;
  bestSma: EmaTuneCell;
  matched: MaPair;
  winner: "ema" | "sma" | "tie";
  deltaBestE: number;
  deltaBestWr: number;
};

export type RecoveryTrend = "ema" | "all" | "down";

export type RecoveryCell = {
  trend: RecoveryTrend;
  depthLo: number;
  depthHi: number | null;
  n: number;
  nRec: number;
  recRate: number;
  p50: number;
  p75: number;
  p90: number;
};

export type RecoveryForecast = {
  source: "live" | "typical";
  trend: RecoveryTrend;
  depthLo: number;
  depthHi: number | null;
  n: number;
  recRate: number;
  p50: number;
  p75: number;
  p90: number;
};

export type RecoveryReport = {
  intervalMin: number;
  depths: number[];
  cells: RecoveryCell[];
  corr: number;
  corrEma: number;
  corrDown: number;
  slope: number;
  intercept: number;
  p50All: number;
  p50Ema: number;
  p50Down: number;
  trendLift: number;
  forecast: RecoveryForecast | null;
  emaPeriod: number;
};

export type StudyRequest = {
  symbol: string;
  interval: Interval;
  days: number;
};
