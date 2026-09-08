import { useEffect, useState } from "react";
import type { BacktestReport, BacktestRun, Trade } from "@/lib/market/types";
import { formatInt, formatNum, formatPct, formatSignedPct, formatTimeVn, minutesLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export function BacktestPanel({ report }: { report: BacktestReport }) {
  const [label, setLabel] = useState(report.bestLabel);
  useEffect(() => {
    setLabel(report.bestLabel);
  }, [report.bestLabel]);
  const run = report.runs.find((r) => r.label === label) ?? report.runs[0];
  if (!run) return null;

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-sma uppercase">Backtest in-sample</p>
          <h2 className="mt-1 text-xl font-medium tracking-tight">Hiệu suất fade SMA15</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Limit mua khi low chạm SMA − k×ATR, cắt lỗ {report.stopAtr.toFixed(1)}× ATR. Bỏ lệnh nếu P50 nến hồi ≤ 2.
            TP đóng close sau P50 − 2 nến (vẫn cắt sớm nếu close về SMA15). Phí {report.feeBps} bps mỗi chiều.
          </p>
          <p className="mt-2 text-sm text-fg">{verdictText(run)}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {report.runs.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setLabel(r.label)}
            className={cn(
              "h-11 rounded-md px-3 text-sm transition-[background-color,color] duration-150",
              r.label === label ? "bg-accent text-accent-fg" : "bg-elevated text-muted hover:text-fg",
            )}
          >
            {r.label}
            {r.label === report.bestLabel && (
              <span className="ml-2 text-xs opacity-70"> best</span>
            )}
          </button>
        ))}
      </div>

      <RunHero run={run} />
      <EquityChart run={run} />
      <RunTable runs={report.runs} active={label} onPick={setLabel} best={report.bestLabel} />
      {run.trades.length > 0 && <TradeTable trades={run.trades} />}
    </section>
  );
}

function RunHero({ run }: { run: BacktestRun }) {
  const beat = Number.isFinite(run.compoundPct) && Number.isFinite(run.buyHoldPct)
    ? run.compoundPct - run.buyHoldPct
    : NaN;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat k="Expectancy / lệnh" v={formatSignedPct(run.expectancy)} hint={`${formatInt(run.n)} lệnh · bỏ ${formatInt(run.nSkipped)} (P50≤2: ${formatInt(run.nSkipForecast)})`} />
      <Stat
        k="Win rate"
        v={formatPct(run.winRate * 100, 1)}
        hint={`TP ${formatPct((run.tpShare || 0) * 100, 0)} · SMA ${formatPct((run.smaShare || 0) * 100, 0)}`}
      />
      <Stat
        k="Lợi nhuận kép"
        v={formatSignedPct(run.compoundPct)}
        hint={`Buy-hold ${formatSignedPct(run.buyHoldPct)}`}
      />
      <Stat
        k="Max drawdown"
        v={formatPct(run.maxDd, 1)}
        hint={`PF ${formatNum(run.profitFactor, 2)} · vs hold ${formatSignedPct(beat, 1)}`}
      />
    </div>
  );
}

