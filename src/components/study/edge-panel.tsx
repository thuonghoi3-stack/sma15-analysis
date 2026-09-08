import type { EdgeCell, EdgeReport, TrendFilter } from "@/lib/market/types";
import { formatInt, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

const TREND_ROWS: { key: TrendFilter; label: string }[] = [
  { key: "up", label: "Uptrend SMA50" },
  { key: "all", label: "Mọi trend" },
  { key: "down", label: "Downtrend" },
];

function cellOf(report: EdgeReport, atr: number, trend: TrendFilter): EdgeCell | undefined {
  return report.cells.find((c) => c.entryAtr === atr && c.trend === trend);
}

function titleOf(report: EdgeReport): string {
  if (report.verdict === "edge") return "ATR + uptrend có expectancy dương trên mẫu này";
  if (report.verdict === "filter") return "ATR + uptrend chỉ giảm lỗ, chưa phải edge";
  return "ATR + trend không tách được PnL trên mẫu này";
}

function tone(cell: EdgeCell | undefined): string {
  if (!cell || !Number.isFinite(cell.expectancy) || cell.n < 8) return "bg-elevated text-muted";
  if (cell.expectancy > 0) return "bg-up/20 text-fg";
  if (cell.expectancy > -0.05) return "bg-elevated text-fg";
  return "bg-down/15 text-fg";
}

export function EdgePanel({ report }: { report: EdgeReport }) {
  const best = report.best;
  const bestLabel = `${best.entryAtr.toFixed(1)}× ${best.trend}`;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Edge ATR + trend</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Lưới 3 độ sâu × 3 regime, không lọc volume, phí 4 bps/chiều, stop 1.5× ATR. Best in-sample: {bestLabel} · E{" "}
          {formatSignedPct(best.expectancy)} · {formatInt(best.n)} lệnh. Walk-forward nửa đầu {formatSignedPct(best.firstE)} ({formatInt(best.nFirst)}) / nửa sau{" "}
          {formatSignedPct(best.secondE)} ({formatInt(best.nSecond)}).{" "}
          {Math.abs(report.trendLift) >= Math.abs(report.atrLift)
            ? "Hầu hết lift đến từ lọc SMA50, không từ độ sâu ATR."
            : "Hầu hết lift đến từ vào sâu hơn theo ATR."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="Δ ATR 1.0→1.5 all" v={formatSignedPct(report.atrLift, 3)} d="sâu hơn, cùng mọi trend" />
        <Mini k="Δ up vs all tại 1.5×" v={formatSignedPct(report.trendLift, 3)} d="lọc close trên SMA50" />
        <Mini k="Δ down vs all tại 1.5×" v={formatSignedPct(report.downLift, 3)} d="fade khi SMA50 đang xuống" />
        <Mini
          k="Δ 1.5 up vs 1.0 all"
          v={formatSignedPct(report.combinedLift, 3)}
          d="cả ATR và trend cộng lại"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[28rem] grid-cols-[7.5rem_repeat(3,minmax(0,1fr))] gap-2">
          <div />
          {report.depths.map((d) => (
            <p key={d} className="px-1 text-xs font-medium tracking-wide text-subtle uppercase">
              {d.toFixed(2).replace(/0$/, "")}× ATR
            </p>
          ))}
          {TREND_ROWS.map((row) => (
            <Row key={row.key} report={report} trend={row.key} label={row.label} />
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
}: {
  report: EdgeReport;
  trend: TrendFilter;
  label: string;
}) {
  return (
    <>
      <p className="flex items-center text-sm text-muted">{label}</p>
      {report.depths.map((d) => {
        const cell = cellOf(report, d, trend);
        const isBest =
          cell &&
          cell.entryAtr === report.best.entryAtr &&
          cell.trend === report.best.trend;
        return (
          <div
            key={`${trend}-${d}`}
            className={cn("rounded-md px-3 py-3", tone(cell), isBest && "shadow-[var(--shadow-border-hover)]")}
          >
            <p className="font-mono text-lg tabular-nums">{cell ? formatSignedPct(cell.expectancy) : "—"}</p>
            <p className="mt-1 text-xs text-muted">
              {cell ? `${formatInt(cell.n)} lệnh · WR ${formatPct((cell.winRate || 0) * 100, 0)}` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-subtle">
              {cell && Number.isFinite(cell.stopShare) ? `stop ${formatPct(cell.stopShare * 100, 0)}` : ""}
              {isBest ? " · best" : ""}
            </p>
          </div>
        );
      })}
    </>
  );
}

function Mini({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{k}</p>
      <p className="mt-1 font-mono text-lg tabular-nums text-fg">{v}</p>
      <p className="mt-1 text-xs text-muted">{d}</p>
    </div>
  );
}
