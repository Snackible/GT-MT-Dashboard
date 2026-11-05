// Tiny CSV export. `columns` is [{ label, value: (row) => cell }].
// Cells starting with = + - @ are prefixed with ' so Excel/Sheets never run them as formulas.
const esc = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsv(filename, columns, rows) {
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(",")).join("\n");
  // BOM so Excel opens ₹ and non-ASCII names correctly.
  const blob = new Blob(["﻿" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
