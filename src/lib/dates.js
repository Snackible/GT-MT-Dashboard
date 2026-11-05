const DAY = 86400000;

// "2026-10-13" -> Date (UTC midnight), or null
export const parseIso = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};

// Whole days from an ISO date to today (UTC), or null when the date is missing.
export const daysSince = (iso, today = new Date()) => {
  const d = parseIso(iso);
  if (!d) return null;
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.max(0, Math.round((t - d.getTime()) / DAY));
};

// "2026-10-13" -> "13/10/2026"
export const fmtDmy = (iso) => (parseIso(iso) ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

// "13.10.2026" (SAP style) -> "2026-10-13"
export const dmyDotToIso = (s) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(s || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

// Months between two "YYYY-MM" keys (b - a).
export const monthsBetween = (a, b) => {
  const pa = /^(\d{4})-(\d{2})$/.exec(a || ""), pb = /^(\d{4})-(\d{2})$/.exec(b || "");
  return pa && pb ? (+pb[1] - +pa[1]) * 12 + (+pb[2] - +pa[2]) : null;
};
