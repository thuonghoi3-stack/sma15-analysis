import type { MaPair, MaTypeReport } from "@/lib/market/types";
import { formatInt, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function titleOf(report: MaTypeReport): string {
  if (report.winner === "sma") {
    return `SMA${report.bestSma.period} chính xác hơn EMA${report.bestEma.period} khi mỗi bên tối ưu period`;
  }
  if (report.winner === "ema") {
    return `EMA${report.bestEma.period} vẫn thắng SMA${report.bestSma.period} khi mỗi bên tối ưu period`;
  }
  return "EMA và SMA gần như trùng khi tối ưu period";
}

function deltaTone(d: number): string {
  if (!Number.isFinite(d)) return "text-muted";
  if (d > 0.001) return "text-recovery";
  if (d < -0.001) return "text-dip";
  return "text-fg";
}

export function MaTypePanel({ report }: { report: MaTypeReport }) {
  const sma = report.bestSma;
  const ema = report.bestEma;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">EMA vs SMA</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Cùng fade {report.entryAtr.toFixed(2).replace(/0$/, "")}× ATR, cùng chu kỳ. SMA50 vs EMA20 lần trước lẫn period
          với loại đường. ΔE = EMA − SMA (dương = EMA hơn). Thắng kiểu = min walk-forward lớn hơn giữa hai cuốn tối ưu.
          SMA thắng {formatInt(report.smaWins)}/{formatInt(report.pairs.length)} period, EMA {formatInt(report.emaWins)}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini
          k={`SMA tối ưu · ${sma.period}`}
          v={formatPct(sma.winRate * 100, 0)}
          d={`${formatInt(sma.n)} lệnh · E ${formatSignedPct(sma.expectancy)}`}
        />
        <Mini
          k={`EMA tối ưu · ${ema.period}`}
          v={formatPct(ema.winRate * 100, 0)}
          d={`${formatInt(ema.n)} lệnh · E ${formatSignedPct(ema.expectancy)}`}
        />
        <Mini k="Δ WR best" v={formatSignedPct(report.deltaBestWr * 100, 1)} d="EMA − SMA, điểm win rate" />
        <Mini k="Δ E best" v={formatSignedPct(report.deltaBestE, 3)} d="EMA − SMA, expectancy" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-3 py-2 font-medium">Period</th>
              <th className="px-3 py-2 font-medium">SMA n</th>
              <th className="px-3 py-2 font-medium">SMA WR</th>
              <th className="px-3 py-2 font-medium">SMA E</th>
              <th className="px-3 py-2 font-medium">EMA n</th>
              <th className="px-3 py-2 font-medium">EMA WR</th>
              <th className="px-3 py-2 font-medium">EMA E</th>
              <th className="px-3 py-2 font-medium">ΔE</th>
            </tr>
          </thead>
          <tbody>
            {report.pairs.map((p) => (
              <PairRow key={p.period} pair={p} matched={p.period === report.matched.period} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PairRow({ pair, matched }: { pair: MaPair; matched: boolean }) {
  const smaBetter = pair.deltaE < -0.001;
  return (
    <tr className={cn("border-t border-border", matched && "bg-up/15")}>
      <td className="px-3 py-2 font-mono tabular-nums">
        {pair.period}
        {matched ? " · EMA live" : ""}
      </td>
      <td className="px-3 py-2 font-mono tabular-nums">{formatInt(pair.sma.n)}</td>
      <td className={cn("px-3 py-2 font-mono tabular-nums", smaBetter ? "text-recovery" : "text-fg")}>
        {formatPct(pair.sma.winRate * 100, 0)}
      </td>
      <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(pair.sma.expectancy)}</td>
      <td className="px-3 py-2 font-mono tabular-nums">{formatInt(pair.ema.n)}</td>
      <td className={cn("px-3 py-2 font-mono tabular-nums", !smaBetter && pair.deltaE > 0.001 ? "text-recovery" : "text-fg")}>
        {formatPct(pair.ema.winRate * 100, 0)}
      </td>
      <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(pair.ema.expectancy)}</td>
      <td className={cn("px-3 py-2 font-mono tabular-nums", deltaTone(pair.deltaE))}>
        {formatSignedPct(pair.deltaE, 3)}
      </td>
    </tr>
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
