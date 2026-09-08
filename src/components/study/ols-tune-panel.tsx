import type { OlsTuneReport } from "@/lib/market/ols-tune";
import { formatInt, formatNum } from "@/lib/format";
import { cn } from "@/lib/cn";

export function OlsTunePanel({ report }: { report: OlsTuneReport }) {
  if (!report?.specs?.length) return null;
  const locked = report.specs.find((s) => s.name === "locked");
  const win = report.specs.find((s) => s.name === report.winner) ?? locked;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Tối ưu OLS</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">
          {report.grade === "keep"
            ? "Locked −0.28 + 4.67×ATR − 0.36×EMA vẫn chính xác nhất"
            : `${win?.label ?? report.winner} chính xác hơn locked trên cửa fade`}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">{report.verdict}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="Nhịp train/test" v={formatInt(report.n)} d={`${formatInt(report.nTrain)} / ${formatInt(report.nTest)}`} />
        <Mini k="MAE cửa fade" v={formatNum(report.winnerMae, 2)} d={`n cửa ${formatInt(report.nEntry)}`} />
        <Mini k="Δ vs locked" v={formatNum(report.delta, 2)} d="nến · >0 = hơn locked" />
        <Mini
          k="Công thức"
          v={`${formatNum(report.best.intercept, 2)} + ${formatNum(report.best.depth, 2)}×`}
          d={`EMA ${formatNum(report.best.ema, 2)}`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-3 py-2 font-medium">Spec</th>
              <th className="px-3 py-2 font-medium">int</th>
              <th className="px-3 py-2 font-medium">slope</th>
              <th className="px-3 py-2 font-medium">ema</th>
              <th className="px-3 py-2 font-medium">MAE test</th>
              <th className="px-3 py-2 font-medium">MAE cửa</th>
              <th className="px-3 py-2 font-medium">hit ±2</th>
            </tr>
          </thead>
          <tbody>
            {report.specs.map((s) => {
              const mark = s.name === report.winner;
              const base = s.name === "locked" && !mark;
              return (
                <tr
                  key={s.name}
                  className={cn("border-t border-border", mark && "bg-up/15", base && "bg-elevated")}
                >
                  <td className="px-3 py-2">
                    {s.label}
                    {mark ? " · thắng" : base ? " · mốc" : ""}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatNum(s.coefs.intercept, 2)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatNum(s.coefs.depth, 2)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatNum(s.coefs.ema, 2)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatNum(s.test.mae, 2)}</td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", mark && "text-recovery")}>
                    {formatNum(s.entry.mae, 2)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatNum(s.entry.hit2, 2)}</td>
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
    <div className="rounded-lg bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{k}</p>
      <p className="mt-1 font-mono text-lg tabular-nums text-fg">{v}</p>
      <p className="mt-1 text-xs text-muted">{d}</p>
    </div>
  );
}
