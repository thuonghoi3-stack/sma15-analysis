# SMA15 Lab

Lab nghiên cứu fade mean-reversion trên nến **5m**: giá sập dưới **SMA15** bao nhiêu (chuẩn hóa **ATR14**) trước khi hồi, và khi nào được phép vào lệnh.

Nến thật từ Binance / MEXC / OKX / Bitget. Dashboard **quét 14 cặp mỗi 20 giây** và báo entry trên nến 5m đang chạy.

## Kết luận đã khóa

Công thức dự đoán số nến hồi (OLS pooled, 14 cặp × 90 ngày):

```
nến ≈ −0.28 + 4.67 × (độ sâu ATR) − 0.36 × EMA14_up
```

- **σ ≈ 0.5 × pred** (nhiễu nhân, không phải Poisson). Slack TP theo độ sâu, không cố định 2 nến.
- Serial residual **DW ≈ 2.0** theo từng coin — không cần AR(1).
- Hệ số ổn định 90 ngày (CV slope ~3%). Không thay locked sau khi quét 16 spec OLS (volume / LAD / WLS / log / depth² đều không vượt SE).
- Fade **không có expectancy dương** sau phí nếu không lọc trend. EMA14 up là cửa bắt buộc; sweet-spot độ sâu **1.25–1.5× ATR** (cửa live 1.15–1.75×).
- SMA14 thắng EMA14 khi so period khớp. Volume climax ≥ 2.5× **làm xấu** WR. BB squeeze làm xấu; xuyên BB dưới hơi tốt hơn nhưng n mỏng.

---

## Cơ chế scan

Scanner **không** chạy nghiên cứu 30 ngày. Nó chỉ lấy **400 nến 5m gần nhất** / cặp, đo nến **đang mở hoặc vừa đóng**, rồi xếp trạng thái.

### Luồng

```
UI (20s) ──GET /api/scan──► runScan
                              │
                              ├─ 14 cặp, concurrency 3
                              ├─ fetchRecentKlines (Binance → MEXC → OKX → Bitget)
                              ├─ evaluateScan: SMA15, ATR14, EMA14, BB20, vol SMA20
                              ├─ predLocked: −0.28 + 4.67×depth − 0.36×EMA_up
                              └─ classifyLive → entry | near | blocked | flat | error
```

| Tầng | File | Việc |
|---|---|---|
| UI | `scanner-panel.tsx` | Client-only. `fetch("/api/scan")` mỗi 20s. Thẻ Vào lệnh, Gần ngưỡng, bảng cửa, chuông trình duyệt. Bấm cặp → tải study. |
| HTTP | `src/routes/api/scan.ts` | `GET /api/scan`. JSON + `s-maxage=15`. |
| Orchestrator | `load-scan.ts` | Cache in-memory 20s, gộp request trùng (`inflight`). |
| Chấm nến | `scan.ts` | Chỉ import indicator + `ols-locked` — **không** kéo `analyze` / `predict`. |
| Công thức | `ols-locked.ts` | Ba hệ số khóa. |

### Chỉ báo trên nến hiện tại

| Tín hiệu | Công thức |
|---|---|
| `below` | `low < SMA15` |
| `depth` | `(SMA15 − low) / ATR14` |
| `emaUp` | `close > EMA14` |
| `predBars` | `clamp(−0.28 + 4.67×depth − 0.36×emaUp, 1, 48)` |
| `sigma` / `slack` | `0.5 × pred` · `max(1, round(sigma))` |
| `tpBars` | `max(1, round(pred) − 2)` — thoát trước khi reclaim SMA |
| `squeeze` | percentile độ rộng BB20 (288 nến) ≤ 20% |
| `climax` | volume ≥ 2.5× SMA20(volume) |
| `bbBelowLower` | `low < BB lower` (cộng điểm, không phải cửa) |

### Cửa xếp hạng (`classifyLive`)

Đủ **hết** mới `entry`. Thiếu một cửa → `blocked`. Giá trên SMA → `flat`.

| Cửa | Điều kiện entry | Ghi chú |
|---|---|---|
| Trend | `close > EMA14` | Bắt buộc. Close dưới EMA = không fade. |
| Độ sâu | **1.15 – 1.75× ATR** | Sweet-spot backtest 1.25–1.5×, nới hai bên. |
| Hồi | `pred > 2` nến | Pred ≤ 2 thì skip (TP không còn chỗ). |
| BB | không squeeze | Squeeze làm xấu E. |
| Volume | không climax ≥ 2.5× | Mua lúc xả lớn làm xấu WR. |

**Gần ngưỡng (`near`):** cùng trend / pred / không squeeze / không climax, nhưng depth **0.70–1.15×** (đang tiến tới) hoặc **1.75–2.20×** (hơi sâu hơn sweet-spot).

**Blocked** thêm: depth < 0.70 (nông) hoặc > 2.20 (dump quá sâu).

### Điểm ưu tiên (chỉ `entry`)

