import type { HistogramBin, Quantiles } from "@/lib/market/types";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  unit: string;
  bins: HistogramBin[];
  quantiles: Quantiles;
  formatTick: (n: number) => string;
  accentClass?: string;
};

export function Histogram({ title, unit, bins, quantiles, formatTick }: Props) {
  const max = Math.max(1, ...bins.map((b) => b.n));
  const span = bins.length ? (bins[bins.length - 1]!.x1 - bins[0]!.x0) : 1;

  const marker = (value: number) => {
    if (!bins.length || !Number.isFinite(value) || span <= 0) return null;
    const x0 = bins[0]!.x0;
    const pct = ((value - x0) / span) * 100;
    if (pct < 0 || pct > 100) return null;
    return pct;
  };

  const p50 = marker(quantiles.p50);
  const p75 = marker(quantiles.p75);
  const p90 = marker(quantiles.p90);

  return (
    <section className="flex min-w-0 flex-col gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-fg">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{unit}</p>
        </div>
        <p className="font-mono text-xs text-subtle tabular-nums">nhịp đã hồi</p>
      </header>
      <div className="relative h-36">
        <div className="absolute inset-x-0 bottom-0 flex h-32 items-end gap-px">
          {bins.map((b, i) => (
            <div
              key={`${b.x0}-${i}`}
              className="min-w-0 flex-1 rounded-t-xs bg-sma/80"
              style={{ height: `${(b.n / max) * 100}%` }}
              title={`${formatTick(b.x0)}–${formatTick(b.x1)} · ${b.n}`}
            />
          ))}
        </div>
        {p50 != null && <Marker left={p50} label="P50" className="bg-fg" />}
        {p75 != null && <Marker left={p75} label="P75" className="bg-sma" />}
        {p90 != null && <Marker left={p90} label="P90" className="bg-dip" />}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <Stat k="P25" v={formatTick(quantiles.p25)} />
        <Stat k="P50" v={formatTick(quantiles.p50)} />
        <Stat k="P75" v={formatTick(quantiles.p75)} />
        <Stat k="P90" v={formatTick(quantiles.p90)} />
        <Stat k="Mean" v={formatTick(quantiles.mean)} />
        <Stat k="CV" v={Number.isFinite(quantiles.cv) ? quantiles.cv.toFixed(2) : "—"} />
      </dl>
    </section>
  );
}

function Marker({ left, label, className }: { left: number; label: string; className: string }) {
  return (
    <div
      className="pointer-events-none absolute top-0 bottom-0"
      style={{ left: `${left}%` }}
    >
      <div className={cn("h-full w-px opacity-80", className)} />
      <span className="absolute top-0 left-1 text-xs tracking-wide text-subtle uppercase">
        {label}
      </span>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-sm bg-elevated px-2 py-1.5">
      <dt className="text-subtle">{k}</dt>
      <dd className="font-mono text-fg tabular-nums">{v}</dd>
    </div>
  );
}
