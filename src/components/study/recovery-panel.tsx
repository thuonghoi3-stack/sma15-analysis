import type { RecoveryCell, RecoveryReport, RecoveryTrend } from "@/lib/market/types";
import { formatInt, formatNum, formatPct, minutesLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

function depthLabel(cell: RecoveryCell): string {
  if (cell.depthHi == null) return `${cell.depthLo}× trở lên`;
  return `${cell.depthLo}–${cell.depthHi}×`;
}

function titleOf(report: RecoveryReport): string {
  if (Number.isFinite(report.corr) && report.corr >= 0.6) {
    return "Độ sâu ATR quyết định số nến hồi; trend chỉ tăng tốc wick nông";
  }
  if (Number.isFinite(report.trendLift) && report.trendLift <= -1) {
    return `Uptrend EMA${report.emaPeriod} hồi nhanh hơn downtrend trên mẫu này`;
  }
  return "Số nến hồi chưa tách rõ theo ATR hay trend trên mẫu này";
}

function tone(cell: RecoveryCell): string {
  if (!Number.isFinite(cell.p50) || cell.nRec < 8) return "bg-elevated text-muted";
  if (cell.p50 <= 3) return "bg-up/20 text-fg";
  if (cell.p50 <= 8) return "bg-elevated text-fg";
  return "bg-down/15 text-fg";
}

function barsLabel(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${formatNum(n, 0)} nến`;
}

export function RecoveryPanel({ report }: { report: RecoveryReport }) {
  const ema = `EMA${report.emaPeriod}`;
  const depths = report.depths;
  const fade = report.cells.find((c) => c.trend === "ema" && c.depthLo === 1);
  const fc = report.forecast;
  const rows: { key: RecoveryTrend; label: string }[] = [
    { key: "ema", label: `${ema} up` },
    { key: "all", label: "Mọi trend" },
    { key: "down", label: `${ema} down` },
  ];
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Nến hồi</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Pearson độ sâu ATR vs số nến hồi = {formatNum(report.corr, 2)} ({ema} {formatNum(report.corrEma, 2)} · down{" "}
          {formatNum(report.corrDown, 2)}). Hồi ≈ {formatNum(report.intercept, 1)} + {formatNum(report.slope, 1)} × ATR.
          Δ P50 {ema} − down = {formatNum(report.trendLift, 1)} nến. Chỉ nhịp sâu từ 0.25× ATR, hồi trong 4 giờ.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="P50 mọi trend" v={barsLabel(report.p50All)} d={`${minutesLabel(report.p50All * report.intervalMin)}`} />
        <Mini k={`P50 ${ema} up`} v={barsLabel(report.p50Ema)} d={`close trên ${ema} lúc xuyên`} />
        <Mini k={`P50 ${ema} down`} v={barsLabel(report.p50Down)} d={`close dưới ${ema} lúc xuyên`} />
        <Mini
          k="Mỗi 1× ATR thêm"
          v={Number.isFinite(report.slope) ? `+${formatNum(report.slope, 1)} nến` : "—"}
          d="hồi tuyến tính theo độ sâu"
        />
      </div>

      {fc ? (
        <div className="rounded-md bg-elevated px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-subtle uppercase">
            {fc.source === "live" ? "Ước lượng nhịp hiện tại" : "Ước lượng nhịp điển hình"}
          </p>
          <p className="mt-1 font-mono text-2xl tabular-nums text-fg">
            {barsLabel(fc.p50)}
            <span className="ml-2 text-sm text-muted">
              P75 {barsLabel(fc.p75)} · {minutesLabel(fc.p50 * report.intervalMin)}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Ô {fc.trend === "ema" ? `${ema} up` : fc.trend === "down" ? `${ema} down` : "mọi trend"} ·{" "}
            {formatNum(fc.depthLo, 2)}
            {fc.depthHi != null ? `–${formatNum(fc.depthHi, 2)}` : "+"}× ATR · {formatInt(fc.n)} nhịp · hồi{" "}
            {formatPct((fc.recRate || 0) * 100, 0)}.
            {fade && Number.isFinite(fade.p50)
              ? ` Fade 1.0–1.5× trên ${ema}: P50 ${barsLabel(fade.p50)}.`
              : ""}
          </p>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="grid min-w-[36rem] grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] gap-2">
          <div />
          {depths.map((d) => {
            const sample = report.cells.find((c) => c.trend === "all" && c.depthLo === d);
            return (
              <p key={d} className="px-1 text-xs font-medium tracking-wide text-subtle uppercase">
                {sample ? depthLabel(sample) : `${d}×`}
              </p>
            );
          })}
          {rows.map((row) => (
            <Row key={row.key} report={report} trend={row.key} label={row.label} forecast={fc} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Row({
  report,
  trend,
  label,
  forecast,
}: {
  report: RecoveryReport;
  trend: RecoveryTrend;
  label: string;
  forecast: RecoveryReport["forecast"];
}) {
  return (
    <>
      <p className="flex items-center text-xs text-muted">{label}</p>
      {report.depths.map((d) => {
        const cell = report.cells.find((c) => c.trend === trend && c.depthLo === d);
        const active =
          forecast != null &&
          cell != null &&
          forecast.trend === cell.trend &&
          forecast.depthLo === cell.depthLo;
        return (
          <div
            key={`${trend}-${d}`}
            className={cn("rounded-md px-2 py-2", tone(cell ?? emptyCell(trend, d)), active && "shadow-[var(--shadow-border-hover)]")}
          >
            <p className="font-mono text-sm tabular-nums">{cell ? barsLabel(cell.p50) : "—"}</p>
            <p className="mt-0.5 text-xs text-subtle">
              {cell ? `${formatInt(cell.n)} · P75 ${barsLabel(cell.p75)}` : "—"}
            </p>
          </div>
        );
      })}
    </>
  );
}

function emptyCell(trend: RecoveryTrend, lo: number): RecoveryCell {
  return {
    trend,
    depthLo: lo,
    depthHi: null,
    n: 0,
    nRec: 0,
    recRate: NaN,
    p50: NaN,
    p75: NaN,
    p90: NaN,
  };
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