```
score = 0.7 × (1 − |depth − 1.35| / 0.55)
      + 0.3 × (pred ∈ [3, 10] ? 1 : 0.55)
      + 0.12 nếu xuyên BB dưới
```

Gần **1.35× ATR** được ưu tiên. UI sắp thẻ theo `score`.

### Thông báo

- Title tab: `(n) Entry · SMA15 Lab` khi có entry.
- Nút chuông: `Notification.requestPermission`. Cặp **mới** chuyển sang `entry` (không phải lần quét đầu) → notification `N cặp entry fade 5m`.
- Countdown tới nến 5m kế (`nextBar`).

### Deploy

Panel scanner **không** được import server-fn / pipeline nghiên cứu — nếu kéo `predict` → `analyze`, bundler Vercel từng loại mất UI. Endpoint HTTP tách riêng để client luôn vẽ được khung “Quét nến 5m” dù API chậm.

```bash
curl -s https://<host>/api/scan | jq '.nEntry, [.rows[] | {label,status,depth}]'
```

---

## Chạy

```bash
npm install
npm run dev          # dashboard :8080
```

Test thị trường:

```bash
node --experimental-strip-types --test src/lib/market/*.test.ts
```

Runner nghiên cứu (fetch 90 ngày, ghi `artifacts/`):

```bash
node --experimental-strip-types src/lib/market/run-predict.ts
node --experimental-strip-types src/lib/market/run-stability.ts
node --experimental-strip-types src/lib/market/run-residuals.ts
node --experimental-strip-types src/lib/market/run-hetero.ts
node --experimental-strip-types src/lib/market/run-ols-tune.ts
```

Stack: TanStack Start + React + Tailwind v4. Không auth.

---

## Cấu trúc

```
src/lib/market/          lõi nghiên cứu + dự đoán + quét
src/components/study/    UI lab
src/lib/market/load-*.ts server functions (cache)
src/routes/api/scan.ts   GET /api/scan
src/routes/index.tsx     trang chính
```

---

## `src/lib/market` — từng module

### Nền tảng

| File | Việc |
|---|---|
| **`types.ts`** | Kiểu dùng chung: nến, dip, study, backtest, recovery, live state. |
| **`symbols.ts`** | 14 cặp, khung nến, hằng số: SMA15, ATR14, EMA14, RSI 7/21, CTI20, BB20±2σ, cửa scan 1.15–1.75×, `FORECAST_MIN_BARS=2`. |
| **`stats.ts`** | mean, stdev, quantile, Pearson, histogram. Dùng khắp OLS / hetero / recovery. |
| **`indicators.ts`** | SMA, EMA, ATR Wilder, RSI Wilder (phẳng = 50), CTI Ehlers, Bollinger, rank cửa sổ nhân quả. |
| **`volume.ts`** | `volRatio`, nến xả, dump ≥ k× SMA20(volume). Climax 2.5× là cửa **loại**, không phải cửa mua. |
| **`fetch-klines.server.ts`** | Tải kline: Binance → MEXC → OKX → Bitget. `fetchKlines` (nhiều ngày) và `fetchRecentKlines` (1 request, dùng scanner). |
| **`ols-locked.ts`** | Ba hệ số OLS khóa + `predLocked`. Scanner import file này, không import `predict.ts`. |

### Phát hiện dip & nghiên cứu một cặp

| File | Việc |
|---|---|
| **`analyze.ts`** | `detectDips`: nhịp sập dưới SMA15, đo max undershoot % và ×ATR, hồi trong 4h. `runStudy` gắn mọi báo cáo (backtest, recovery, EMA tune, OLS tune, BB, osc…). |
| **`load-study.ts`** | Server fn POST, cache ~2 phút. Dashboard gọi khi đổi cặp / khung / số ngày. |
| **`recovery.ts`** | Lưới số nến hồi theo bucket độ sâu × trend. OLS slope ~4.7 nến/ATR. Forecast P50/P75 cho nến live. |
| **`backtest.ts`** | Fade: fill limit SMA − k×ATR, stop 1.5×ATR, thoát SMA/EMA hoặc time stop, phí 4 bps/side. Bỏ lệnh nếu pred ≤ 2 nến; TP = pred − 2. Lưới k × trend. |
| **`volume.ts` + analyze** | Hai mode: skip dump, hoặc **require** climax (giả thuyết mua xả — đã bác). |

### Bộ lọc & so sánh

| File | Việc |
|---|---|
| **`ema-tune.ts`** | Quét EMA 8…50, walk-forward hai nửa, chọn period có `min(E1,E2)` lớn nhất. Thắng: **EMA14**. |
| **`ma-type.ts`** | SMA(n) vs EMA(n) cùng period. **SMA14** thắng về WR/ổn định; live vẫn dùng EMA14 (cửa close > EMA). |
| **`trend-compare.ts`** | SMA50 vs EMA20 (rồi EMA14) làm lọc trend. |
| **`osc-compare.ts`** | RSI7 + RSI21 + CTI20. Cửa tốt: RSI chậm không quá nóng, **CTI ≤ 0**. |
| **`depth-sweep.ts`** | Quét k ∈ {0.5…2.5}×ATR. Sweet-spot E ~ **1.25–1.5×**; occupancy giảm khi k tăng. |
| **`bb-width.ts`** | BB20 k=2, percentile 288 nến. Squeeze (P≤20) làm xấu E. `belowLower` hơi tốt hơn baseline, n mỏng. |

