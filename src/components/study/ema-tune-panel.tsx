import type { EmaTuneCell, EmaTuneReport } from "@/lib/market/types";
import { formatInt, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function titleOf(report: EmaTuneReport): string {
  if (report.winner === report.baseline) {
    return `EMA${report.baseline} đã tối ưu độ chính xác trên mẫu này`;
  }
  if (report.winner < report.baseline) {
    return `EMA${report.winner} chính xác hơn EMA${report.baseline} trên mẫu này`;
  }
  return `EMA${report.winner} ổn định hơn EMA${report.baseline} trên mẫu này`;
}

function tone(cell: EmaTuneCell): string {
  if (!Number.isFinite(cell.expectancy) || cell.n < 12) return "text-muted";
  if (cell.expectancy > 0 && cell.stability > 0) return "text-recovery";
  if (cell.expectancy > 0) return "text-fg";
  return "text-dip";
}

export function EmaTunePanel({ report }: { report: EmaTuneReport }) {
  const w = report.winnerCell;
  const b = report.baselineCell;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Tối ưu EMA</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Quét {report.cells.length} chu kỳ, fade {report.entryAtr.toFixed(2).replace(/0$/, "")}× ATR, close trên EMA.
          Chọn period có min(E nửa đầu, E nửa sau) lớn nhất, cả hai nửa dương, n tối thiểu 30. Độ chính xác = win rate
          cuốn đó. EMA{report.baseline} là mốc cũ.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="Period thắng" v={`EMA${report.winner}`} d={`${formatInt(w.n)} lệnh · occup. lọc trend`} />
        <Mini k="Độ chính xác" v={formatPct(w.winRate * 100, 0)} d={`EMA${b.period} ${formatPct(b.winRate * 100, 0)}`} />
        <Mini k={`Δ WR vs EMA${b.period}`} v={formatSignedPct(report.deltaWr * 100, 1)} d="điểm win rate" />
        <Mini k={`Δ E vs EMA${b.period}`} v={formatSignedPct(report.deltaE, 3)} d="expectancy sau phí" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-3 py-2 font-medium">EMA</th>
              <th className="px-3 py-2 font-medium">n</th>
              <th className="px-3 py-2 font-medium">WR</th>
              <th className="px-3 py-2 font-medium">E</th>
              <th className="px-3 py-2 font-medium">Nửa đầu</th>
              <th className="px-3 py-2 font-medium">Nửa sau</th>
              <th className="px-3 py-2 font-medium">min WF</th>
              <th className="px-3 py-2 font-medium">Stop</th>
            </tr>
          </thead>
          <tbody>
            {report.cells.map((c) => {
              const win = c.period === report.winner;
              const base = c.period === report.baseline && !win;
              return (
                <tr
                  key={c.period}
                  className={cn(
                    "border-t border-border",
                    win && "bg-up/15",
                    base && "bg-elevated",
                  )}
                >
                  <td className={cn("px-3 py-2 font-mono tabular-nums", tone(c))}>
                    {c.period}
                    {win ? " · thắng" : base ? " · mốc" : ""}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatInt(c.n)}</td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", tone(c))}>
                    {formatPct(c.winRate * 100, 0)}
                  </td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", tone(c))}>
                    {formatSignedPct(c.expectancy)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(c.firstE)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(c.secondE)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(c.stability)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatPct(c.stopShare * 100, 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
