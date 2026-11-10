import type { Line } from "./api";

export const DAY = 864e5;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ms = (t: number | string) => (typeof t === "number" ? t : new Date(t).getTime());

/** Whole rupees, Indian grouping, no ".00". */
export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export const fmtTime = (t: number | string) => {
  const d = new Date(ms(t));
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() >= 12 ? "pm" : "am"}`;
};

export const fmtDate = (t: number | string) => {
  const d = new Date(ms(t));
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};

/** "2026-11-12" -> "12 Nov 2026" */
export const fmtDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MON[m - 1]} ${y}`;
};

export const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const toMs = ms;
export const itemsTotal = (items: Line[]) => items.reduce((a, i) => a + i.qty * i.price, 0);
