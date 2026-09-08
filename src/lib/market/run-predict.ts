import { mkdir, writeFile } from "node:fs/promises";
import { fetchKlines } from "./fetch-klines.server.ts";
import { assembleUniverse, fitPacked, type UniversePredict } from "./predict.ts";
import { SYMBOLS } from "./symbols.ts";
import type { Interval } from "./types.ts";

const INTERVAL: Interval = "5m";
const DAYS = 30;
const CONCURRENCY = 2;

function fmt(n: number, d = 2): string {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function pct(n: number, d = 1): string {
  return Number.isFinite(n) ? `${(n * 100).toFixed(d)}%` : "—";
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

function printUniverse(u: UniversePredict) {
  console.log(`\n=== Mô hình hồi nến · ${u.nOk}/${u.nSymbols} cặp · ${u.interval} · ${u.days}d ===\n`);
  console.log(
    "SYMBOL".padEnd(10),
    "Nsig".padStart(5),
    "P50×".padStart(6),
    "P50n".padStart(5),
    "slope".padStart(6),
    "emaC".padStart(6),
    "OOS".padStart(6),
    "nav".padStart(6),
    "pool".padStart(6),
    "win".padEnd(10),
    "E1.25".padStart(7),
    "WR".padStart(6),
    "nF".padStart(4),
    "EMA",
  );
  for (const r of u.models) {
    if (r.error) {
      console.log(r.symbol.padEnd(10), r.error);
      continue;
    }
    const ols = r.models.find((m) => m.name === "olsMax");
    console.log(
      r.symbol.padEnd(10),
      String(r.nSignal).padStart(5),
      fmt(r.p50DumpAtr, 2).padStart(6),
      fmt(r.p50Bars, 0).padStart(5),
      fmt(ols?.coefs?.depth ?? NaN, 2).padStart(6),
      fmt(ols?.coefs?.ema ?? NaN, 2).padStart(6),
      fmt(ols?.mae ?? NaN, 2).padStart(6),
      fmt(r.naiveMae, 2).padStart(6),
      fmt(r.pooledMae, 2).padStart(6),
      r.winner.padEnd(10),
      fmt(r.fade.expectancy, 3).padStart(7),
      pct(r.fade.winRate, 0).padStart(6),
      String(r.fade.n).padStart(4),
      String(r.emaPeriod),
    );
  }
  console.log("\nMAE OOS trung bình:");
  for (const [k, v] of Object.entries(u.meanOosMae)) {
    console.log(`  ${k.padEnd(10)} ${fmt(v, 3)}`);
  }
  console.log("\nWinner share:", u.winnerShare);
  console.log(
    `Pooled OLS  bars = ${fmt(u.pooledCoefs?.intercept ?? NaN, 2)} + ${fmt(u.pooledCoefs?.depth ?? NaN, 2)}×ATR + ${fmt(u.pooledCoefs?.ema ?? NaN, 2)}×EMA14`,
  );
  console.log(`Δ MAE pooled − per-symbol olsMax: ${fmt(u.perVsPooled, 3)}`);
  console.log(`Δ MAE BTC-transfer − per-symbol:  ${fmt(u.perVsBtc, 3)}`);
  console.log("\nFade 1.25× EMA14 (in-sample, occupancy ≥ 20):");
  for (const f of u.fadeRank) {
    console.log(`  ${f.symbol.padEnd(10)} n=${String(f.n).padStart(3)}  E=${fmt(f.expectancy, 3)}%  WR=${pct(f.winRate, 0)}`);
  }
  console.log("\nLIVE (đang dưới SMA thì skip nếu pred≤2):");
  for (const r of u.models) {
    if (r.error || !r.live.below) continue;
    console.log(
      `  ${r.symbol.padEnd(10)} depth=${fmt(r.live.depth, 2)}×  emaUp=${r.live.emaUp}  pred=${fmt(r.live.predBars, 1)}  skip=${r.live.skip}`,
    );
  }
  console.log(`\nKết luận: ${u.verdict}\n`);
}

async function main() {
  const symbols = SYMBOLS.map((s) => s.id);
  console.log(`Tải ${symbols.length} cặp ${INTERVAL} ${DAYS}d…`);
  const packed = await mapPool(symbols, CONCURRENCY, async (symbol) => {
    try {
      const { candles, source } = await fetchKlines({ symbol, interval: INTERVAL, days: DAYS });
      const p = fitPacked({ symbol, candles, interval: INTERVAL, days: DAYS, source });
      console.log(`  ${symbol}  nến=${candles.length}  signal=${p.report.nSignal}  src=${source}`);
      return p;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ${symbol}  LỖI ${msg}`);
      const failed = fitPacked({
        symbol,
        candles: [],
        interval: INTERVAL,
        days: DAYS,
      });
      failed.report.error = msg;
      return failed;
    }
  });

  const universe = assembleUniverse(packed, INTERVAL, DAYS);
  printUniverse(universe);
  await mkdir("/workspace/artifacts", { recursive: true });
  await writeFile(
    "/workspace/artifacts/predict-universe.json",
    JSON.stringify(universe, null, 2),
    "utf8",
  );
  console.log("wrote artifacts/predict-universe.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
