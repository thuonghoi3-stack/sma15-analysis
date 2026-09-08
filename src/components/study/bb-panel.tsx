import type { BbBook, BbWidthReport } from "@/lib/market/types";
import { formatInt, formatNum, formatPct, formatSignedPct } from "@/lib/format";
import { cn } from "@/lib/cn";

function titleOf(report: BbWidthReport): string {
  if (report.verdict === "squeeze") return "Squeeze BB thêm edge; dải rộng kém hơn trên mẫu này";
  if (report.verdict === "expand") return "Fade khi BB đang rộng tốt hơn squeeze trên mẫu này";
  if (report.verdict === "below") return "Low xuyên dải dưới BB thêm E so với fade 1.25×";
  if (report.verdict === "proxy") return "BB width gần như ATR% — không phải tín hiệu mới";
  return "BB width không tách expectancy trên fade EMA up";
}

function tone(e: number, n: number): string {
  if (!Number.isFinite(e) || n < 8) return "text-muted";
  if (e > 0) return "text-recovery";
  if (e > -0.05) return "text-fg";
  return "text-dip";
}

export function BbPanel({
  report,
  live,
}: {
  report: BbWidthReport;
  live: {
    bbWidthPct: number | null;
    bbPctile: number | null;
    bbSqueeze: boolean;
    bbExpand: boolean;
    bbPctB: number | null;
    bbBelowLower: boolean;
  };
}) {
  const squeeze = report.books.find((b) => b.key === "squeeze");
  const expand = report.books.find((b) => b.key === "expand");
  const winner = report.books.find((b) => b.key === report.winner);
  const liveLabel = live.bbSqueeze ? "squeeze" : live.bbExpand ? "rộng" : "giữa dải";
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
      <div>
        <p className="text-xs font-medium tracking-wide text-sma uppercase">Bollinger width</p>
        <h2 className="mt-1 text-xl font-medium tracking-tight">{titleOf(report)}</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted">
          BB{report.period} ± {formatNum(report.k, 0)}σ. Squeeze = percentile độ rộng ≤ {formatPct(report.squeezeP * 100, 0)} trên {formatInt(report.rankBars)} nến vừa rồi (nhân quả). Nền fade SMA15 {formatNum(report.entryAtr, 2)}× ATR, close trên EMA{report.emaPeriod}. Pearson width vs ATR% = {formatNum(report.corrWidthAtrPct, 2)}; width vs nến hồi = {formatNum(report.corrWidthRecovery, 2)}.
          ΔE squeeze − rộng = {formatSignedPct(report.deltaSE, 3)}. Nến cuối width {live.bbWidthPct != null ? formatPct(live.bbWidthPct) : "—"} · P{live.bbPctile != null ? formatNum(live.bbPctile, 0) : "—"} {liveLabel}
          {live.bbBelowLower ? " · low dưới dải dưới." : "."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini k="Δ squeeze − all" v={formatSignedPct(report.squeezeLift, 3)} d="vol co so với nền EMA up" />
        <Mini k="Δ rộng − all" v={formatSignedPct(report.expandLift, 3)} d="vol nở so với nền" />
        <Mini k="Width vs ATR%" v={formatNum(report.corrWidthAtrPct, 2)} d="gần 1 = BB chỉ là ATR đổi vỏ" />
        <Mini k="Width vs nến hồi" v={formatNum(report.corrWidthRecovery, 2)} d="dải rộng có hồi chậm hơn không" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {report.books.map((b) => (
          <BookCard key={b.key} book={b} best={b.key === report.winner} />
        ))}
      </div>

      {winner && winner.key !== "all" ? (
        <p className="text-sm text-muted">
          Walk-forward {winner.label}: nửa đầu {formatSignedPct(winner.firstE)} ({formatInt(winner.nFirst)}) / nửa sau {formatSignedPct(winner.secondE)} ({formatInt(winner.nSecond)}).
          {squeeze && expand
            ? ` Squeeze ${formatInt(squeeze.n)} lệnh vs rộng ${formatInt(expand.n)} — occupancy không đều.`
            : ""}
        </p>
      ) : (
        <p className="text-sm text-muted">
          Lọc BB không thắng nền EMA up trên mẫu này. Occupancy squeeze {squeeze ? formatInt(squeeze.n) : "—"} / rộng {expand ? formatInt(expand.n) : "—"}.
        </p>
      )}
    </section>
  );
}

function BookCard({ book, best }: { book: BbBook; best: boolean }) {
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

function Mini({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-3">
      <p className="text-xs text-subtle">{k}</p>
      <p className="mt-1 font-mono text-lg tabular-nums text-fg">{v}</p>
      <p className="mt-1 text-xs leading-snug text-muted">{d}</p>
    </div>
  );
}
