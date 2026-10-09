import { Field } from "../components/ui";

const PENDING_KPIS = [
  ["Total RTV Value", "pending"],
  ["RTV Qty", "pending"],
  ["RTV Rate", "% of dispatched"],
  ["Top Return Reason", "pending"],
];

export default function RtvView() {
  return (
    <section className="data">
      <div className="shell">
        <div className="section-head">
          <div>
            <h2>Returns to Vendor · RTV</h2>
            <p>Store &amp; SKU-level return tracking</p>
          </div>
        </div>

        <div className="filters filter-bar">
          <div className="filter-group">
            <span className="flabel">Store</span>
            <select className="fchip fselect" disabled><option>All stores</option></select>
          </div>
          <div className="filter-group">
            <span className="flabel">Zone</span>
            <select className="fchip fselect" disabled><option>All zones</option></select>
          </div>
          <div className="filter-group nosep">
            <span className="flabel">Date</span>
            <input type="date" className="fchip fselect dark" disabled />
            <span className="arrow">→</span>
            <input type="date" className="fchip fselect dark" disabled />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-2)", marginLeft: "auto" }}>Filters activate once RTV data is connected</span>
        </div>

        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 14, color: "var(--text-1)", fontWeight: 600, marginBottom: 8 }}>RTV data not connected yet</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
            This tab is wired up and ready — once RTV rows are added to the source sheet and exposed via the Apps Script backend, return volumes, reasons, and store/SKU-level RTV rates will populate here automatically.
          </div>
        </div>

        <div className="section-gap" />

        <div className="grid row4">
          {PENDING_KPIS.map(([title, meta]) => (
            <div key={title} className="card">
              <div className="card-head"><span className="card-title">{title}</span><span className="card-meta">{meta}</span></div>
              <div className="kpi-val num" style={title === "Top Return Reason" ? { fontSize: 16 } : undefined}>—</div>
            </div>
          ))}
        </div>

        <div className="section-gap" />

        <div className="card">
          <div className="card-head"><span className="card-title">RTV by Store</span><span className="card-meta">awaiting data</span></div>
          <table>
            <thead><tr><th>Store</th><th style={{ textAlign: "right" }}>Qty Returned</th><th style={{ textAlign: "right" }}>RTV Value</th><th>Top Reason</th><th style={{ textAlign: "right" }}>Date</th></tr></thead>
            <tbody><tr><td colSpan="5" className="empty-row" style={{ padding: "24px 0" }}>No RTV data yet</td></tr></tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
