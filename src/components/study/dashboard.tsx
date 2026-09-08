import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { loadStudy } from "@/lib/market/load-study";
import { DAY_OPTIONS, INTERVALS, MIN_SIGNAL_ATR, SYMBOLS } from "@/lib/market/symbols";
import type { GroupStats, Interval, StudyResult, TrendFilter } from "@/lib/market/types";
import { formatAtrMul, formatDateVn, formatInt, formatNum, formatPct, formatPrice, formatSignedPct, formatTimeVn, minutesLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { CandleChart } from "@/components/study/candle-chart";
import { Histogram } from "@/components/study/histogram";
import { BacktestPanel } from "@/components/study/backtest-panel";
import { EdgePanel } from "@/components/study/edge-panel";
import { DepthPanel } from "@/components/study/depth-panel";
import { BbPanel } from "@/components/study/bb-panel";
import { TrendComparePanel } from "@/components/study/trend-compare-panel";
import { OscPanel } from "@/components/study/osc-panel";
import { RecoveryPanel } from "@/components/study/recovery-panel";
import { EmaTunePanel } from "@/components/study/ema-tune-panel";
import { MaTypePanel } from "@/components/study/ma-type-panel";
import { ScannerPanel } from "@/components/study/scanner-panel";
import { cn } from "@/lib/cn";

class PanelGuard extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null };
  static getDerivedStateFromError(err: unknown) {
    return { message: err instanceof Error ? err.message : "Không vẽ được bảng" };
  }
  render() {
    if (this.state.message) {
      return (
        <div className="flex items-start gap-3 rounded-xl bg-surface px-4 py-3 text-sm shadow-[var(--shadow-border)]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-dip" />
          <p className="text-muted">{this.state.message}. Bấm Tải lại nến.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Dashboard() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState<Interval>("5m");
  const [days, setDays] = useState(30);
  const [trend, setTrend] = useState<TrendFilter>("all");
  const [study, setStudy] = useState<StudyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadStudy({ data: { symbol, interval, days } })
      .then((res) => {
        if (!cancelled) setStudy(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không tải được dữ liệu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, interval, days, tick]);

  const stats: GroupStats | null = study ? study.stats[trend] : null;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8">
        <Header />
        <ScannerPanel activeSymbol={symbol} onPick={setSymbol} />
        <Controls
          symbol={symbol}
          interval={interval}
          days={days}
          loading={loading}
          onSymbol={setSymbol}
          onInterval={setInterval}
          onDays={setDays}
          onRefresh={() => setTick((n) => n + 1)}
        />
        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-surface px-4 py-3 text-sm shadow-[var(--shadow-border)]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-dip" />
            <p className="text-muted">{error}</p>
          </div>
        )}
        {loading && !study && <LoadingState />}
        {study && stats && (
          <PanelGuard>
            <Results study={study} stats={stats} trend={trend} onTrend={setTrend} />
          </PanelGuard>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.18em] text-sma uppercase">SMA15 Lab</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-fg sm:text-4xl">
          Giá sập dưới SMA15 bao nhiêu trước khi hồi?
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-normal text-muted">
          Tải nến thật, đo độ sâu tối đa dưới SMA15 trên từng nhịp sập, rồi so sánh đơn vị
          phần trăm với bội số ATR — xem cái nào ổn định hơn để vào lệnh mean-reversion.
        </p>
      </div>
    </header>
  );
}

function Controls(props: {
  symbol: string;
  interval: Interval;
  days: number;
  loading: boolean;
  onSymbol: (v: string) => void;
  onInterval: (v: Interval) => void;
  onDays: (v: number) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:grid-cols-4 sm:p-4">
      <SelectField
        label="Cặp"
        value={props.symbol}
        onChange={props.onSymbol}
        options={SYMBOLS.map((s) => ({ value: s.id, label: `${s.label} / USDT` }))}
      />
      <SelectField
        label="Khung nến"
        value={props.interval}
        onChange={(v) => props.onInterval(v as Interval)}
        options={INTERVALS.map((s) => ({ value: s.id, label: s.label }))}
      />
      <SelectField
        label="Lịch sử"
        value={String(props.days)}
        onChange={(v) => props.onDays(Number(v))}
        options={DAY_OPTIONS.map((d) => ({ value: String(d), label: `${d} ngày` }))}
      />
      <div className="flex items-end">
        <Button
          variant="outline"
          className="w-full"
          onClick={props.onRefresh}
          disabled={props.loading}
        >
          {props.loading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          Tải lại nến
        </Button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
        <div className="h-24 animate-pulse rounded-lg bg-surface" />
      </div>
      <p className="text-sm text-muted">Đang tải nến và đo các nhịp sập dưới SMA15…</p>
    </div>
  );
}

function Results({
  study,
  stats,
  trend,
  onTrend,
}: {
  study: StudyResult;
  stats: GroupStats;
  trend: TrendFilter;
  onTrend: (t: TrendFilter) => void;
}) {
  const v = study.atrVerdict;
  const live = study.live;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <Hero study={study} stats={stats} />

      <LiveStrip study={study} />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Số nhịp sập"
          value={formatInt(stats.nEvents)}
          hint={`${formatInt(stats.nSignal)} nhịp ≥ ${MIN_SIGNAL_ATR}× ATR`}
        />
        <Kpi
          label="Tỷ lệ hồi ≤ 4 giờ"
          value={formatPct(stats.recoveryRate * 100, 1)}
          hint={`1 nến: ${formatPct(stats.recoveredWithin.c1 * 100, 0)}`}
        />
        <Kpi
          label="Thời gian hồi (P50)"
          value={minutesLabel(stats.durationMin.p50)}
          hint={`${formatNum(stats.durationCandles.p50, 0)} nến`}
        />
        <Kpi
          label="Bounce từ đáy (P50)"
          value={formatPct(stats.bouncePct.p50)}
          hint={`P75 ${formatPct(stats.bouncePct.p75)}`}
        />
      </section>

      <TrendTabs trend={trend} onTrend={onTrend} stats={study.stats} />

      <section className="overflow-hidden rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
        <CandleChart candles={study.chart} symbol={study.symbol} />
        <p className="mt-2 px-1 text-xs text-subtle">
          Vùng đỏ nhạt: nhịp đang dưới SMA15. Dữ liệu {study.source} · {formatInt(study.candleCount)} nến ·{" "}
          {formatDateVn(study.from)} → {formatTimeVn(study.to)}
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Histogram
          title="Phân phối độ sâu (%)"
          unit={`(SMA − low) / SMA, nhịp hồi sâu ≥ ${MIN_SIGNAL_ATR}× ATR`}
          bins={stats.histPct}
          quantiles={stats.pct}
          formatTick={(n) => formatPct(n)}
        />
        <Histogram
          title="Phân phối độ sâu (ATR)"
          unit={`(SMA − low) / ATR14, cùng lọc ≥ ${MIN_SIGNAL_ATR}× ATR`}
          bins={stats.histAtr}
          quantiles={stats.atr}
          formatTick={(n) => `${formatNum(n, 2)}×`}
        />
      </section>

      <AtrVerdict study={study} stats={stats} />

      <RecoveryPanel report={study.recovery} />

      <EmaTunePanel report={study.emaTune} />

      <MaTypePanel report={study.maType} />

      <EdgePanel report={study.edge} />

      <DepthPanel report={study.depth} />

      {study.bb ? <BbPanel report={study.bb} live={study.live} /> : null}

      <TrendComparePanel report={study.trendCompare} />

      <OscPanel report={study.osc} live={study.live} />

      <VolumePanel volume={study.volume} live={study.live} />

      <BacktestPanel report={study.backtest} />

      {study.regimes.length > 0 && <RegimeTable rows={study.regimes} />}

      <EventTable events={study.events} />

      <Method study={study} live={live} v={v} />
    </div>
  );
}

function Hero({ study, stats }: { study: StudyResult; stats: GroupStats }) {
  return (
    <section className="grid gap-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:grid-cols-2 sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">
          Trung vị trước khi hồi · {study.symbol} · {study.interval} · lọc nhiễu
        </p>
        <p className="mt-3 font-display text-5xl font-medium tracking-tight text-fg tabular-nums sm:text-6xl">
          {formatPct(stats.pct.p50)}
        </p>
        <p className="mt-2 text-sm text-muted">
          Vùng thường gặp P25–P75: {formatPct(stats.pct.p25)} – {formatPct(stats.pct.p75)}. Sập sâu P90:{" "}
          {formatPct(stats.pct.p90)}.
        </p>
      </div>
      <div className="sm:border-l sm:border-border sm:pl-6">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">Cùng sự kiện, đo bằng ATR</p>
        <p className="mt-3 font-display text-5xl font-medium tracking-tight text-sma tabular-nums sm:text-6xl">
          {Number.isFinite(stats.atr.p50) ? `${formatNum(stats.atr.p50, 2)}×` : "—"}
        </p>
        <p className="mt-2 text-sm text-muted">
          P25–P75: {formatAtrMul(stats.atr.p25)} – {formatAtrMul(stats.atr.p75)}. P90:{" "}
          {formatAtrMul(stats.atr.p90)}.
        </p>
      </div>
    </section>
  );
}

function LiveStrip({ study }: { study: StudyResult }) {
  const live = study.live;
  const below = live.below;
  const p = live.pctileAmongRecovered;
  const fc = study.recovery.forecast;
  let hint = "Giá đang trên SMA15.";
  if (below && live.volClimax) {
    hint = `Volume climax ${formatNum(live.volRatio, 1)}× SMA20 — đối chiếu backtest chỉ-xả 2.5×.`;
  } else if (below && live.volDump) {
    hint = `Volume xả ${formatNum(live.volRatio, 1)}× — chưa tới ngưỡng climax 2.5×.`;
  } else if (below && p != null) {
    if (p < 40) hint = "Sập còn nông so với lịch sử — chưa tới vùng P50.";
    else if (p < 75) hint = "Đang trong vùng độ sâu điển hình trước khi hồi.";
    else hint = "Sâu hơn phần lớn nhịp hồi — hoặc mean-reversion mạnh, hoặc gãy trend.";
  }
  if (below && fc && Number.isFinite(fc.p50) && fc.p50 <= 2) {
    hint = `P50 hồi ${formatNum(fc.p50, 0)} nến — luật mới bỏ lệnh (ngưỡng 2).`;
  } else if (below && fc && Number.isFinite(fc.p50)) {
    hint = `${hint} Ước lượng hồi P50 ${formatNum(fc.p50, 0)} nến (P75 ${formatNum(fc.p75, 0)}). TP ${formatNum(Math.max(1, Math.round(fc.p50) - 2), 0)} nến.`;
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Activity className={cn("size-4", below ? "text-dip" : "text-recovery")} />
        <span className="font-medium">{study.symbol}</span>
        <span className="font-mono tabular-nums">{formatPrice(live.last)}</span>
        <span className="text-subtle">SMA15 {live.sma != null ? formatPrice(live.sma) : "—"}</span>
        <span className={cn("text-subtle", live.aboveSma50 ? "text-recovery" : "text-dip")}>
          SMA50 {live.aboveSma50 ? "up" : "down"}
        </span>
        <span className={cn("text-subtle", live.aboveEma20 ? "text-recovery" : "text-dip")}>
          EMA{live.emaPeriod} {live.aboveEma20 ? "up" : "down"}
        </span>
        <span className="text-subtle">
          RSI7 {live.rsiFast != null ? formatNum(live.rsiFast, 0) : "—"}
        </span>
        <span className="text-subtle">
          RSI21 {live.rsiSlow != null ? formatNum(live.rsiSlow, 0) : "—"}
        </span>
        <span className={cn("text-subtle", live.cti != null && live.cti > 0 ? "text-dip" : "text-recovery")}>
          CTI {live.cti != null ? formatNum(live.cti, 2) : "—"}
        </span>
        <span className={cn("text-subtle", live.bbSqueeze ? "text-recovery" : live.bbExpand ? "text-dip" : "")}>
          BB {live.bbWidthPct != null ? formatPct(live.bbWidthPct) : "—"}
          {live.bbSqueeze ? " squeeze" : live.bbExpand ? " rộng" : ""}
        </span>
      </div>
      <p className="text-sm text-muted">
        {below
          ? `Đang dưới SMA ${formatPct(live.undershootPct)} · ${formatAtrMul(live.undershootAtr)}${
              p != null ? ` · P${formatNum(p, 0)} lịch sử` : ""
            }. ${hint}`
          : hint}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 shadow-[var(--shadow-border)]">
      <p className="text-xs text-subtle">{label}</p>
      <p className="mt-1 font-mono text-xl text-fg tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function TrendTabs({
  trend,
  onTrend,
  stats,
}: {
  trend: TrendFilter;
  onTrend: (t: TrendFilter) => void;
  stats: StudyResult["stats"];
}) {
  const items: { id: TrendFilter; label: string; n: number }[] = [
    { id: "all", label: "Mọi nhịp", n: stats.all.nEvents },
    { id: "up", label: "Uptrend (trên SMA50)", n: stats.up.nEvents },
    { id: "down", label: "Downtrend", n: stats.down.nEvents },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onTrend(it.id)}
          className={cn(
            "h-11 rounded-md px-4 text-sm transition-[background-color,color] duration-150",
            trend === it.id ? "bg-accent text-accent-fg" : "bg-surface text-muted hover:text-fg",
          )}
        >
          {it.label}
          <span className="ml-2 font-mono text-xs tabular-nums opacity-70">{it.n}</span>
        </button>
      ))}
    </div>
  );
}

