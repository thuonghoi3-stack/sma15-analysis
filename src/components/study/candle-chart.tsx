import { useEffect, useRef } from "react";
import type { ChartCandle } from "@/lib/market/types";
import { formatPrice, formatTimeVn } from "@/lib/format";

type Props = {
  candles: ChartCandle[];
  symbol: string;
};

export function CandleChart({ candles, symbol }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const draw = () => {
      const cssW = wrap.clientWidth;
      const cssH = wrap.clientHeight;
      if (cssW < 40 || cssH < 40) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const styles = getComputedStyle(document.documentElement);
      const fg = styles.getPropertyValue("--color-fg").trim() || "#ecece6";
      const muted = styles.getPropertyValue("--color-muted").trim() || "#8f938a";
      const subtle = styles.getPropertyValue("--color-subtle").trim() || "#6a6e67";
      const smaC = styles.getPropertyValue("--color-sma").trim() || "#8ea0b5";
      const up = styles.getPropertyValue("--color-up").trim() || "#6f9a7c";
      const down = styles.getPropertyValue("--color-down").trim() || "#c56b5c";
      const dip = styles.getPropertyValue("--color-dip").trim() || "#c56b5c";
      const bg = styles.getPropertyValue("--color-surface").trim() || "#121418";

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, cssW, cssH);

      const padL = 8;
      const padR = 62;
      const padT = 16;
      const padB = 28;
      const plotW = cssW - padL - padR;
      const plotH = cssH - padT - padB;
      if (candles.length < 2 || plotW < 10) {
        ctx.fillStyle = muted;
        ctx.font = "13px IBM Plex Sans, sans-serif";
        ctx.fillText("Chưa có nến để vẽ", 16, cssH / 2);
        return;
      }

      const pxPer = plotW / candles.length;
      const vis = candles.length > plotW / 3
        ? candles.slice(-Math.max(60, Math.floor(plotW / 3.2)))
        : candles;
      const w = plotW / vis.length;

      let lo = Infinity;
      let hi = -Infinity;
      for (const c of vis) {
        lo = Math.min(lo, c.l);
        hi = Math.max(hi, c.h);
        if (c.sma != null) {
          lo = Math.min(lo, c.sma);
          hi = Math.max(hi, c.sma);
        }
      }
      const span = hi - lo || 1;
      const pad = span * 0.06;
      lo -= pad;
      hi += pad;
      const y = (price: number) => padT + ((hi - price) / (hi - lo)) * plotH;

      // dip bands
      ctx.fillStyle = hexAlpha(dip, 0.12);
      let bandStart: number | null = null;
      vis.forEach((c, i) => {
        if (c.inDip && bandStart == null) bandStart = i;
        const end = !c.inDip || i === vis.length - 1;
        if (bandStart != null && end) {
          const last = c.inDip && i === vis.length - 1 ? i : i - 1;
          const x0 = padL + bandStart * w;
          const x1 = padL + (last + 1) * w;
          ctx.fillRect(x0, padT, x1 - x0, plotH);
          bandStart = null;
        }
      });

      // grid
      ctx.strokeStyle = hexAlpha(subtle, 0.35);
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      const ticks = 4;
      ctx.font = "11px IBM Plex Mono, ui-monospace, monospace";
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= ticks; i++) {
        const price = hi - ((hi - lo) * i) / ticks;
        const yy = padT + (plotH * i) / ticks;
        ctx.beginPath();
        ctx.moveTo(padL, yy);
        ctx.lineTo(padL + plotW, yy);
        ctx.stroke();
        ctx.fillText(formatPrice(price), padL + plotW + 8, yy);
      }
      ctx.setLineDash([]);

      vis.forEach((c, i) => {
        const x = padL + i * w + w / 2;
        const upBar = c.c >= c.o;
        ctx.strokeStyle = upBar ? up : down;
        ctx.fillStyle = upBar ? up : down;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y(c.h));
        ctx.lineTo(x, y(c.l));
        ctx.stroke();
        const bodyH = Math.max(1, Math.abs(y(c.c) - y(c.o)));
        const bodyY = Math.min(y(c.c), y(c.o));
        const bw = Math.max(1.2, w * 0.62);
        ctx.fillRect(x - bw / 2, bodyY, bw, bodyH);
      });

      ctx.beginPath();
      let started = false;
      vis.forEach((c, i) => {
        if (c.sma == null) return;
        const x = padL + i * w + w / 2;
        if (!started) {
          ctx.moveTo(x, y(c.sma));
          started = true;
        } else ctx.lineTo(x, y(c.sma));
      });
      ctx.strokeStyle = smaC;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = muted;
      ctx.font = "11px IBM Plex Sans, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const first = vis[0]!;
      const last = vis[vis.length - 1]!;
      ctx.fillText(formatTimeVn(first.t), padL, cssH - 8);
      ctx.textAlign = "right";
      ctx.fillText(formatTimeVn(last.t), padL + plotW, cssH - 8);

      ctx.fillStyle = fg;
      ctx.textAlign = "left";
      ctx.font = "500 12px IBM Plex Sans, sans-serif";
      ctx.fillText(`${symbol} · SMA15`, padL, 14);
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [candles, symbol]);

  return (
    <div ref={wrapRef} className="h-64 w-full sm:h-80">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return `rgba(197,107,92,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
