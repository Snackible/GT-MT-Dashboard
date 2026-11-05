import { useMemo, useState } from "react";
import Donut from "./Donut";
import { downloadCsv } from "../lib/csv";
import { fmtINR } from "../lib/format";

const DEFAULT_THRESHOLDS = [{ v: 30, label: "30+ days" }, { v: 60, label: "60+ days" }, { v: 90, label: "90+ days" }];

/**
 * Name-wise sales table with CSV download, a share-of-sales donut and "gone quiet" outliers pinned on top.
 * rows: [{ name, sales, orders?, aov?, last?: string, idle?: number|null }]
 *   idle = time since the last order in `idleUnit`; `last` is the display text for the last order.
 */
export default function NameWiseTable({
  title, nameLabel, noun, rows, filename, metaNote,
  idleUnit = "days", thresholds = DEFAULT_THRESHOLDS, defaultThreshold = 1,
}) {
  const hasOrders = rows.some((r) => r.orders != null);
  const hasIdle = rows.some((r) => r.idle != null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "sales", dir: -1 });
  const [thrIdx, setThrIdx] = useState(Math.min(defaultThreshold, thresholds.length - 1));
  const [outliersFirst, setOutliersFirst] = useState(true);
  const threshold = thresholds[thrIdx].v;
  const isOutlier = (r) => r.idle != null && r.idle >= threshold;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => !q || r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const outliers = useMemo(() => filtered.filter(isOutlier).sort((a, b) => b.idle - a.idle), [filtered, threshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = useMemo(() => {
    const val = (r) => (sort.key === "idle" ? r.idle ?? -1 : r[sort.key]);
    const list = filtered.slice().sort((a, b) => {
      const av = val(a), bv = val(b);
      return (typeof av === "string" ? av.localeCompare(bv) : (av ?? 0) - (bv ?? 0)) * sort.dir;
    });
    if (!outliersFirst || !hasIdle) return list;
    const out = list.filter(isOutlier).sort((a, b) => b.idle - a.idle);
    return [...out, ...list.filter((r) => !isOutlier(r))];
  }, [filtered, sort, outliersFirst, threshold, hasIdle]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "name" ? 1 : -1 }));
  const th = (key, label, right) => (
    <th className={"sortable" + (sort.key === key ? " on" : "")} style={right ? { textAlign: "right" } : undefined} onClick={() => toggle(key)}>
      {label}{sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
    </th>
  );
  const idleText = (n) => (n == null ? "—" : `${n} ${idleUnit === "days" ? "d" : "mo"}`);

  const download = () => {
    const cols = [
      { label: nameLabel, value: (r) => r.name },
      ...(hasOrders ? [{ label: "Orders", value: (r) => r.orders }] : []),
      { label: "Sales (INR)", value: (r) => Math.round(r.sales) },
      ...(hasOrders ? [{ label: "Avg Order (INR)", value: (r) => Math.round(r.aov || 0) }] : []),
      ...(hasIdle ? [{ label: "Last Order", value: (r) => r.last || "" }, { label: `Idle (${idleUnit})`, value: (r) => r.idle ?? "" }] : []),
    ];
    downloadCsv(filename, cols, sorted);
  };

  const colSpan = 2 + (hasOrders ? 2 : 0) + (hasIdle ? 2 : 0);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">{title}</span>
          <span className="card-meta" style={{ marginLeft: 10 }}>{sorted.length} {noun}{sorted.length === 1 ? "" : "s"}{metaNote ? ` · ${metaNote}` : ""}</span>
        </div>
        <button className="fchip" onClick={download} disabled={sorted.length === 0}>⬇ Download CSV</button>
      </div>

      {hasIdle && (
        <div className="outlier-strip">
          <div className="outlier-head">
            <span><b>Gone quiet</b> · no order in</span>
            <select className="fchip fselect-sm" value={thrIdx} onChange={(e) => setThrIdx(Number(e.target.value))}>
              {thresholds.map((t, i) => <option key={t.v} value={i}>{t.label}</option>)}
            </select>
            <span className="outlier-count">{outliers.length} of {filtered.length} {noun}{filtered.length === 1 ? "" : "s"}</span>
            <label className="outlier-toggle">
              <input type="checkbox" checked={outliersFirst} onChange={(e) => setOutliersFirst(e.target.checked)} /> Outliers first in table
            </label>
          </div>
          {outliers.length === 0 ? (
            <div className="muted">Everyone has ordered within the last {threshold} {idleUnit === "days" ? "days" : "months"}.</div>
          ) : (
            <div className="outlier-chips">
              {outliers.slice(0, 8).map((o) => (
                <span key={o.name} className="outlier-chip" title={`Last order ${o.last || "unknown"}`}>
                  {o.name.length > 26 ? o.name.slice(0, 25) + "…" : o.name} <b>{idleText(o.idle)}</b>
                </span>
              ))}
              {outliers.length > 8 && <span className="muted">+{outliers.length - 8} more in the table</span>}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <input className="fchip" style={{ background: "var(--panel-1)", width: "100%", maxWidth: 320, cursor: "text" }} placeholder={`Search ${noun}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="namewise-grid">
        <div style={{ maxHeight: 440, overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                {th("name", nameLabel)}
                {hasOrders && th("orders", "Orders", true)}
                {th("sales", "Sales", true)}
                {hasOrders && th("aov", "Avg Order", true)}
                {hasIdle && <th>Last order</th>}
                {hasIdle && th("idle", "Idle", true)}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={colSpan} className="empty-row">No {noun}s match this filter</td></tr>
              ) : (
                sorted.map((r) => (
                  <tr key={r.name} className={isOutlier(r) ? "row-outlier" : undefined}>
                    <td>{isOutlier(r) && <span className="statusdot s-bad" title="No recent order" />}{r.name}</td>
                    {hasOrders && <td className="num">{r.orders}</td>}
                    <td className="num">{fmtINR(r.sales)}</td>
                    {hasOrders && <td className="num">{fmtINR(r.aov || 0)}</td>}
                    {hasIdle && <td style={{ color: "#9AA4B2" }}>{r.last || "—"}</td>}
                    {hasIdle && <td className="num" style={{ color: isOutlier(r) ? "#F87171" : undefined }}>{idleText(r.idle)}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div>
          <div className="namewise-donut-title">Share of sales</div>
          <Donut items={filtered.map((r) => ({ name: r.name, value: r.sales }))} />
        </div>
      </div>
    </div>
  );
}
