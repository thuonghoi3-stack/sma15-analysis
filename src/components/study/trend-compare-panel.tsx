import type { TrendBook, TrendBucket, TrendCompareReport } from "@/lib/market/types";
import { formatInt, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function titleOf(report: TrendCompareReport): string {
  const e = `EMA${report.emaPeriod}`;
  if (report.winner === "ema20") return `${e} lọc tốt hơn SMA50 trên mẫu này`;
  if (report.winner === "sma50") return `SMA50 lọc tốt hơn ${e} trên mẫu này`;
  if (report.winner === "and") return `Cần cả SMA50 và ${e}`;
  return `SMA50 và ${e} gần như trùng trên mẫu này`;
}

function tone(e: number, n: number): string {
  if (!Number.isFinite(e) || n < 8) return "text-muted";
  if (e > 0) return "text-recovery";
  if (e > -0.05) return "text-fg";
  return "text-dip";
}

export function TrendComparePanel({ report }: { report: TrendCompareReport }) {
  const sma = report.books.find((b) => b.key === "sma50");
  const ema = report.books.find((b) => b.key === "ema20");
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">SMA50 vs EMA{report.emaPeriod}</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Cùng fade {report.entryAtr.toFixed(2).replace(/0$/, "")}× ATR, stop 1.5×, phí 4 bps/chiều. ΔE EMA{report.emaPeriod} − SMA50 ={" "}
          {formatSignedPct(report.deltaE, 3)}. Hai đường cùng hướng {formatPct(report.agreeRate * 100, 0)} lệnh mọi-trend.
          SMA50 chậm hơn, EMA{report.emaPeriod} phản ứng sớm hơn — bucket chỉ-EMA là nến SMA50 chưa xác nhận.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {report.books.map((b) => (
          <BookCard key={b.key} book={b} best={b.key === report.winner} />
        ))}
      </div>

      <div>
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">Lệnh mọi-trend, tách theo đồng thuận</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report.buckets.map((b) => (
            <BucketCard key={b.key} bucket={b} />
          ))}
        </div>
      </div>

      {sma && ema ? (
        <p className="text-sm text-muted">
          Walk-forward: SMA50 nửa đầu {formatSignedPct(sma.firstE)} / nửa sau {formatSignedPct(sma.secondE)}. EMA
          {report.emaPeriod} {formatSignedPct(ema.firstE)} / {formatSignedPct(ema.secondE)}.
        </p>
      ) : null}
    </section>
  );
}

function BookCard({ book, best }: { book: TrendBook; best: boolean }) {
  return (
    <div className={cn("rounded-md bg-elevated px-3 py-3", best && "shadow-[var(--shadow-border-hover)]")}>
      <p className="text-xs text-subtle">
        {book.label}
        {best && book.key !== "all" ? " · thắng" : ""}
      </p>
      <p className={cn("mt-1 font-mono text-lg tabular-nums", tone(book.expectancy, book.n))}>
        {formatSignedPct(book.expectancy)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {formatInt(book.n)} lệnh · WR {formatPct((book.winRate || 0) * 100, 0)}
      </p>
      <p className="mt-0.5 text-xs text-subtle">stop {formatPct((book.stopShare || 0) * 100, 0)}</p>
    </div>
  );
}

function BucketCard({ bucket }: { bucket: TrendBucket }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{bucket.label}</p>
      <p className={cn("mt-1 font-mono text-lg tabular-nums", tone(bucket.expectancy, bucket.n))}>
        {formatSignedPct(bucket.expectancy)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {formatInt(bucket.n)} lệnh · WR {formatPct((bucket.winRate || 0) * 100, 0)}
      </p>
    </div>
  );
}
