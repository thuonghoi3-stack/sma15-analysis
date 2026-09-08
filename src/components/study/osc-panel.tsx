import type { OscBook, OscReport } from "@/lib/market/types";
import { formatInt, formatNum, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function titleOf(report: OscReport): string {
  const e = `EMA${report.emaPeriod}`;
  if (report.winner === "cti") return "CTI không dương thêm edge; RSI không cộng được";
  if (report.winner === "slowCti") return "RSI slow + CTI tốt hơn CTI đơn trên mẫu này";
  if (report.winner === "fastCti") return "RSI fast + CTI tốt hơn các cặp khác trên mẫu này";
  if (report.winner === "combo") return `AND cả ba oscillator cải thiện cuốn ${e}`;
  if (report.winner === "fastSlow") return "RSI fast + slow tốt hơn CTI trên mẫu này";
  if (report.winner === "fast") return "RSI fast dưới slow tốt hơn combo trên mẫu này";
  if (report.winner === "slow") return "RSI slow còn trên 50 tốt hơn combo trên mẫu này";
  if (report.winner === "base") return `Oscillator không thêm edge trên cuốn ${e}`;
  return `Oscillator gần như không đổi cuốn ${e}`;
}

function tone(e: number, n: number): string {
  if (!Number.isFinite(e) || n < 8) return "text-muted";
  if (e > 0) return "text-recovery";
  if (e > -0.05) return "text-fg";
  return "text-dip";
}

export function OscPanel({
  report,
  live,
}: {
  report: OscReport;
  live: { rsiFast: number | null; rsiSlow: number | null; cti: number | null; oscCombo: boolean };
}) {
  const combo = report.pairs.find((b) => b.key === "combo");
  const cti = report.books.find((b) => b.key === "cti");
  const winner =
    [...report.books, ...report.pairs].find((b) => b.key === report.winner) ?? cti;
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">RSI + CTI</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          Nền: fade SMA15 {report.entryAtr.toFixed(2).replace(/0$/, "")}× ATR, close trên EMA{report.emaPeriod}. Cửa đơn: RSI
          {report.rsiFast} dưới RSI{report.rsiSlow}, RSI{report.rsiSlow} trên {report.rsiSlowMin}, CTI
          {report.ctiPeriod} không dương. Cặp = AND từng đôi; cả ba = AND đủ 3 cửa. RSI 7 dưới 30 gần như không xảy ra khi giá còn trên EMA{report.emaPeriod}.
          ΔE cả-ba − EMA{report.emaPeriod} = {formatSignedPct(report.deltaE, 3)}. Nến cuối RSI{report.rsiFast}{" "}
          {live.rsiFast != null ? formatNum(live.rsiFast, 1) : "—"} · RSI{report.rsiSlow}{" "}
          {live.rsiSlow != null ? formatNum(live.rsiSlow, 1) : "—"} · CTI {live.cti != null ? formatNum(live.cti, 2) : "—"}
          {live.oscCombo ? " — đủ combo." : "."}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {report.books.map((b) => (
          <BookCard key={b.key} book={b} best={b.key === report.winner} />
        ))}
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">Kết hợp AND</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {report.pairs.map((b) => (
            <BookCard key={b.key} book={b} best={b.key === report.winner} />
          ))}
        </div>
      </div>
      <p className="text-sm text-muted">
        Đối chứng CTI dương: {formatSignedPct(report.anti.expectancy)} · {formatInt(report.anti.n)} lệnh · WR{" "}
        {formatPct((report.anti.winRate || 0) * 100, 0)} · stop {formatPct((report.anti.stopShare || 0) * 100, 0)}
        {Number.isFinite(report.anti.expectancy) && report.anti.expectancy <= 0
          ? " — fade khi CTI còn dương mất edge."
          : "."}
      </p>
      {winner ? (
        <p className="text-sm text-muted">
          Walk-forward {winner.label}: nửa đầu {formatSignedPct(winner.firstE)} ({formatInt(winner.nFirst)}) / nửa
          sau {formatSignedPct(winner.secondE)} ({formatInt(winner.nSecond)}).
          {combo && winner.key !== "combo"
            ? ` Cả ba: ${formatSignedPct(combo.firstE)} (${formatInt(combo.nFirst)}) / ${formatSignedPct(combo.secondE)} (${formatInt(combo.nSecond)}).`
            : ""}
        </p>
      ) : null}
    </section>
  );
}

function BookCard({ book, best }: { book: OscBook; best: boolean }) {
  return (
    <div className={cn("rounded-md bg-elevated px-3 py-3", best && "shadow-[var(--shadow-border-hover)]")}>
      <p className="text-xs text-subtle">
        {book.label}
        {best ? " · thắng" : ""}
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