function Stat({ k, v, hint }: { k: string; v: string; hint: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{k}</p>
      <p className="mt-1 font-mono text-lg text-fg tabular-nums">{v}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}

function EquityChart({ run }: { run: BacktestRun }) {
  const pts = run.equity;
  if (pts.length < 2) {
    return <p className="text-sm text-muted">Chưa đủ lệnh để vẽ equity.</p>;
  }
  const w = 640;
  const h = 160;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 8;
  const ys = pts.map((p) => p.eq);
  let lo = Math.min(...ys, 1);
  let hi = Math.max(...ys, 1);
  if (hi === lo) {
    hi += 0.01;
    lo -= 0.01;
  }
  const span = hi - lo;
  lo -= span * 0.06;
  hi += span * 0.06;
  const x = (i: number) => padL + (i / (pts.length - 1)) * (w - padL - padR);
  const y = (eq: number) => padT + ((hi - eq) / (hi - lo)) * (h - padT - padB);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.eq).toFixed(1)}`).join(" ");
  const y0 = y(1);
  const last = pts[pts.length - 1]!.eq;
  const up = last >= 1;
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>Equity (bắt đầu = 1.00)</span>
        <span className={cn("font-mono tabular-nums", up ? "text-recovery" : "text-dip")}>
          {formatNum(last, 3)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-36 w-full" role="img" aria-label="Đường equity backtest">
        <line x1={padL} y1={y0} x2={w - padR} y2={y0} stroke="currentColor" className="text-border" strokeDasharray="4 4" />
        <path d={d} fill="none" stroke="currentColor" className={up ? "text-sma" : "text-dip"} strokeWidth="1.8" />
      </svg>
    </div>
  );
}

function RunTable({
  runs,
  active,
  onPick,
  best,
}: {
  runs: BacktestRun[];
  active: string;
  onPick: (label: string) => void;
  best: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-2xl text-left text-sm">
        <thead className="text-xs tracking-wide text-subtle uppercase">
          <tr className="border-t border-border">
            <th className="px-3 py-2 font-medium">Chiến lược</th>
            <th className="px-3 py-2 font-medium">n</th>
            <th className="px-3 py-2 font-medium">Bỏ P50</th>
            <th className="px-3 py-2 font-medium">Win</th>
            <th className="px-3 py-2 font-medium">E[R]</th>
            <th className="px-3 py-2 font-medium">Kép</th>
            <th className="px-3 py-2 font-medium">DD</th>
            <th className="px-3 py-2 font-medium">TP</th>
            <th className="px-3 py-2 font-medium">Hold</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr
              key={r.label}
              className={cn("border-t border-border", r.label === active && "bg-elevated")}
            >
              <td className="px-3 py-2">
                <button type="button" className="text-left" onClick={() => onPick(r.label)}>
                  {r.label}
                  {r.label === best ? <span className="ml-2 text-xs text-sma"> best</span> : null}
                </button>
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatInt(r.n)}</td>
              <td className="px-3 py-2 font-mono tabular-nums">
                {r.forecastOn ? formatInt(r.nSkipForecast) : "—"}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatPct(r.winRate * 100, 0)}</td>
              <td className={cn("px-3 py-2 font-mono tabular-nums", tone(r.expectancy))}>
                {formatSignedPct(r.expectancy)}
              </td>
              <td className={cn("px-3 py-2 font-mono tabular-nums", tone(r.compoundPct))}>
                {formatSignedPct(r.compoundPct)}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{formatPct(r.maxDd, 1)}</td>
              <td className="px-3 py-2 font-mono tabular-nums">
                {r.forecastOn ? formatPct((r.tpShare || 0) * 100, 0) : "—"}
              </td>
              <td className="px-3 py-2 font-mono tabular-nums">{minutesLabel(r.avgMin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TradeTable({ trades }: { trades: Trade[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Lệnh gần đây</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <thead className="text-xs tracking-wide text-subtle uppercase">
            <tr className="border-t border-border">
              <th className="px-3 py-2 font-medium">Vào</th>
              <th className="px-3 py-2 font-medium">PnL</th>
              <th className="px-3 py-2 font-medium">Thoát</th>
              <th className="px-3 py-2 font-medium">Hold</th>
              <th className="px-3 py-2 font-medium">Vol</th>
              <th className="px-3 py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {trades.slice(0, 16).map((t) => (
              <tr key={`${t.entryT}-${t.exitT}`} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs tabular-nums">{formatTimeVn(t.entryT)}</td>
                <td className={cn("px-3 py-2 font-mono tabular-nums", tone(t.pnlPct))}>
                  {formatSignedPct(t.pnlPct)}
                </td>
                <td className="px-3 py-2 text-muted">{reasonLabel(t.reason)}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{t.bars} nến</td>
                <td className="px-3 py-2 font-mono tabular-nums">
                  {Number.isFinite(t.volRatio) ? `${formatNum(t.volRatio, 1)}×` : "—"}
                </td>
                <td className="px-3 py-2 text-muted">{t.uptrend ? "Up" : "Down"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function reasonLabel(reason: Trade["reason"]): string {
  if (reason === "sma") return "Hồi SMA";
  if (reason === "stop") return "Stop";
  if (reason === "tp") return "TP P50−2";
  return "Hết giờ";
}

function tone(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "";
  return n > 0 ? "text-recovery" : "text-dip";
}

function verdictText(run: BacktestRun): string {
  if (!Number.isFinite(run.expectancy) || run.n < 8) return "Chưa đủ lệnh để đánh giá.";
  if (run.expectancy > 0 && run.compoundPct > run.buyHoldPct) {
    return "Expectancy dương và vượt buy-hold trên mẫu này.";
  }
  if (run.expectancy > 0) {
    return "Expectancy dương nhưng kém buy-hold.";
  }
  return "Sau phí và stop, expectancy âm: bounce về SMA không bù được nhịp thua 1.5× ATR.";
}
