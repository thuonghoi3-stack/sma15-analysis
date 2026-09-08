import { mkdir, writeFile } from "node:fs/promises";
import { fetchKlines } from "./fetch-klines.server.ts";
import { extractRows } from "./predict.ts";
import { assembleOlsTune, type OlsTuneReport } from "./ols-tune.ts";
import { LOCKED_90 } from "./residuals.ts";
import { SYMBOLS } from "./symbols.ts";
import type { Interval } from "./types.ts";

const INTERVAL: Interval = "5m";
const DAYS = 90;
const CONCURRENCY = 2;

function fmt(n: number, d = 2): string {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

async function mapPool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, () => worker()));
  return out;
}

function print(u: OlsTuneReport) {
  console.log(`\n=== OLS tune · ${u.n} nhịp · train ${u.nTrain} / test ${u.nTest} / cửa ${u.nEntry} ===`);
  console.log(
    "SPEC".padEnd(28),
    "int".padStart(7),
    "slope".padStart(7),
    "ema".padStart(7),
    "MAE tr".padStart(7),
    "MAE te".padStart(7),
    "MAE up".padStart(7),
    "MAE cửa".padStart(8),
    "hit2".padStart(6),
  );
  for (const s of u.specs) {
    const mark = s.name === u.winner ? " ←" : "";
    console.log(
      s.label.padEnd(28),
      fmt(s.coefs.intercept).padStart(7),
      fmt(s.coefs.depth).padStart(7),
      fmt(s.coefs.ema).padStart(7),
      fmt(s.train.mae).padStart(7),
      fmt(s.test.mae).padStart(7),
      fmt(s.emaUp.mae).padStart(7),
      fmt(s.entry.mae).padStart(8),
      fmt(s.entry.hit2, 2).padStart(6),
      mark,
    );
  }
  console.log(`\nWinner: ${u.winner}  grade ${u.grade}  Δ cửa ${fmt(u.delta, 3)}`);
  console.log(`Best: ${fmt(u.best.intercept)} + ${fmt(u.best.depth)}×ATR + ${fmt(u.best.ema)}×EMA  kind=${u.bestKind}`);
  console.log(`Locked: ${fmt(LOCKED_90.intercept)} + ${fmt(LOCKED_90.depth)}×ATR + ${fmt(LOCKED_90.ema)}×EMA`);
  console.log(`Kết luận: ${u.verdict}\n`);
}

async function main() {
  const ids = SYMBOLS.map((s) => s.id);
  console.log(`Tải ${ids.length} cặp ${INTERVAL} ${DAYS}d…`);
  const series = await mapPool(ids, CONCURRENCY, async (symbol) => {
    try {
      const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
      console.log(`  ${symbol}  nến=${candles.length}  src=${source}`);
      return extractRows(candles, INTERVAL);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${symbol}  LỖI ${msg} — retry`);
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
        console.log(`  ${symbol}  nến=${candles.length}  src=${source} (retry)`);
        return extractRows(candles, INTERVAL);
      } catch (err2) {
        console.log(`  ${symbol}  LỖI ${err2 instanceof Error ? err2.message : String(err2)}`);
        return [];
      }
    }
  });
  const rows = series.flat();
  const report = assembleOlsTune(rows, LOCKED_90);
  print(report);
  await mkdir("/workspace/artifacts", { recursive: true });
  await writeFile("/workspace/artifacts/ols-tune.json", JSON.stringify(report, null, 2), "utf8");
  console.log("wrote artifacts/ols-tune.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
