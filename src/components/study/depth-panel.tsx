import type { DepthPoint, DepthReport } from "@/lib/market/types";
import { formatInt, formatNum, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function fmtDepth(n: number): string {
  return `${n.toFixed(2).replace(/0$/, "").replace(/\.$/, "")}×`;
}

function titleOf(report: DepthReport): string {
  const peak = fmtDepth(report.peakUp.entryAtr);
  if (report.verdict === "sweet-spot") {
    return `Expectancy đỉnh tại ${peak} ATR; sâu hơn mất occupancy`;
  }
  if (report.verdict === "deeper-helps") return "Vào sâu hơn theo ATR cải thiện E trên mẫu này";
  if (report.verdict === "shallow-better") return "Wick nông có E cao hơn — sâu hơn không bù occupancy";
  return "Độ sâu ATR không đổi expectancy trên mẫu này";
}

function tone(p: DepthPoint, peak: DepthPoint): string {
  if (p.n < 12 || !Number.isFinite(p.expectancy)) return "text-muted";
  if (p.entryAtr === peak.entryAtr) return "text-fg";
  if (p.expectancy > 0) return "text-recovery";
  return "text-dip";
}

export function DepthPanel({ report }: { report: DepthReport }) {
  const peak = report.peakUp;
  const ema = `EMA${report.emaPeriod}`;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Độ sâu ATR</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Quét 8 ngưỡng vào lệnh trên fade {ema} up, SMA-exit vs TP P50−2. Mọi trend giữ nguyên để đối chiếu.
          Đỉnh E: {fmtDepth(peak.entryAtr)} · {formatSignedPct(peak.expectancy)} · {formatInt(peak.n)} lệnh.
          Nửa đầu {formatSignedPct(peak.firstE)} / nửa sau {formatSignedPct(peak.secondE)}.
          {Number.isFinite(report.skipFloor)
            ? ` Skip P50≤2 chỉ còn cắt dưới ${fmtDepth(report.skipFloor)}.`
            : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini
          k="Đỉnh E (EMA up)"
          v={`${fmtDepth(peak.entryAtr)} ${formatSignedPct(peak.expectancy)}`}
          d={`${formatInt(peak.n)} lệnh · WR ${formatPct((peak.winRate || 0) * 100, 0)}`}
        />
        <Mini
          k="ΔE 0.5× → đỉnh"
          v={formatSignedPct(report.deltaE, 3)}
          d={`slope ${formatSignedPct(report.slopeUp, 3)} mỗi 1× ATR`}
        />
        <Mini
          k="Occupancy"
          v={Number.isFinite(report.occupancyDrop) ? `${formatNum(report.occupancyDrop, 1)}×` : "—"}
          d="số lệnh 0.5× so với đỉnh — nhiều lệnh, E thấp hơn"
        />
        <Mini
          k="Slope mọi trend"
          v={formatSignedPct(report.slopeAll, 3)}
          d="sâu hơn không sửa fade khi mất trend"
        />
      </div>

      <DepthChart report={report} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-3xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-3 py-2 font-medium">ATR</th>
              <th className="px-3 py-2 font-medium">n up</th>
              <th className="px-3 py-2 font-medium">E SMA</th>
              <th className="px-3 py-2 font-medium">E TP</th>
              <th className="px-3 py-2 font-medium">Bỏ P50</th>
              <th className="px-3 py-2 font-medium">Stop</th>
              <th className="px-3 py-2 font-medium">Nửa 1 / 2</th>
              <th className="px-3 py-2 font-medium">E all</th>
              <th className="px-3 py-2 font-medium">Kép up</th>
            </tr>
          </thead>
          <tbody>
            {report.up.map((p, i) => {
              const fc = report.forecast[i]!;
              const all = report.all[i]!;
              const isPeak = p.entryAtr === peak.entryAtr;
              return (
                <tr key={p.entryAtr} className={cn("border-t border-border", isPeak && "bg-elevated")}>
                  <td className="px-3 py-2 font-mono tabular-nums">
                    {fmtDepth(p.entryAtr)}
                    {isPeak ? <span className="ml-2 text-xs text-sma"> đỉnh</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatInt(p.n)}</td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", tone(p, peak))}>
                    {formatSignedPct(p.expectancy)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(fc.expectancy)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">
                    {fc.nSkipForecast > 0 ? formatInt(fc.nSkipForecast) : "0"}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatPct((p.stopShare || 0) * 100, 0)}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-muted">
                    {formatSignedPct(p.firstE, 2)} / {formatSignedPct(p.secondE, 2)}
                  </td>
                  <td className={cn("px-3 py-2 font-mono tabular-nums", all.expectancy > 0 ? "text-recovery" : "text-dip")}>
                    {formatSignedPct(all.expectancy)}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">{formatSignedPct(p.compoundPct)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DepthChart({ report }: { report: DepthReport }) {
  const pts = report.up.filter((p) => Number.isFinite(p.expectancy));
  const all = report.all.filter((p) => Number.isFinite(p.expectancy));
  if (pts.length < 2) return null;
  const w = 640;
  const h = 140;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 18;
  const ys = [...pts, ...all].map((p) => p.expectancy);
  let lo = Math.min(...ys, 0);
  let hi = Math.max(...ys, 0);
  if (hi === lo) {
    hi += 0.05;
    lo -= 0.05;
  }
  const span = hi - lo;
  lo -= span * 0.08;
  hi += span * 0.08;
  const xOf = (i: number, n: number) => padL + (n <= 1 ? 0 : i / (n - 1)) * (w - padL - padR);
  const yOf = (e: number) => padT + ((hi - e) / (hi - lo)) * (h - padT - padB);
  const path = (xs: DepthPoint[]) =>
    xs.map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i, xs.length).toFixed(1)} ${yOf(p.expectancy).toFixed(1)}`).join(" ");
  const y0 = yOf(0);
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Expectancy theo độ sâu ATR</span>
        <span>
          <span className="text-sma">EMA up</span>
          <span className="mx-2">·</span>
          <span className="text-dip">mọi trend</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full" role="img" aria-label="Expectancy theo độ sâu ATR">
        <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
        <path d={path(all)} fill="none" stroke="currentColor" className="text-dip" strokeWidth="1.6" />
        <path d={path(pts)} fill="none" stroke="currentColor" className="text-sma" strokeWidth="1.8" />
        {pts.map((p, i) => (
          <circle
            key={p.entryAtr}
            cx={xOf(i, pts.length)}
            cy={yOf(p.expectancy)}
            r={p.entryAtr === report.peakUp.entryAtr ? 3.2 : 2}
            className={p.entryAtr === report.peakUp.entryAtr ? "fill-sma" : "fill-fg"}
          />
        ))}
      </svg>
    </div>
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
