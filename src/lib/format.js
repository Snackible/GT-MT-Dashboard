export const fmtINR = (v) =>
  v >= 100000 ? "₹" + (v / 100000).toFixed(2) + "L" : "₹" + Math.round(v).toLocaleString("en-IN");

export const fmtAxis = (v) =>
  v >= 100000 ? "₹" + (v / 100000).toFixed(1) + "L" : "₹" + Math.round(v / 1000) + "K";

export const titleCase = (s) => s.replace(/\b(\w)/g, (c) => c.toUpperCase());

const NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2025-07" -> "Jul"
export const monthShort = (k) => {
  const m = /^(\d{4})-(\d{2})$/.exec(k || "");
  return m ? NAMES[+m[2] - 1] : k;
};

// "2025-07" -> "Jul 25"
export const monthLabel = (k) => {
  const m = /^(\d{4})-(\d{2})$/.exec(k || "");
  return m ? `${NAMES[+m[2] - 1]} ${m[1].slice(2)}` : k;
};

export const pctChange = (cur, prev) => {
  if (!(prev > 0)) return null;
  const p = ((cur - prev) / prev) * 100;
  return { text: (p >= 0 ? "+" : "") + p.toFixed(1) + "%", color: p >= 0 ? "#34D399" : "#F87171" };
};
