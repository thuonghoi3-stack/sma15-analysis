import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, LoaderCircle, Radio } from "lucide-react";
import { loadScan } from "@/lib/market/load-scan";
import type { ScanReport, ScanRow, ScanStatus } from "@/lib/market/scan";
import { formatAtrMul, formatNum, formatPrice, formatTimeVn } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function remainLabel(nextBar: number, now: number): string {
  const s = Math.max(0, Math.round((nextBar - now) / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function statusLabel(s: ScanStatus): string {
  if (s === "entry") return "Vào lệnh";
  if (s === "near") return "Gần ngưỡng";
  if (s === "blocked") return "Chặn";
  if (s === "error") return "Lỗi";
  return "Trên SMA";
}

export function ScannerPanel({
  activeSymbol,
  onPick,
}: {
  activeSymbol: string;
  onPick: (symbol: string) => void;
}) {
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [notifyOn, setNotifyOn] = useState(false);
  const [fresh, setFresh] = useState<string[]>([]);
  const prevEntry = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pull = () => {
      loadScan()
        .then((res) => {
          if (cancelled) return;
          setReport(res);
          setError(null);
          const ids = res.rows.filter((r) => r.status === "entry").map((r) => r.symbol);
          const next = new Set(ids);
          if (!first.current) {
            const born = ids.filter((id) => !prevEntry.current.has(id));
            if (born.length) {
              setFresh(born);
              const names = res.rows
                .filter((r) => born.includes(r.symbol))
                .map((r) => r.label)
                .join(", ");
              document.title = `(${ids.length}) Entry · SMA15 Lab`;
              if (notifyOn && typeof Notification !== "undefined" && Notification.permission === "granted") {
                try {
                  new Notification(`${born.length} cặp entry fade 5m`, {
                    body: names,
                    tag: "sma15-scan",
                  });
                } catch {
                  /* preview may block */
                }
              }
            } else if (ids.length === 0) {
              document.title = "SMA15 Lab";
            }
          } else {
            first.current = false;
            if (ids.length) document.title = `(${ids.length}) Entry · SMA15 Lab`;
          }
          prevEntry.current = next;
        })
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Không quét được");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    pull();
    const tick = window.setInterval(pull, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(tick);
      document.title = "SMA15 Lab";
    };
  }, [notifyOn]);

  const entries = report?.rows.filter((r) => r.status === "entry") ?? [];
  const near = report?.rows.filter((r) => r.status === "near") ?? [];

  async function enableNotify() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifyOn(perm === "granted");
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-sma uppercase">Quét nến 5m</p>
          <h2 className="mt-1 text-lg font-medium text-fg">
            {entries.length ? `${entries.length} cặp đang đủ cửa fade` : "Chưa có entry trên nến hiện tại"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            EMA14 up · 1.15–1.75× ATR dưới SMA15 · pred hơn 2 nến · không squeeze · không climax. OLS −0.3 +
            4.7×ATR. Tự quét mỗi 20 giây và khi đóng nến 5m.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-mono text-sm tabular-nums text-subtle">
            {report ? formatTimeVn(report.at) : "—"} · còn {report ? remainLabel(report.nextBar, now) : "—"}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            onClick={() => (notifyOn ? setNotifyOn(false) : enableNotify())}
            aria-label="Thông báo"
          >
            {notifyOn ? <Bell className="size-4 text-recovery" /> : <BellOff className="size-4 text-muted" />}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-dip">{error}</p>}
      {loading && !report && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <LoaderCircle className="size-4 animate-spin" />
          Đang quét 14 cặp…
        </div>
      )}

      {entries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((row) => (
            <EntryCard
              key={row.symbol}
              row={row}
              active={row.symbol === activeSymbol}
              fresh={fresh.includes(row.symbol)}
              onPick={onPick}
            />
          ))}
        </div>
      )}

      {near.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium tracking-wide text-subtle uppercase">Gần ngưỡng</p>
          <div className="flex flex-wrap gap-2">
            {near.map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => onPick(row.symbol)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md bg-elevated px-3 py-2 text-sm shadow-[var(--shadow-border)] transition-shadow duration-150 hover:shadow-[var(--shadow-border-hover)]",
                  row.symbol === activeSymbol && "shadow-[var(--shadow-border-hover)]",
                )}
              >
                <span className="font-medium">{row.label}</span>
                <span className="font-mono tabular-nums text-muted">{formatAtrMul(row.depth, 2)}</span>
                <span className="text-subtle">{row.reasons[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {report && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs tracking-wide text-subtle uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Cặp</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                <th className="py-2 pr-3 font-medium">Độ sâu</th>
                <th className="py-2 pr-3 font-medium">Pred</th>
                <th className="py-2 pr-3 font-medium">EMA</th>
                <th className="py-2 pr-3 font-medium">Vol</th>
                <th className="py-2 font-medium">Cửa</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr
                  key={row.symbol}
                  className={cn(
                    "cursor-pointer border-t border-border/80 hover:bg-elevated/60",
                    row.symbol === activeSymbol && "bg-elevated/80",
                  )}
                  onClick={() => onPick(row.symbol)}
                >
                  <td className="py-2 pr-3 font-medium">{row.label}</td>
                  <td className="py-2 pr-3">
                    <StatusChip status={row.status} />
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums">{formatAtrMul(row.depth, 2)}</td>
                  <td className="py-2 pr-3 font-mono tabular-nums">
                    {Number.isFinite(row.predBars) ? `${formatNum(row.predBars, 1)} ±${row.slack}` : "—"}
                  </td>
                  <td className={cn("py-2 pr-3", row.emaUp ? "text-recovery" : "text-dip")}>
                    {row.emaUp ? "up" : "down"}
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums">
                    {Number.isFinite(row.volRatio) ? `${formatNum(row.volRatio, 1)}×` : "—"}
                  </td>
                  <td className="py-2 text-muted">
                    {row.status === "entry"
                      ? "Đủ"
                      : row.reasons[0] ?? (row.status === "flat" ? "—" : "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function StatusChip({ status }: { status: ScanStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-xs px-2 py-0.5 text-xs font-medium",
        status === "entry" && "bg-recovery/15 text-recovery",
        status === "near" && "bg-sma/15 text-sma",
        status === "blocked" && "bg-dip/15 text-dip",
        (status === "flat" || status === "error") && "text-subtle",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

function EntryCard({
  row,
  active,
  fresh,
  onPick,
}: {
  row: ScanRow;
  active: boolean;
  fresh: boolean;
  onPick: (symbol: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(row.symbol)}
      className={cn(
        "flex min-h-28 flex-col gap-2 rounded-lg bg-elevated p-4 text-left shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-border-hover)]",
        active && "shadow-[var(--shadow-border-hover)]",
        fresh && "ring-1 ring-recovery/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-recovery" />
          <span className="text-base font-medium">{row.label}</span>
          <StatusChip status="entry" />
        </div>
        <span className="font-mono text-sm tabular-nums text-muted">{formatPrice(row.last)}</span>
      </div>
      <p className="font-mono text-sm tabular-nums text-fg">
        {formatAtrMul(row.depth, 2)} dưới SMA15 · hồi {formatNum(row.predBars, 1)} nến · TP {formatNum(row.tpBars, 0)} nến
        (±{row.slack})
      </p>
      <p className="text-xs text-muted">
        EMA14 up · vol {Number.isFinite(row.volRatio) ? `${formatNum(row.volRatio, 1)}×` : "—"}
        {row.bbBelowLower ? " · xuyên BB dưới" : ""}
        {row.squeeze ? " · squeeze" : ""}
      </p>
    </button>
  );
}
