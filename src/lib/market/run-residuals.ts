import { mkdir, writeFile } from "node:fs/promises";
import { fetchKlines } from "./fetch-klines.server.ts";
import { extractRows } from "./predict.ts";
import { assembleResiduals, LOCKED_90, type ResidualReport } from "./residuals.ts";
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

function print(u: ResidualReport) {
  console.log(`\n=== Residual · ${u.nSymbols} cặp · ${u.n} nhịp · locked ${u.locked.depth}×ATR ===`);
  console.log(`Refit  : ${fmt(u.fitted.intercept)} + ${fmt(u.fitted.depth)}×ATR + ${fmt(u.fitted.ema)}×EMA`);
  console.log(`Mean ACF1 ${fmt(u.meanAcf1, 3)}  Mean DW ${fmt(u.meanDw)}  grade ${u.grade}`);
  const p = u.pooled;
  console.log(
    `Pooled DW ${fmt(p.dw)}  ACF1 ${fmt(p.acf[0]?.rho ?? NaN, 3)}  ACF2 ${fmt(p.acf[1]?.rho ?? NaN, 3)}  ACF3 ${fmt(p.acf[2]?.rho ?? NaN, 3)}`,
  );
  console.log(`Ljung-Box h=${p.lb.h}  Q=${fmt(p.lb.q, 1)}  p=${fmt(p.lb.p, 4)}`);
  console.log(`ACF1 nhịp sát (<1h) ${fmt(p.acf1Close, 3)}  n=${p.nClose}`);
  console.log(`|e| vs độ sâu r=${fmt(p.corrAbsDepth, 2)}  mean e=${fmt(p.mean, 3)}  σ=${fmt(p.std)}`);
  console.log("\nLAG  RHO (trung bình cặp)");
  const maxLag = Math.max(...u.symbols.map((s) => s.acf.length), 0);
  for (let k = 1; k <= Math.min(10, maxLag); k++) {
    const xs = u.symbols.map((s) => s.acf[k - 1]?.rho).filter((v): v is number => v != null && Number.isFinite(v));
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(`  ${String(k).padStart(3)}  ${fmt(avg, 3)}`);
  }
  console.log("\nSYMBOL".padEnd(10), "N".padStart(5), "DW".padStart(6), "ACF1".padStart(7), "LB p".padStart(8), "|e|~d".padStart(7), "close".padStart(7));
  for (const s of u.symbols) {
    console.log(
      s.symbol.padEnd(10),
      String(s.n).padStart(5),
      fmt(s.dw).padStart(6),
      fmt(s.acf[0]?.rho ?? NaN, 3).padStart(7),
      fmt(s.lb.p, 3).padStart(8),
      fmt(s.corrAbsDepth, 2).padStart(7),
      fmt(s.acf1Close, 3).padStart(7),
    );
  }
  console.log("\nĐỘ SÂU".padEnd(14), "N".padStart(6), "mean e".padStart(8), "MAE".padStart(6));
  for (const d of u.byDepth) {
    const lab = d.hi == null ? `${d.lo}×+` : `${d.lo}–${d.hi}×`;
    console.log(lab.padEnd(14), String(d.n).padStart(6), fmt(d.meanRes, 2).padStart(8), fmt(d.mae, 2).padStart(6));
  }
  console.log(`EMA up   n=${u.byEma.up.n}  mean e=${fmt(u.byEma.up.meanRes, 2)}  MAE=${fmt(u.byEma.up.mae)}`);
  console.log(`EMA down n=${u.byEma.down.n}  mean e=${fmt(u.byEma.down.meanRes, 2)}  MAE=${fmt(u.byEma.down.mae)}`);
  console.log(
    `\nCochrane–Orcutt  ρ=${fmt(u.lag1.rho, 3)}  MAE ${fmt(u.lag1.maeBase)} → ${fmt(u.lag1.maeRho)}  Δ ${fmt(u.lag1.delta, 3)}  nTest=${u.lag1.nTest}`,
  );
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
      return { symbol, rows: extractRows(candles, INTERVAL) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${symbol}  LỖI ${msg} — retry`);
      await new Promise((r) => setTimeout(r, 2500));
      try {
        const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
        console.log(`  ${symbol}  nến=${candles.length}  src=${source} (retry)`);
        return { symbol, rows: extractRows(candles, INTERVAL) };
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        console.log(`  ${symbol}  LỖI ${msg2}`);
        return { symbol, rows: [] };
      }
    }
  });
  const report = assembleResiduals({
    symbols: series.filter((s) => s.rows.length),
    locked: LOCKED_90,
  });
  print(report);
  await mkdir("/workspace/artifacts", { recursive: true });
  await writeFile("/workspace/artifacts/predict-residuals.json", JSON.stringify(report, null, 2), "utf8");
  console.log("wrote artifacts/predict-residuals.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
