import { mkdir, writeFile } from "node:fs/promises";
import { fetchKlines } from "./fetch-klines.server.ts";
import { stabilityFromCandles, type StabilityReport, type WindowFit } from "./stability.ts";
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

function coefLine(c: { intercept: number; depth: number; ema: number }): string {
  return `${fmt(c.intercept, 2)} + ${fmt(c.depth, 2)}×ATR + ${fmt(c.ema, 2)}×EMA`;
}

function printWindows(title: string, ws: WindowFit[]) {
  console.log(`\n${title}`);
  console.log("WIN".padEnd(16), "N".padStart(6), "int".padStart(7), "slope".padStart(7), "ema".padStart(7), "MAE".padStart(6));
  for (const w of ws) {
    console.log(
      w.label.padEnd(16),
      String(w.n).padStart(6),
      fmt(w.coefs.intercept).padStart(7),
      fmt(w.coefs.depth).padStart(7),
      fmt(w.coefs.ema).padStart(7),
      fmt(w.maeIn).padStart(6),
    );
  }
}

function printReport(u: StabilityReport) {
  console.log(`\n=== Ổn định OLS · ${u.nSymbols} cặp · ${u.interval} · ${u.days}d · ${u.nRows} nhịp ===`);
  console.log(`Pooled 90n : ${coefLine(u.pooled90)}`);
  console.log(`Pooled T1  : ${coefLine(u.pooledFirst30)}`);
  console.log(`Pooled T3  : ${coefLine(u.pooledLast30)}`);
  console.log(
    `Slope rolling ${fmt(u.slopeMin)}–${fmt(u.slopeMax)}  dải ${fmt(u.slopeRange)}  CV ${fmt(u.slopeCv * 100, 0)}%`,
  );
  console.log(`EMA rolling ${fmt(u.emaMin)}–${fmt(u.emaMax)}`);
  printWindows("Ba khúc 30 ngày (pooled)", u.thirds);
  printWindows("Rolling 30n / bước 7n (pooled)", u.rolling);
  const o = u.train60test30;
  console.log(
    `\nTrain 60n → test 30n  nTrain=${o.nTrain} nTest=${o.nTest}  OLS MAE ${fmt(o.ols.mae)}  hit2 ${fmt(o.ols.hit2, 2)}  naive ${fmt(o.naive)}`,
  );
  console.log(`Hệ số 30n đầu → 30n cuối  MAE ${fmt(u.first30onLast30.mae)}  hit2 ${fmt(u.first30onLast30.hit2, 2)}`);
  console.log("\nTỪNG CẶP  slope T1/T2/T3  dải  CV  OOS vs naive");
  for (const s of u.symbols) {
    const t = s.thirds.map((w) => fmt(w.coefs.depth)).join(" ");
    console.log(
      s.symbol.padEnd(10),
      `n=${String(s.n90).padStart(4)}`,
      t.padStart(16),
      `Δ${fmt(s.slopeRange)}`,
      `CV ${fmt(s.slopeCv * 100, 0)}%`.padStart(8),
      `OOS ${fmt(s.oos.mae)} / ${fmt(s.naiveOos)}`,
      `full ${fmt(s.full.depth)}`,
    );
  }
  console.log(`\nGrade: ${u.grade}`);
  console.log(`Kết luận: ${u.verdict}\n`);
}

async function main() {
  const ids = SYMBOLS.map((s) => s.id);
  console.log(`Tải ${ids.length} cặp ${INTERVAL} ${DAYS}d…`);
  const series = await mapPool(ids, CONCURRENCY, async (symbol) => {
    try {
      const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
      console.log(`  ${symbol}  nến=${candles.length}  src=${source}`);
      return { symbol, candles };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${symbol}  LỖI ${msg} — retry`);
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
        console.log(`  ${symbol}  nến=${candles.length}  src=${source} (retry)`);
        return { symbol, candles };
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        console.log(`  ${symbol}  LỖI ${msg2}`);
        return { symbol, candles: [] };
      }
    }
  });
  const ok = series.filter((s) => s.candles.length >= 80);
  const report = stabilityFromCandles({ interval: INTERVAL, days: DAYS, series: ok });
  printReport(report);
  await mkdir("/workspace/artifacts", { recursive: true });
  await writeFile("/workspace/artifacts/predict-stability.json", JSON.stringify(report, null, 2), "utf8");
  console.log("wrote artifacts/predict-stability.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
