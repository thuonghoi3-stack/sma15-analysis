const VN = "vi-VN";
const TZ = "Asia/Ho_Chi_Minh";

export function formatPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatSignedPct(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const body = `${Math.abs(n).toFixed(digits)}%`;
  if (n > 0) return `+${body}`;
  if (n < 0) return `−${body}`;
  return body;
}

export function formatAtrMul(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}× ATR`;
}

export function formatNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPrice(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (n >= 1) return n.toFixed(4);
  return n.toPrecision(4);
}

export function formatInt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function formatTimeVn(ms: number): string {
  return new Intl.DateTimeFormat(VN, {
    timeZone: TZ,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export function formatDateVn(ms: number): string {
  return new Intl.DateTimeFormat(VN, {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export function minutesLabel(mins: number): string {
  if (!Number.isFinite(mins)) return "—";
  if (mins < 60) return `${Math.round(mins)} phút`;
  const h = mins / 60;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)} giờ`;
  return `${(h / 24).toFixed(1)} ngày`;
}