function AtrVerdict({ study, stats }: { study: StudyResult; stats: GroupStats }) {
  const v = study.atrVerdict;
  const title =
    v.grade === "strong"
      ? "ATR chuẩn hóa tốt hơn %"
      : v.grade === "partial"
        ? "ATR chuẩn hóa được một phần"
        : "ATR chưa ổn định hơn % trên mẫu này";
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Chuẩn hóa ATR</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{title}</h2>
      </div>
      <p className="max-w-3xl text-sm leading-normal text-muted">
        Hệ số biến thiên (CV = σ/μ) của độ sâu theo % là{" "}
        <span className="font-mono text-fg tabular-nums">{formatNum(v.cvPct, 2)}</span>, theo ATR là{" "}
        <span className="font-mono text-fg tabular-nums">{formatNum(v.cvAtr, 2)}</span>
        {v.atrMoreStable
          ? " — ATR biến động ít hơn, nên dùng làm ngưỡng vào lệnh khi volatility đổi."
          : " — trên mẫu này % chưa lệch nhiều so với ATR."}{" "}
        Tương quan ATR% (biến động hiện tại) với độ sâu % là{" "}
        <span className="font-mono text-fg tabular-nums">{formatNum(v.corrAtrPctVsDumpPct, 2)}</span>
        {v.corrAtrPctVsDumpPct >= 0.45
          ? ": khi ATR lớn, giá sập sâu hơn theo %, đúng với giả thuyết chuẩn hóa."
          : "."}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <Mini
          k="Ngưỡng gợi ý (P50 ATR)"
          v={formatAtrMul(stats.atr.p50)}
          d="Chờ sập tới mức này dưới SMA15 rồi mới fade."
        />
        <Mini
          k="Quy đổi % hiện tại"
          v={
            study.live.atrPct != null && Number.isFinite(stats.atr.p50)
              ? formatPct(study.live.atrPct * stats.atr.p50)
              : "—"
          }
          d="P50 ATR × ATR% nến cuối — % tương đương lúc này, không phải % cố định."
        />
        <Mini
          k="Đáy ngay nến đầu"
          v={formatPct(stats.firstCandleIsTroughRate * 100, 0)}
          d="Tỷ lệ nhịp hồi có low thấp nhất ngay cây nến xuyên SMA."
        />
      </div>
      <p className="text-sm text-muted">
        Spread tương đối P10–P90 / P50: % = {formatNum(v.relativeSpreadPct, 2)}, ATR ={" "}
        {formatNum(v.relativeSpreadAtr, 2)}.{" "}
        {v.relativeSpreadAtr < v.relativeSpreadPct
          ? "Dải ATR hẹp hơn — cùng một ngưỡng 0.4–0.7× ATR dùng được nhiều chế độ biến động."
          : "Dải hai đơn vị gần nhau; vẫn nên xem bảng chế độ ATR% bên dưới."}
      </p>
    </section>
  );
}

