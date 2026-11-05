import { useEffect, useMemo, useState } from "react";
import { useLazyApi } from "../lib/useApi";
import { fmtINR, monthLabel } from "../lib/format";
import { downloadCsv } from "../lib/csv";
import { fmtDmy } from "../lib/dates";
import { Field, Kpi, LoadingBanner } from "../components/ui";

const PAGE_SIZE = 20;
const STATUS = { ALREADY_CLEARED: "Cleared", OVER_DUE: "Overdue" };
const statusLabel = (s) => STATUS[s] || s || "—";

/**
 * RTV (returns to vendor). Source: the "Reliance RTV Data" Google Sheet, served by the `rtvData` backend action
 * (backend/rtv.gs). Each row is one credit note: { reference, docDate, amount, currency, dueDate, status, clearedOn, utr }.
 * RTV value = the AMOUNT column.
 */
export default function RtvView({ active, onLoading }) {
  const { data, loading, started } = useLazyApi("rtvData", active);
  useEffect(() => onLoading?.(loading), [loading, onLoading]);
  const allRows = data?.rows || [];
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(
    () => allRows.filter((r) => (status === "ALL" || r.status === status) && (!from || !r.docDate || r.docDate >= from) && (!to || !r.docDate || r.docDate <= to)),
    [allRows, status, from, to]
  );

  const k = useMemo(() => {
    const sum = (list) => list.reduce((s, r) => s + (r.amount || 0), 0);
    const cleared = rows.filter((r) => r.status === "ALREADY_CLEARED");
    const overdue = rows.filter((r) => r.status === "OVER_DUE");
    const monthly = {};
    rows.forEach((r) => { const m = (r.docDate || "").slice(0, 7); if (m) monthly[m] = (monthly[m] || 0) + (r.amount || 0); });
    return {
      total: sum(rows), count: rows.length, avg: rows.length ? sum(rows) / rows.length : 0,
      cleared: sum(cleared), clearedN: cleared.length, overdue: sum(overdue), overdueN: overdue.length,
      monthly: Object.entries(monthly).sort(([a], [b]) => (a < b ? -1 : 1)),
    };
  }, [rows]);

  const sorted = useMemo(() => rows.slice().sort((a, b) => (a.docDate < b.docDate ? 1 : -1)), [rows]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * PAGE_SIZE;
  const maxMonth = Math.max(...k.monthly.map(([, v]) => v), 1);
  const ready = !!data;
  const failed = started && !loading && !data;
  const dash = loading ? <span className="skeleton" /> : "-";
  const sub = (t) => <div className="kpi-sub"><span style={{ fontSize: 12, color: "var(--text-1)" }}>{t}</span></div>;

  const download = () =>
    downloadCsv(`rtv-credit-notes-${new Date().toISOString().slice(0, 10)}.csv`, [
      { label: "Reference", value: (r) => r.reference },
      { label: "Doc date", value: (r) => r.docDate },
      { label: "Amount (INR)", value: (r) => r.amount },
      { label: "Due date", value: (r) => r.dueDate },
      { label: "Status", value: (r) => statusLabel(r.status) },
      { label: "Cleared on", value: (r) => r.clearedOn },
      { label: "UTR", value: (r) => r.utr },
    ], sorted);

  return (
    <section className="data">
      <div className="shell">
        <div className="section-head">
          <div>
            <h2>Returns to Vendor · RTV</h2>
            <p>{ready && data.source ? `Source: ${data.source}` : "Credit-note value by document and month"}</p>
          </div>
        </div>

        <div className="filters filter-bar">
          <div className="filter-group">
            <span className="flabel">Status</span>
            <select className="fchip fselect" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="ALL">All</option>
              <option value="ALREADY_CLEARED">Cleared</option>
              <option value="OVER_DUE">Overdue</option>
            </select>
          </div>
          <div className="filter-group nosep">
            <span className="flabel">Doc date</span>
            <input type="date" className="fchip fselect dark" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <span className="arrow">→</span>
            <input type="date" className="fchip fselect dark" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            <button className="fchip" style={{ color: "var(--text-2)" }} onClick={() => { setStatus("ALL"); setFrom(""); setTo(""); setPage(1); }}>✕ Reset</button>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-2)", marginLeft: "auto" }}>
            {ready && (rows.length < allRows.length ? `Showing ${rows.length} of ${allRows.length} credit notes` : `${rows.length} credit notes`)}
          </span>
        </div>

        {loading && <LoadingBanner>Loading RTV data…</LoadingBanner>}
        {failed && (
          <div className="card" style={{ textAlign: "center", padding: "36px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: "var(--text-1)", fontWeight: 600, marginBottom: 8 }}>Couldn't load RTV data</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
              The dashboard asks the backend for <code>rtvData</code>. Add <code>backend/rtv.gs</code> to the Apps Script project and redeploy
              (the script owner needs access to the Reliance RTV Data sheet).
            </div>
          </div>
        )}

        <div className="grid row4">
          <Kpi title="Total RTV Value" meta="credit notes" value={ready ? fmtINR(k.total) : dash} sub={ready && sub(`${k.count} documents · avg ${fmtINR(k.avg)}`)} />
          <Kpi title="Credit Notes" meta="count" value={ready ? k.count : dash} sub={ready && sub("one per RTV document")} />
          <Kpi title="Cleared" meta="paid" value={ready ? fmtINR(k.cleared) : dash} sub={ready && sub(`${k.clearedN} notes`)} />
          <Kpi title="Overdue" meta="pending" value={ready ? fmtINR(k.overdue) : dash} sub={ready && sub(`${k.overdueN} notes`)} />
        </div>

        <div className="section-gap" />

        <div className="grid row2b">
          <div className="card">
            <div className="card-head"><span className="card-title">RTV Value by Month</span><span className="card-meta">by doc date</span></div>
            {k.monthly.length === 0 ? (
              <div className="empty-row">{loading ? "Loading…" : "No RTV documents"}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {k.monthly.map(([m, v]) => (
                  <div key={m} className="hbar-row">
                    <span className="hbar-label">{monthLabel(m)}</span>
                    <div className="hbar-track"><div style={{ width: `${(v / maxMonth) * 100}%`, background: "linear-gradient(90deg,#F87171,#FBBF24)" }} /></div>
                    <span className="hbar-val">{fmtINR(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <span className="card-title">Credit Notes</span>
              <button className="fchip" onClick={download} disabled={sorted.length === 0}>⬇ Download CSV</button>
            </div>
            <table>
              <thead><tr><th>Reference</th><th>Doc date</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan="4" className="empty-row">{loading ? "Loading…" : "No credit notes"}</td></tr>
                ) : sorted.slice(start, start + PAGE_SIZE).map((r) => (
                  <tr key={r.reference + r.docDate}>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.reference}</td>
                    <td style={{ color: "#9AA4B2" }}>{fmtDmy(r.docDate)}</td>
                    <td className="num">{fmtINR(r.amount || 0)}</td>
                    <td><span className={"rtv-status " + (r.status === "OVER_DUE" ? "due" : "ok")}>{statusLabel(r.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <div className="muted">Page {cur} of {totalPages}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="pager" style={{ opacity: cur <= 1 ? 0.4 : 1 }} onClick={() => cur > 1 && setPage(cur - 1)}>← Prev</button>
                  <button className="pager next" style={{ opacity: cur >= totalPages ? 0.4 : 1 }} onClick={() => cur < totalPages && setPage(cur + 1)}>Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
