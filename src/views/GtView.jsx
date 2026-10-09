import { useEffect, useMemo, useState } from "react";
import { useLazyApi } from "../lib/useApi";
import { fmtINR, monthLabel, monthShort, pctChange } from "../lib/format";
import { aggregateGt, filterGtRows, GT } from "../lib/gt";
import { TipBody, useTip } from "../components/Tip";
import { Field, Kpi, LoadingBanner, MonthOptions } from "../components/ui";

const POC_COLORS = ["#22D3EE", "#A78BFA", "#F472B6", "#A3E635", "#FBBF24", "#34D399", "#F87171"];
const FY_CHIPS = [["ALL", "All FYs"], ["FY25-26", "FY 25-26"], ["FY26-27", "FY 26-27"]];
const fyColor = (month) => (month >= "2026-04" ? "#22D3EE" : "#A3E635");
const PAGE_SIZE = 20;

const INITIAL_FILTERS = { fy: "ALL", state: "ALL", monthFrom: "ALL", monthTo: "ALL", dateFrom: "", dateTo: "" };
const INITIAL_ORD = { monthFrom: "ALL", monthTo: "ALL", dateFrom: "", dateTo: "", search: "" };

function TrendChart({ monthly }) {
  const { show, hide, node } = useTip();
  const svgW = 720, svgH = 180, pad = 30, chartH = svgH - 40;
  const maxS = Math.max(...monthly.map((m) => m.sales));
  const step = monthly.length > 1 ? (svgW - pad * 2) / (monthly.length - 1) : 0;
  const pts = monthly.map((m, i) => ({ x: pad + i * step, y: 10 + chartH - (m.sales / (maxS || 1)) * chartH, m, prev: monthly[i - 1]?.sales ?? null }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${svgH - 20} L${pts[0].x},${svgH - 20} Z`;
  return (
    <>
      <svg viewBox="0 0 720 200" width="100%" height="200" preserveAspectRatio="none" style={{ overflow: "visible" }} onMouseLeave={hide}>
        <defs>
          <linearGradient id="gtArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#A3E635" stopOpacity=".5" />
            <stop offset="1" stopColor="#A3E635" stopOpacity=".02" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((g) => (
          <line key={g} x1="0" y1={10 + g * (chartH / 3)} x2={svgW} y2={10 + g * (chartH / 3)} stroke="#1F2733" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#gtArea)" />
        <path d={line} fill="none" stroke="#A3E635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p) => (
          <circle key={p.m.month} cx={p.x} cy={p.y} r="4" fill={fyColor(p.m.month)} stroke="#0B0F14" strokeWidth="2" />
        ))}
        <g fill="#5C6573" fontSize="9" textAnchor="middle">
          {pts.map((p, i) =>
            monthly.length <= 8 || i % 2 === 0 ? (
              <g key={p.m.month}>
                <text x={p.x} y={svgH - 10}>{monthShort(p.m.month)}</text>
                <text x={p.x} y={svgH - 1} fontSize="8">'{p.m.month.slice(2, 4)}</text>
              </g>
            ) : null
          )}
        </g>
        {pts.map((p) => (
          <circle
            key={"h" + p.m.month}
            cx={p.x}
            cy={p.y}
            r="14"
            fill="transparent"
            onMouseMove={(e) => show(e, <TipBody label={monthLabel(p.m.month)} value={fmtINR(p.m.sales)} delta={pctChange(p.m.sales, p.prev) || { text: "first month", color: "#9AA4B2" }} suffix={p.prev > 0 ? " vs prior month" : ""} />)}
          />
        ))}
      </svg>
      {node}
    </>
  );
}

function DistributorTable({ clients }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "sales", dir: -1 });
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => (typeof a[sort.key] === "string" ? a[sort.key].localeCompare(b[sort.key]) : a[sort.key] - b[sort.key]) * sort.dir);
  }, [clients, search, sort]);
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: key === "name" ? 1 : -1 }));
  const th = (key, label, right) => (
    <th className="sortable" style={{ textAlign: right ? "right" : undefined, color: sort.key === key ? "#F5F7FA" : undefined }} onClick={() => toggle(key)}>
      {label}
    </th>
  );
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">Distributor-wise Sales</span>
        <span className="card-meta">{rows.length} distributor{rows.length === 1 ? "" : "s"} · Gross Sales (col G)</span>
      </div>
      <div style={{ marginBottom: 12 }}>
        <input className="fchip" style={{ background: "var(--panel-1)", width: "100%", maxWidth: 320, cursor: "text" }} placeholder="Search distributor..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div style={{ maxHeight: 440, overflow: "auto" }}>
        <table>
          <thead>
            <tr>{th("name", "Distributor")}{th("orders", "Orders", true)}{th("sales", "Sales", true)}{th("aov", "Avg Order", true)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan="4" style={{ color: "var(--text-2)", padding: "16px 0" }}>No distributors match this filter</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td className="num">{c.orders}</td>
                  <td className="num">{fmtINR(c.sales)}</td>
                  <td className="num">{fmtINR(c.aov)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrdersView({ rows, months, ord, setOrd, page, setPage, sort, setSort }) {
  const sorted = useMemo(() => {
    const val = (r) => (sort.col === "sales" ? r[GT.sales] || 0 : r[GT[sort.col]]);
    return rows.slice().sort((a, b) => {
      const av = val(a), bv = val(b);
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * (sort.dir === "asc" ? 1 : -1);
    });
  }, [rows, sort]);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const start = (cur - 1) * PAGE_SIZE;
  const update = (patch) => { setOrd({ ...ord, ...patch }); setPage(1); };
  const th = (col, label, right) => (
    <th className="ord-th" style={{ textAlign: right ? "right" : "left", color: sort.col === col ? "#22D3EE" : undefined }}
      onClick={() => { setSort(sort.col === col ? { col, dir: sort.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "sales" ? "desc" : "asc" }); setPage(1); }}>
      {label}{sort.col === col ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕"}
    </th>
  );
  return (
    <div>
      <div className="ord-panel">
        <div className="ord-panel-row">
          <Field label="Month">
            <div className="inline">
              <select className="fchip fselect-sm" value={ord.monthFrom} onChange={(e) => update({ monthFrom: e.target.value })}>
                <option value="ALL">From</option><MonthOptions months={months} label={monthLabel} />
              </select>
              <span className="arrow">→</span>
              <select className="fchip fselect-sm" value={ord.monthTo} onChange={(e) => update({ monthTo: e.target.value })}>
                <option value="ALL">To</option><MonthOptions months={months} label={monthLabel} />
              </select>
            </div>
          </Field>
          <div className="vsep" />
          <Field label="Custom date range">
            <div className="inline">
              <input type="date" className="fchip fselect-sm dark" value={ord.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} />
              <span className="arrow">→</span>
              <input type="date" className="fchip fselect-sm dark" value={ord.dateTo} onChange={(e) => update({ dateTo: e.target.value })} />
            </div>
          </Field>
          <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
            <button className="fchip" style={{ color: "#5C6573" }} onClick={() => { setOrd(INITIAL_ORD); setPage(1); }}>✕ Reset</button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C6573" strokeWidth="2" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input className="text-input" style={{ paddingLeft: 34, background: "#11161F", borderRadius: 10 }} placeholder="Search by client name..." value={ord.search} onChange={(e) => update({ search: e.target.value })} />
        </div>
        <div className="muted-nowrap">Showing {total === 0 ? 0 : start + 1}–{Math.min(start + PAGE_SIZE, total)} of {total}</div>
      </div>

      <div className="ord-table-wrap">
        <table className="ord-table">
          <thead><tr>{th("ref", "Ref No")}{th("date", "Date")}{th("client", "Client")}{th("poc", "POC")}{th("sales", "Sales", true)}</tr></thead>
          <tbody>
            {sorted.slice(start, start + PAGE_SIZE).map((r, i) => (
              <tr key={r[GT.ref] + ":" + (start + i)} className={i % 2 ? "alt" : ""}>
                <td style={{ color: r[GT.fy] === "FY26-27" ? "#22D3EE" : "#A3E635", fontFamily: "monospace", fontSize: 12 }}>{r[GT.ref]}</td>
                <td style={{ color: "#9AA4B2" }}>{r[GT.date] ? r[GT.date].split("-").reverse().join("/") : "—"}</td>
                <td className="ord-client">{r[GT.client]}</td>
                <td style={{ color: "#9AA4B2" }}>{r[GT.poc] || "—"}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {r[GT.sales] > 0 ? "₹" + Math.round(r[GT.sales]).toLocaleString("en-IN") : <span style={{ color: "#5C6573" }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <div className="muted">Page {cur} of {totalPages}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="pager" style={{ opacity: cur <= 1 ? 0.4 : 1 }} onClick={() => cur > 1 && setPage(cur - 1)}>← Prev</button>
          <button className="pager next" style={{ opacity: cur >= totalPages ? 0.4 : 1 }} onClick={() => cur < totalPages && setPage(cur + 1)}>Next →</button>
        </div>
      </div>

      <div className="ord-legend">
        <span><i style={{ background: "#A3E635" }} />FY 25-26</span>
        <span><i style={{ background: "#22D3EE" }} />FY 26-27</span>
        <span style={{ marginLeft: "auto" }}>— = no sales value</span>
      </div>
    </div>
  );
}

export default function GtView({ active, onLoading }) {
  const { data, loading } = useLazyApi("gtData", active);
  useEffect(() => onLoading?.(loading), [loading, onLoading]);
  const allRows = data?.rows || [];
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [view, setView] = useState("summary");
  const [ord, setOrd] = useState(INITIAL_ORD);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ col: "date", dir: "desc" });
  const set = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const states = useMemo(() => [...new Set(allRows.map((r) => r[GT.state]).filter((s) => s && s !== "Unknown"))].sort(), [allRows]);
  const months = useMemo(() => [...new Set(allRows.map((r) => r[GT.month]).filter(Boolean))].sort(), [allRows]);

  const rows = useMemo(() => filterGtRows(allRows, filters), [allRows, filters]);
  const ordRows = useMemo(() => {
    const q = ord.search.toLowerCase();
    return rows.filter((r) => {
      const m = r[GT.month], d = r[GT.date];
      if (ord.monthFrom !== "ALL" && m && m < ord.monthFrom) return false;
      if (ord.monthTo !== "ALL" && m && m > ord.monthTo) return false;
      if (ord.dateFrom && d && d < ord.dateFrom) return false;
      if (ord.dateTo && d && d > ord.dateTo) return false;
      if (q && !r[GT.client].toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, ord]);

  const d = useMemo(() => aggregateGt(rows), [rows]);
  const k = useMemo(() => (view === "orders" ? aggregateGt(ordRows) : d), [view, ordRows, d]);
  const maxPoc = d.pocList[0]?.orders || 1;
  const maxClient = d.topClients[0]?.sales || 1;
  const maxVol = Math.max(...d.monthly.map((m) => m.orders), 1);
  const ready = !!data;
  const dash = loading ? <span className="skeleton" /> : "-";
  const sub = (text) => <div className="kpi-sub"><span style={{ fontSize: 12, color: "var(--text-1)" }}>{text}</span></div>;

  return (
    <section className="data">
      <div className="shell">
        <div className="section-head">
          <div>
            <h2>General Trade · Sales Pipeline</h2>
            <p>FY 25–26 + FY 26–27 YTD</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="filters">
              {FY_CHIPS.map(([v, label]) => (
                <button key={v} className={"fchip" + (filters.fy === v ? " on" : "")} onClick={() => set({ fy: v })}>{label}</button>
              ))}
            </div>
            <div className="view-toggle">
              {["summary", "orders"].map((v) => (
                <button key={v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v === "summary" ? "Summary" : "Orders"}</button>
              ))}
            </div>
          </div>
        </div>

        {view === "summary" && (
          <div className="filters filter-bar">
            <div className="filter-group">
              <span className="flabel">State</span>
              <select className="fchip fselect" value={filters.state} onChange={(e) => set({ state: e.target.value })}>
                <option value="ALL">All states</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <span className="flabel">Month</span>
              <select className="fchip fselect" value={filters.monthFrom} onChange={(e) => set({ monthFrom: e.target.value })}>
                <option value="ALL">From</option><MonthOptions months={months} label={monthLabel} />
              </select>
              <span className="arrow">→</span>
              <select className="fchip fselect" value={filters.monthTo} onChange={(e) => set({ monthTo: e.target.value })}>
                <option value="ALL">To</option><MonthOptions months={months} label={monthLabel} />
              </select>
            </div>
            <div className="filter-group nosep">
              <span className="flabel">Date</span>
              <input type="date" className="fchip fselect dark" value={filters.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} />
              <span className="arrow">→</span>
              <input type="date" className="fchip fselect dark" value={filters.dateTo} onChange={(e) => set({ dateTo: e.target.value })} />
              <button className="fchip" style={{ color: "var(--text-2)" }} onClick={() => setFilters(INITIAL_FILTERS)}>✕ Reset</button>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-2)", marginLeft: "auto" }}>
              {ready && (rows.length < allRows.length ? `Showing ${rows.length} of ${allRows.length} orders` : `Showing all ${rows.length} orders`)}
            </span>
          </div>
        )}

        <div className="grid row4" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
          <Kpi title="Total Sales" meta="combined" value={ready ? fmtINR(k.totalSales) : dash} sub={ready && sub(`${k.ordersWithSales} orders with value`)} />
          <Kpi title="Orders" meta="total" value={ready ? k.totalOrders.toLocaleString() : dash} sub={ready && sub(`${k.ordersWithSales} with sales data`)} />
          <Kpi title="Unique Clients" meta="all-time" value={ready ? k.uniqueClients : dash} sub={ready && sub(`${k.repeatClients} repeat`)} />
          <Kpi title="Avg Order Value" meta="per order" value={ready ? fmtINR(k.aov) : dash} sub={ready && sub(`on ${k.ordersWithSales} valued orders`)} />
          <Kpi title="Repeat Clients" meta="2+ orders" value={ready ? k.repeatPct + "%" : dash}>
            <div className="bar-fill" style={{ marginTop: 14 }}><div style={{ width: `${ready ? k.repeatPct : 0}%` }} /></div>
          </Kpi>
        </div>

        <div className="section-gap" />

        {loading && <LoadingBanner>Loading GT orders…</LoadingBanner>}
        {view === "orders" ? (
          <OrdersView rows={ordRows} months={months} ord={ord} setOrd={setOrd} page={page} setPage={setPage} sort={sort} setSort={setSort} />
        ) : (
          <>
            <div className="grid row2">
              <div className="card big">
                <h3>Monthly Sales Trend</h3>
                <div className="lead num">
                  {ready ? fmtINR(d.totalSales) : "-"}
                  {d.monthly.length > 0 && <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 400 }}> across {d.monthly.length} months</span>}
                </div>
                {d.monthly.length > 0 && <TrendChart monthly={d.monthly} />}
                {d.monthly.length > 0 && (
                  <div className="legend"><span><i style={{ background: "#A3E635" }} />FY 25-26</span><span><i style={{ background: "#22D3EE" }} />FY 26-27</span></div>
                )}
              </div>
              <div className="card big">
                <h3>POC Performance</h3>
                <div className="lead num">{ready ? `${d.pocList.length} reps` : "-"}</div>
                <div className="zonelist">
                  {d.pocList.slice(0, 7).map((p, i) => (
                    <div key={p.name} className="zoneitem">
                      <span className="lbl">{p.name}</span>
                      <div className="zonebar"><div style={{ width: `${Math.round((p.orders / maxPoc) * 100)}%`, background: POC_COLORS[i % POC_COLORS.length] }} /></div>
                      <span className="val num">{p.orders} <span className="pct">{fmtINR(p.sales)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-gap" />

            <div className="grid row2b">
              <div className="card">
                <div className="card-head"><span className="card-title">Top Clients · by value</span><span className="card-meta">cumulative</span></div>
                <div className="skulist">
                  {d.topClients.map((c, i) => (
                    <div key={c.name} className="skurow">
                      <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                      <span className="skuname">{c.name}</span>
                      <div className="skubar"><div style={{ width: `${Math.round((c.sales / maxClient) * 100)}%`, background: "linear-gradient(90deg,#22D3EE,#A78BFA)" }} /></div>
                      <span className="skuval">{fmtINR(c.sales)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Client Breakdown</span><span className="card-meta">repeat vs one-time</span></div>
                {ready && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div className="split-box"><div className="split-label">Repeat (2+)</div><div className="split-num" style={{ color: "#34D399" }}>{d.repeatClients}</div><div className="split-sub">{d.repeatPct}% of base</div></div>
                    <div className="split-box"><div className="split-label">One-time</div><div className="split-num" style={{ color: "var(--text-1)" }}>{d.oneTime}</div><div className="split-sub">{100 - d.repeatPct}% of base</div></div>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 500, marginBottom: 12 }}>Top repeat clients</div>
                <div className="storelist">
                  {d.topRepeat.map((c) => (
                    <div key={c.name} className="storerow">
                      <div><div className="storename">{c.name}</div><div className="storesub">{c.orders} orders</div></div>
                      <span className="storeval num">{fmtINR(c.sales)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="section-gap" />

            <div className="grid row2b">
              <div className="card">
                <div className="card-head"><span className="card-title">State Coverage</span><span className="card-meta">by address</span></div>
                <table>
                  <thead><tr><th>State</th><th style={{ textAlign: "right" }}>Orders</th><th style={{ textAlign: "right" }}>Sales</th><th style={{ textAlign: "right" }}>Clients</th></tr></thead>
                  <tbody>
                    {d.states.filter((s) => s.name !== "Unknown").slice(0, 12).map((s) => {
                      const vel = s.orders > 0 ? s.sales / s.orders : 0;
                      return (
                        <tr key={s.name}>
                          <td><span className={`statusdot ${vel > 20000 ? "s-good" : vel > 10000 ? "s-warn" : "s-bad"}`} />{s.name}</td>
                          <td className="num">{s.orders}</td>
                          <td className="num">{fmtINR(s.sales)}</td>
                          <td className="num">{s.clients}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="card">
                <div className="card-head"><span className="card-title">Monthly Order Volume</span><span className="card-meta">count</span></div>
                <div className="b2b-bar-chart" style={{ height: 130 }}>
                  {d.monthly.map((m) => (
                    <div key={m.month} className="b2b-bar-col">
                      <span className="b2b-bar-val">{m.orders}</span>
                      <div className={"b2b-bar" + (m.orders === maxVol ? " peak" : "")} style={{ height: Math.max((m.orders / maxVol) * 130, 4), background: fyColor(m.month) }} />
                    </div>
                  ))}
                </div>
                <div className="b2b-bar-labels">
                  {d.monthly.map((m) => <span key={m.month} className="b2b-bar-label">{monthShort(m.month)}</span>)}
                </div>
              </div>
            </div>

            <div className="section-gap" />

            <DistributorTable clients={d.allClients} />
          </>
        )}
      </div>
    </section>
  );
}