function Mini({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{k}</p>
      <p className="mt-1 font-mono text-lg text-fg tabular-nums">{v}</p>
      <p className="mt-1 text-xs leading-snug text-muted">{d}</p>
    </div>
  );
}

function RegimeTable({ rows }: { rows: StudyResult["regimes"] }) {
  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="px-5 py-4">
        <h2 className="text-sm font-medium">Độ sâu theo chế độ biến động (tứ phân vị ATR%)</h2>
        <p className="mt-1 text-xs text-muted">
          Nếu cột % tăng theo ATR% trong khi cột ×ATR đứng yên — ATR đang chuẩn hóa đúng.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-5 py-2 font-medium">Chế độ</th>
              <th className="px-5 py-2 font-medium">ATR%</th>
              <th className="px-5 py-2 font-medium">n</th>
              <th className="px-5 py-2 font-medium">P50 %</th>
              <th className="px-5 py-2 font-medium">P50 ×ATR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="px-5 py-2.5">{r.label}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{formatPct(r.atrPctMid)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{r.n}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{formatPct(r.medPct)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{formatAtrMul(r.medAtr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function VolumePanel({
  volume,
  live,
}: {
  volume: StudyResult["volume"];
  live: StudyResult["live"];
}) {
  const { upAny, upSkip, allAny, allSkip } = volume.books;
  const title = volume.weak
    ? "Lọc volume gần như không đổi setup tốt nhất"
    : Number.isFinite(volume.deltaE) && volume.deltaE > 0.03
      ? "Tránh xả có cải thiện expectancy"
      : "Volume không tách được lệnh thắng / thua";
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Lọc volume</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          1.5× ATR + uptrend đã loại gần hết nến climax trước khi volume kịp lọc: chỉ {formatInt(volume.nSkip)} / {formatInt(volume.nBase + volume.nSkip)} tín hiệu bị bỏ
          ({formatPct(volume.skipShare * 100, 1)}). Delta E = {formatSignedPct(volume.deltaE, 3)} so với mọi vol.
          Vol P50 lệnh hồi SMA {Number.isFinite(volume.volP50Sma) ? `${formatNum(volume.volP50Sma, 2)}×` : "—"} vs lệnh dính stop{" "}
          {Number.isFinite(volume.volP50Stop) ? `${formatNum(volume.volP50Stop, 2)}×` : "—"} — gần như trùng.
          {" "}Vol nến cuối {Number.isFinite(live.volRatio) ? `${formatNum(live.volRatio, 2)}×` : "—"}.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini
          k="1.5× up · mọi vol"
          v={upAny.n ? formatSignedPct(upAny.expectancy) : "—"}
          d={upAny.n ? `${formatInt(upAny.n)} lệnh · climax ${formatPct((upAny.dumpShare || 0) * 100, 0)}` : ""}
        />
        <Mini
          k="1.5× up · tránh 2.5×"
          v={upSkip.n || upSkip.nSkipped ? formatSignedPct(upSkip.expectancy) : "—"}
          d={`${formatInt(upSkip.n)} lệnh · bỏ ${formatInt(upSkip.nSkipped)}`}
        />
        <Mini
          k="1.5× all · mọi vol"
          v={allAny.n ? formatSignedPct(allAny.expectancy) : "—"}
          d={allAny.n ? `${formatInt(allAny.n)} lệnh · E ${formatSignedPct(allAny.expectancy)}` : ""}
        />
        <Mini
          k="1.5× all · tránh 2.5×"
          v={allSkip.n || allSkip.nSkipped ? formatSignedPct(allSkip.expectancy) : "—"}
          d={`${formatInt(allSkip.n)} lệnh · bỏ ${formatInt(allSkip.nSkipped)}`}
        />
      </div>
    </section>
  );
}

function EventTable({ events }: { events: StudyResult["events"] }) {
  const rows = useMemo(() => events.slice(0, 40), [events]);
  return (
    <section className="overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-border)]">
      <div className="px-5 py-4">
        <h2 className="text-sm font-medium">Nhịp sập gần đây</h2>
        <p className="mt-1 text-xs text-muted">40 sự kiện mới nhất. Hồi = close trở lại trên SMA15 trong 4 giờ.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-2xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-5 py-2 font-medium">Bắt đầu</th>
              <th className="px-5 py-2 font-medium">Độ sâu %</th>
              <th className="px-5 py-2 font-medium">×ATR</th>
              <th className="px-5 py-2 font-medium">Hồi</th>
              <th className="px-5 py-2 font-medium">Bounce</th>
              <th className="px-5 py-2 font-medium">Vol</th>
              <th className="px-5 py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={`${e.startT}-${e.endT}`} className="border-t border-border">
                <td className="px-5 py-2.5 font-mono text-xs tabular-nums">{formatTimeVn(e.startT)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{formatPct(e.undershootPct)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums">{formatNum(e.undershootAtr, 2)}</td>
                <td className={cn("px-5 py-2.5", e.recovered ? "text-recovery" : "text-dip")}>
                  {e.recovered ? `${e.recoveryCandles} nến` : "không"}
                </td>
                <td className="px-5 py-2.5 font-mono tabular-nums">
                  {e.bouncePct == null ? "—" : formatPct(e.bouncePct)}
                </td>
                <td className={cn("px-5 py-2.5 font-mono tabular-nums", e.volumeDump && "text-dip")}>
                  {Number.isFinite(e.volRatioTrough) ? `${formatNum(e.volRatioTrough, 1)}×` : "—"}
                  {e.volumeDump && e.volRatioTrough >= 2.5 ? " climax" : e.volumeDump ? " xả" : ""}
                </td>
                <td className="px-5 py-2.5 text-muted">{e.uptrend ? "Up" : "Down"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Method({
  study,
  live,
  v,
}: {
  study: StudyResult;
  live: StudyResult["live"];
  v: StudyResult["atrVerdict"];
}) {
  return (
    <section className="rounded-xl bg-surface px-5 py-5 text-sm leading-normal text-muted shadow-[var(--shadow-border)] sm:px-6">
      <h2 className="text-fg font-medium">Cách đo</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>
          Nến {study.interval} từ {study.source}. SMA{study.smaPeriod} trên close. ATR{study.atrPeriod} Wilder.
        </li>
        <li>
          Một nhịp sập bắt đầu khi low xuyên dưới SMA15. Độ sâu thống kê chỉ lấy nhịp hồi sâu ≥ 0.25× ATR (lọc wick nhiễu). Độ sâu là khoảng cách lớn nhất (SMA − low) trong nhịp,
          tính trên SMA/ATR tại từng nến — không lấy SMA lúc vừa xuyên.
        </li>
        <li>
          Hồi khi close trở lại ≥ SMA15 trong {study.lookforwardHours} giờ ({study.lookforwardCandles} nến). Nhịp
          không hồi bị loại khỏi phân phối “trước khi hồi”, nhưng vẫn tính tỷ lệ thất bại.
        </li>
        <li>
          Uptrend mặc định: close trên SMA50. Trend filter live dùng EMA thắng từ lưới tối ưu (mốc EMA20).
        </li>
        <li>
          ATR “chuẩn hóa được” nếu CV và dải P10–P90 của bội số ATR hẹp hơn % , và ATR% tương quan với độ sâu %.
          Grade hiện tại: {v.grade}. ATR nến cuối {live.atr != null ? formatPrice(live.atr) : "—"} (
          {live.atrPct != null ? formatPct(live.atrPct) : "—"} giá).
        </li>
        <li>
          Edge ATR + trend: lưới 1.0 / 1.25 / 1.5× ATR × up / all / down, không lọc volume. Walk-forward chia nến làm hai nửa theo thời gian. Expectancy sau phí 4 bps/chiều.
        </li>
        <li>
          RSI fast {study.osc.rsiFast} / slow {study.osc.rsiSlow} Wilder + CTI{study.osc.ctiPeriod}. Combo AND trên nền fade EMA{study.live.emaPeriod}.
        </li>
        <li>
          Hồi: lưới 5 độ sâu ATR × EMA{study.live.emaPeriod} up / mọi / down. P50 số nến close trở lại SMA15. Pearson và hồi quy tuyến tính nến ≈ a + b × ATR trên nhịp hồi.
        </li>
        <li>
          Tối ưu EMA: quét 8–50, chọn period có min(E nửa đầu, E nửa sau) lớn nhất khi cả hai nửa dương. Độ chính xác = win rate cuốn close trên EMA đó.
        </li>
        <li>
          EMA vs SMA: cùng fade, cùng period. Không so SMA50 với EMA ngắn. Thắng kiểu = cuốn tối ưu period của mỗi loại, theo min walk-forward.
        </li>
        <li>
          Backtest: bỏ lệnh khi P50 nến hồi ≤ 2. TP đóng close sau P50 trừ 2 nến; stop 1.5× ATR; thoát sớm nếu close về SMA15 trước đó. Lưới P50 lấy từ cùng mẫu — in-sample.
        </li>
        <li>
          Độ sâu ATR: quét 0.5–2.5× trên fade EMA{study.live.emaPeriod} up (SMA-exit và TP P50−2) đối chiếu mọi trend. Đỉnh = max E với ít nhất 12 lệnh; occupancy = n tại 0.5× chia n tại đỉnh.
        </li>
        {study.bb ? (
          <li>
            Bollinger: SMA{study.bb.period} ± {study.bb.k}σ, width = (upper − lower) / mid. Squeeze = percentile nhân quả trên {study.bb.rankBars} nến ≤ {Math.round(study.bb.squeezeP * 100)}. Fade 1.25× ATR, EMA{study.live.emaPeriod} up. Pearson width vs ATR% để bắt proxy.
          </li>
        ) : null}
      </ol>
      <p className="mt-4 text-xs text-subtle">
        Đây là thống kê in-sample trên 30 ngày gần nhất, không phải lời khuyên đầu tư. Nửa mẫu walk-forward không thay thế out-of-sample.
      </p>
    </section>
  );
}
