import { mkdir, writeFile } from "node:fs/promises";
import { fetchKlines } from "./fetch-klines.server.ts";
import { extractRows } from "./predict.ts";
import { assembleHetero, type HeteroReport } from "./hetero.ts";
import { LOCKED_90 } from "./residuals.ts";
import { SYMBOLS } from "./symbols.ts";
import type { Interval } from "./types.ts";

const INTERVAL: Interval = "5m";
const DAYS = 90;
const CONCURRENCY = 2;

function fmt(n: number, d = 2): string {
  return Number.isFinite(n) ? n.toFixed(d) : "—";
}

function pfmt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n < 0.0001) return "<1e-4";
  return n.toFixed(4);
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

function print(u: HeteroReport) {
  console.log(`\n=== Heteroskedasticity · ${u.nSymbols} cặp · ${u.n} nhịp ===`);
  console.log(`|e|~depth r=${fmt(u.corrAbsDepth)}  |e|~μ r=${fmt(u.corrAbsFitted)}  e²~depth r=${fmt(u.corrSqDepth)}`);
  console.log(`Bỏ nến sàn (bars=1, ${(u.floorShare * 100).toFixed(0)}%): |e|~depth r=${fmt(u.corrAbsDepthNoFloor)}`);
  console.log(`BP  LM=${fmt(u.bp.lm, 1)}  R²=${fmt(u.bp.r2, 3)}  df=${u.bp.df}  p=${pfmt(u.bp.p)}`);
  console.log(`White LM=${fmt(u.white.lm, 1)}  R²=${fmt(u.white.r2, 3)}  df=${u.white.df}  p=${pfmt(u.white.p)}`);
  console.log(
    `Goldfeld-Quandt varH/varL=${fmt(u.gq.ratio)}  μH/μL=${fmt(u.gq.meanRatio)}  (μH/μL)²=${fmt(u.gq.sqMeanRatio)}  n ${u.gq.nLow}/${u.gq.nHigh}`,
  );
  console.log(`log|e| ~ γ log(depth)  γ=${fmt(u.gamma)}  a=${fmt(u.gammaIntercept)}`);
  console.log("\nScale sau studentize  |e*|~depth (càng gần 0 càng đúng)");
  for (const s of u.scales) {
    const mark = s.name === u.bestScale ? " ←" : "";
    console.log(`  ${s.name.padEnd(10)}  γ=${fmt(s.gamma)}  r=${fmt(s.corrAbs, 3)}  BP p=${pfmt(s.bpP)}${mark}`);
  }
  console.log("\nMean model OOS MAE");
  for (const m of u.means) {
    console.log(
      `  ${m.name.padEnd(6)}  ${fmt(m.intercept)} + ${fmt(m.depth)}×d ${m.name === "quad" ? `+ ${fmt(m.depth2)}×d² ` : ""}+ ${fmt(m.ema)}×ema   MAE ${fmt(m.maeOos)}  mean e bucket [${m.meanResByDepth.map((v) => fmt(v, 2)).join(", ")}]`,
    );
  }
  console.log(`OOS nTest=${u.oos.nTest}  OLS ${fmt(u.oos.ols)}  WLS ${fmt(u.oos.wls)}  quad ${fmt(u.oos.quad)}`);
  console.log("\nBUCKET".padEnd(12), "N".padStart(6), "μ y".padStart(6), "σ y".padStart(6), "μ e".padStart(7), "σ e".padStart(6), "MAE".padStart(6), "P50".padStart(5), "P75".padStart(5), "P90".padStart(5), "floor".padStart(6), "slack");
  for (const b of u.bins) {
    const lab = b.hi == null ? `${b.lo}×+` : `${b.lo}–${b.hi}×`;
    console.log(
      lab.padEnd(12),
      String(b.n).padStart(6),
      fmt(b.meanBars).padStart(6),
      fmt(b.stdBars).padStart(6),
      fmt(b.meanRes).padStart(7),
      fmt(b.stdRes).padStart(6),
      fmt(b.mae).padStart(6),
      fmt(b.p50Abs, 1).padStart(5),
      fmt(b.p75Abs, 1).padStart(5),
      fmt(b.p90Abs, 1).padStart(5),
      `${(b.shareFloor * 100).toFixed(0)}%`.padStart(6),
      `±${b.slack}`,
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
  const report = assembleHetero({
    symbols: series.filter((s) => s.rows.length),
    locked: LOCKED_90,
  });
  print(report);
  await mkdir("/workspace/artifacts", { recursive: true });
  await writeFile("/workspace/artifacts/predict-hetero.json", JSON.stringify(report, null, 2), "utf8");
  console.log("wrote artifacts/predict-hetero.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