### Mô hình dự đoán (OLS)

| File | Việc |
|---|---|
| **`predict.ts`** | Hàng sự kiện: `depthMax`, `emaUp`, `bars`. OLS `bars ~ 1 + depth + ema`. `predictOls` kẹp [1, 48]. Pooled thắng per-symbol. First-touch kém max-so-far. |
| **`residuals.ts`** | Residual vs locked. Durbin–Watson, ACF, Ljung–Box. Per-coin DW≈2; calendar-pooled có AC vì cluster thị trường. Re-export `LOCKED_90`. |
| **`stability.ts`** | 90 ngày: 3×30n, rolling 30n bước 7n, train60/test30. Slope 4.50–4.88, grade **stable**. |
| **`hetero.ts`** | Breusch–Pagan, White, Goldfeld–Quandt, γ từ `log\|e\| ~ γ log(depth)`. σ ∝ độ sâu (γ≈0.82). WLS không sửa điểm. Slack P75 theo bucket. |
| **`ols-tune.ts`** | 16 spec: OLS / WLS / LAD / log / √ / depth² / winsor / fit-cửa / lưới MAE. Chọn theo MAE cửa fade; chỉ **replace** locked nếu Δ ≥ max(0.20, SE). Kết luận: **giữ locked**. |

### Scanner live

| File | Việc |
|---|---|
| **`scan.ts`** | `evaluateScan` + `classifyLive`. Trạng thái `entry` / `near` / `blocked` / `flat` / `error`. |
| **`load-scan.ts`** | `runScan`: 14 cặp × 400 nến 5m, cache 20s, concurrency 3. |
| **`src/routes/api/scan.ts`** | `GET /api/scan` cho UI và curl. |

### Runner CLI (không UI)

| File | Việc |
|---|---|
| `run-predict.ts` | 30d, MAE / coef / OOS theo cặp. |
| `run-stability.ts` | 90d, rolling OLS. |
| `run-residuals.ts` | DW / ACF / hetero sơ bộ. |
| `run-hetero.ts` | Heteroskedasticity chi tiết + slack. |
| `run-ols-tune.ts` | Quét spec OLS, ghi `artifacts/ols-tune.json`. |

---

## `src/components/study` — UI

| File | Việc |
|---|---|
| **`dashboard.tsx`** | Trang lab: header, scanner, chọn cặp/khung/ngày, KPI, chart, lần lượt các panel. |
| **`scanner-panel.tsx`** | Quét 14 cặp. Thẻ **Vào lệnh**, hàng Gần ngưỡng, bảng cửa. Chuông thông báo trình duyệt. Bấm cặp → tải study. |
| **`candle-chart.tsx`** | Nến canvas + SMA + dải dip. |
| **`histogram.tsx`** | Phân phối độ sâu % và ×ATR. |
| **`backtest-panel.tsx`** | Sổ lệnh, equity, expectancy, profit factor. |
| **`edge-panel.tsx`** | Lưới ATR × trend. |
| **`depth-panel.tsx`** | Sweep k×ATR. |
| **`bb-panel.tsx`** | Squeeze / expand / belowLower. |
| **`trend-compare-panel.tsx`** | SMA50 vs EMA. |
| **`osc-panel.tsx`** | RSI nhanh/chậm + CTI. |
| **`recovery-panel.tsx`** | Heatmap nến hồi × độ sâu × trend. |
| **`ema-tune-panel.tsx`** | Bảng period EMA, walk-forward. |
| **`ma-type-panel.tsx`** | SMA vs EMA cùng period. |
| **`ols-tune-panel.tsx`** | 16 spec OLS vs locked trên cặp đang xem. |

---

## Luồng dữ liệu nghiên cứu (một cặp)

```
klines (7–90 ngày) ──► detectDips ──► recovery / OLS rows
                              │
                              ├── backtest (k, EMA, skip pred≤2, TP pred−2)
                              └── study UI
```

Scanner là đường riêng: 400 nến live → `GET /api/scan`. Không dùng `detectDips`.

---

## Cặp mặc định

BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, LINK, SUI, NEAR, APT, ARB, LTC — USDT.

---

## Occupancy / in-sample

Mọi bảng backtest trên dashboard là **một cặp, cửa sổ đang chọn** (thường 30 ngày). Công thức OLS khóa từ **14 cặp × 90 ngày**, OOS theo thời gian. Không coi expectancy dương trên mẫu hẹp là edge out-of-sample.
