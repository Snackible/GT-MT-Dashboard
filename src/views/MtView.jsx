import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../lib/api";
import { fmtINR, monthLabel, titleCase, pctChange } from "../lib/format";
import LineTrend from "../components/LineTrend";
import { TipBody, useTip } from "../components/Tip";
import { Field, MonthOptions, Spinner } from "../components/ui";

const PERIOD_OPTIONS = {
  yearly: [
    { label: "FY 25-26", value: "2025-07,2025-08,2025-09,2025-10,2025-11,2025-12,2026-01,2026-02,2026-03" },
    { label: "FY 26-27", value: "2026-04,2026-05,2026-06,2026-07,2026-08,2026-09,2026-10,2026-11,2026-12" },
  ],
  quarterly: [
    { label: "Q1 Jul–Sep 25", value: "2025-07,2025-08,2025-09" },
    { label: "Q2 Oct–Dec 25", value: "2025-10,2025-11,2025-12" },
    { label: "Q3 Jan–Mar 26", value: "2026-01,2026-02,2026-03" },
    { label: "Q4 Apr–Jun 26", value: "2026-04,2026-05,2026-06" },
    { label: "Q1 Jul–Sep 26", value: "2026-07,2026-08,2026-09" },
    { label: "Q2 Oct–Dec 26", value: "2026-10,2026-11,2026-12" },
  ],
  monthly: ["2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"].map((m) => ({
    label: monthLabel(m),
    value: m,
  })),
};
const STORE_MONTHS = PERIOD_OPTIONS.monthly.map((o) => o.value);
const ZONE_ORDER = ["WEST", "NORTH", "EAST", "SOUTH"];
const CAT_COLORS = ["#22D3EE", "#A78BFA", "#F472B6", "#A3E635", "#FBBF24", "#34D399", "#7C8390"];

const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();

// Merge duplicate listings caused by inconsistent naming ("Nacho Jowar Cheese Puffs" == "Nacho Cheese Puffs").
function mergeSkus(topSkus) {
  const map = new Map();
  topSkus.forEach((s) => {
    const key = s.name.replace(/SNACKIBLE\s*/i, "").replace(/\bNCHO\b/i, "NACHO").replace(/\bJOWAR\s+/i, "").trim().toUpperCase();
    const hit = map.get(key);
    if (hit) {
      hit.sales += s.sales;
      hit.qty += s.qty;
    } else map.set(key, { name: key, sales: s.sales, qty: s.qty });
  });
  return [...map.values()].sort((a, b) => b.sales - a.sales);
}

function useMtData(months) {
  const [state, setState] = useState({ data: null, loading: true });
  useEffect(() => {
    let stale = false;
    setState((s) => ({ ...s, loading: true }));
    apiGet("mtData", months !== "ALL" ? { months } : {})
      .then((data) => !stale && setState({ data, loading: false }))
      .catch((err) => {
        console.error("MT load failed:", err);
        if (!stale) setState((s) => ({ ...s, loading: false }));
      });
    return () => { stale = true; };
  }, [months]);
  return state;
}

function StoreList({ stores, allMonths }) {
  const { show, hide, node } = useTip();
  const W = 240, H = 36, pad = 4;
  return (
    <div onMouseLeave={hide}>
      {stores.map((s) => {
        const months = allMonths.length ? allMonths : Object.keys(s.monthly || {}).sort();
        const vals = months.map((m) => (s.monthly || {})[m] || 0);
        const maxV = Math.max(...vals, 1);
        const step = months.length > 1 ? (W - pad * 2) / (months.length - 1) : 0;
        const pts = vals.map((v, i) => ({ x: pad + i * step, y: pad + (H - pad * 2) - (v / maxV) * (H - pad * 2), v, m: months[i], prev: vals[i - 1] || 0 }));
        const trend = vals[vals.length - 1] - (vals[vals.length - 2] || 0);
        const trendCol = trend > 0 ? "#34D399" : trend < 0 ? "#F87171" : "#5C6573";
        const trendLabel = trend > 0 ? "↑ trending" : trend < 0 ? "↓ declining" : "→ flat";
        return (
          <div key={s.name + s.state} className="store-row">
            <div className="store-grid">
              <div>
                <div className="store-name">{titleCase(s.name).slice(0, 40)}</div>
                <div className="store-sub">
                  {s.state} · {s.zone ? cap(s.zone) : ""}
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: "visible", display: "block" }}>
                  <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={trendCol} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  {pts.map((p) => {
                    const delta = pctChange(p.v, p.prev) || { text: "first month", color: "#9AA4B2" };
                    return (
                      <g key={p.m}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="10"
                          fill="transparent"
                          onMouseMove={(e) => show(e, <TipBody label={monthLabel(p.m)} value={fmtINR(p.v)} delta={delta} suffix=" vs prior month" />)}
                        />
                        <circle cx={p.x} cy={p.y} r="2.5" fill={trendCol} opacity="0.6" pointerEvents="none" />
                      </g>
                    );
                  })}
                </svg>
              </div>
              <div style={{ textAlign: "right", paddingTop: 2 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{fmtINR(s.sales)}</div>
                <div style={{ fontSize: 11, color: trendCol, marginTop: 4 }}>{trendLabel}</div>
              </div>
            </div>
          </div>
        );
      })}
      {node}
    </div>
  );
}

function CityTable({ states }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ col: "sales", dir: "desc" });
  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return states
      .filter((s) => s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        let av = a[sort.col], bv = b[sort.col];
        if (typeof av === "string") { av = av.toLowerCase(); bv = (bv || "").toLowerCase(); }
        if (av === bv) return 0;
        return (av < bv ? -1 : 1) * (sort.dir === "asc" ? 1 : -1);
      });
  }, [states, search, sort]);
  const toggle = (col) => setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: col === "name" ? "asc" : "desc" }));
  const th = (col, label, right) => (
    <th className={"sortable" + (sort.col === col ? " on" : "")} style={right ? { textAlign: "right" } : undefined} onClick={() => toggle(col)}>
      {label} ⇅
    </th>
  );
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">City-Level Sales &amp; Fill Rate</span>
        <span className="card-meta">fill rate pending data integration</span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <input className="text-input" style={{ maxWidth: 280 }} placeholder="Filter by city..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <table>
        <thead>
          <tr>
            {th("name", "City")}
            {th("stores", "Stores", true)}
            {th("sales", "Sales", true)}
            <th style={{ textAlign: "right" }}>Fill Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan="4" className="empty-row">No matching cities</td></tr>
          ) : (
            rows.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td className="num">{s.stores}</td>
                <td className="num">{fmtINR(s.sales)}</td>
                <td className="num" style={{ color: "var(--text-2)" }}>—</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function MtView({ onLoading }) {
  const [periodType, setPeriodType] = useState("all");
  const [months, setMonths] = useState("ALL");
  const [zone, setZone] = useState("ALL");
  const [storeMonth, setStoreMonth] = useState("ALL");
  const [trendIdx, setTrendIdx] = useState(0);
  const { data, loading } = useMtData(months);
  useEffect(() => onLoading?.(loading), [loading, onLoading]);

  // Store ranking for a single month comes from its own fetch, independent of the main period.
  const [monthData, setMonthData] = useState(null);
  useEffect(() => {
    if (storeMonth === "ALL") { setMonthData(null); return; }
    let stale = false;
    setMonthData("loading");
    apiGet("mtData", { months: storeMonth })
      .then((d) => !stale && setMonthData(d))
      .catch((err) => { console.error("Store month fetch failed:", err); if (!stale) setMonthData(null); });
    return () => { stale = true; };
  }, [storeMonth]);

  const onPeriodType = (type) => {
    setPeriodType(type);
    setMonths(type === "all" ? "ALL" : PERIOD_OPTIONS[type][0].value);
  };

  const view = useMemo(() => {
    if (!data) return null;
    const { kpis, zones } = data;
    const all = zone === "ALL";
    const sales = all ? kpis.netSalesRaw : (zones[zone] || { sales: 0 }).sales;
    const stores = all ? kpis.activeStores : data.zoneStoreCount?.[zone] || 0;
    const storeSource = monthData && monthData !== "loading" ? monthData : data;
    return {
      sales,
      stores,
      zonePct: all ? kpis.topZonePct : zones[zone]?.pct || "0",
      states: (all ? data.states : data.zoneStates?.[zone]) || [],
      storeList: (all ? storeSource.topStores : storeSource.zoneTopStores?.[zone]) || [],
      storeMonths: (monthData && monthData !== "loading" ? monthData : data).monthly?.map((m) => m.month) || [],
      skus: data.topSkus ? mergeSkus(data.topSkus) : [],
    };
  }, [data, zone, monthData]);

  const monthly = data?.monthly || [];
  const maxZone = data ? Math.max(...ZONE_ORDER.map((z) => data.zones[z]?.sales || 0)) : 1;
  const trendStores = data?.topStores || [];
  const trendStore = trendStores[trendIdx < trendStores.length ? trendIdx : 0];
  const trendSeries = trendStore ? monthly.map((m) => (trendStore.monthly || {})[m.month] || 0) : [];
  const monthlySales = monthly.map((m) => m.sales);

  return (
    <section className="data">
      <div className="shell">
        <div className="section-head">
          <div>
            <h2>Modern Trade · Reliance Signature</h2>
            <p>FY 25–26 + FY 26–27 YTD · 85 stores · 4 zones · 21 states</p>
          </div>
          <div className="filter-row">
            <Field label="Period">
              <select className="fchip fselect" style={{ minWidth: 130 }} value={periodType} onChange={(e) => onPeriodType(e.target.value)}>
                <option value="all">All time</option>
                <option value="yearly">By year</option>
                <option value="quarterly">By quarter</option>
                <option value="monthly">By month</option>
              </select>
            </Field>
            {periodType !== "all" && (
              <Field label={periodType === "yearly" ? "Year" : periodType === "quarterly" ? "Quarter" : "Month"}>
                <select className="fchip fselect" style={{ minWidth: 150 }} value={months} onChange={(e) => setMonths(e.target.value)}>
                  {PERIOD_OPTIONS[periodType].map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Zone">
              <select className="fchip fselect" style={{ minWidth: 130 }} value={zone} onChange={(e) => setZone(e.target.value)}>
                <option value="ALL">All zones</option>
                <option value="WEST">West</option>
                <option value="NORTH">North</option>
                <option value="SOUTH">South</option>
                <option value="EAST">East</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="grid row4">
          <div className="card">
            <div className="card-head"><span className="card-title">Net Sales</span><span className="card-meta">FY total</span></div>
            <div className="kpi-val num">{loading ? <Spinner size={22} /> : view ? fmtINR(view.sales) : "-"}</div>
            <div className="kpi-sub"><span className="delta up">+23.4%</span> vs prior period</div>
            <svg className="spark" viewBox="0 0 200 36" preserveAspectRatio="none">
              <defs><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#22D3EE" stopOpacity=".4" /><stop offset="1" stopColor="#22D3EE" stopOpacity="0" /></linearGradient></defs>
              <path d="M0,30 L20,28 L40,12 L60,18 L80,20 L100,16 L120,22 L140,28 L160,14 L180,10 L200,16 L200,36 L0,36 Z" fill="url(#g1)" />
              <path d="M0,30 L20,28 L40,12 L60,18 L80,20 L100,16 L120,22 L140,28 L160,14 L180,10 L200,16" fill="none" stroke="#22D3EE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">Active Stores</span><span className="card-meta">target 100</span></div>
            <div className="kpi-val num">{view ? view.stores : "-"}</div>
            <div className="kpi-sub"><span className="delta up">+12</span> this quarter</div>
            <div className="bar-fill"><div style={{ width: "85%" }} /></div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">Avg Velocity / Store</span><span className="card-meta">monthly</span></div>
            <div className="kpi-val num">{view ? (view.stores > 0 ? "₹" + Math.round(view.sales / view.stores).toLocaleString("en-IN") : "—") : "-"}</div>
            <div className="kpi-sub"><span className="delta up">+4.1%</span> 3-mo trend</div>
            <svg className="spark" viewBox="0 0 200 36" preserveAspectRatio="none">
              <path d="M0,26 L25,24 L50,22 L75,18 L100,20 L125,16 L150,18 L175,14 L200,12" fill="none" stroke="#A78BFA" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">West Zone Share</span><span className="card-meta">concentration</span></div>
            <div className="kpi-val num">{view ? view.zonePct + "%" : "-"}</div>
            <div className="kpi-sub"><span className="delta dn">+3.1 pp</span> concentration risk</div>
            <div className="bar-fill"><div style={{ width: "62%", background: "linear-gradient(90deg,#F472B6,#FBBF24)" }} /></div>
          </div>
        </div>

        <div className="section-gap" />

        <div className="grid row2">
          <div className="card big">
            <h3>Monthly Sales Trend</h3>
            <div className="lead num" />
            {monthly.length > 1 && (
              <LineTrend
                months={monthly.map((m) => m.month)}
                values={monthlySales}
                min={Math.min(...monthlySales)}
                max={Math.max(...monthlySales)}
                color="#22D3EE"
                gradId="trendGrad"
                heading={`${data.kpis.netSalesFormatted} across ${monthly.length} months`}
              />
            )}
            <div className="legend"><span><i style={{ background: "#22D3EE" }} />Net sales</span></div>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12, fontWeight: 500 }}>Sales by month</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {monthly.map((m) => (
                  <div key={m.month} className="hbar-row">
                    <span className="hbar-label">{monthLabel(m.month)}</span>
                    <div className="hbar-track"><div style={{ width: `${(m.sales / Math.max(...monthlySales)) * 100}%` }} /></div>
                    <span className="hbar-val">{fmtINR(m.sales)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card big">
            <h3>Zone Distribution</h3>
            <div className="lead num">4 zones</div>
            <div className="zonelist">
              {data && ZONE_ORDER.map((name, i) => {
                const z = data.zones[name];
                if (!z) return null;
                return (
                  <div key={name} className={`zoneitem ${["", "v2", "v3", "v4"][i]}`}>
                    <span className="lbl">{cap(name)}</span>
                    <div className="zonebar"><div style={{ width: `${(z.sales / maxZone) * 100}%` }} /></div>
                    <span className="val num">{fmtINR(z.sales)}<span className="pct">{z.pct}%</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="section-gap" />

        <div className="grid row2b">
          <div className="card">
            <div className="card-head"><span className="card-title">Top SKUs · by value</span><span className="card-meta">13-mo cumulative</span></div>
            <div className="skulist">
              {view?.skus.slice(0, 8).map((s, i) => (
                <div key={s.name} className="skurow">
                  <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                  <span className="skuname">{titleCase(s.name).slice(0, 35)}</span>
                  <div className="skubar"><div style={{ width: `${Math.round((s.sales / view.skus[0].sales) * 100)}%` }} /></div>
                  <span className="skuval">{fmtINR(s.sales)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <span className="card-title">Top Stores · by value</span>
              <select className="fchip fselect-sm" value={storeMonth} onChange={(e) => setStoreMonth(e.target.value)}>
                <option value="ALL">All months</option>
                <MonthOptions months={STORE_MONTHS} label={monthLabel} />
              </select>
            </div>
            {monthData === "loading" ? (
              <div style={{ padding: 20, color: "var(--text-2)", fontSize: 13 }}>Loading...</div>
            ) : (
              view && <StoreList stores={view.storeList} allMonths={view.storeMonths} />
            )}
          </div>
        </div>

        <div className="section-gap" />

        <div className="card big">
          <div className="card-head">
            <span className="card-title">Store Sales Trend</span>
            <select className="fchip fselect-sm" style={{ minWidth: 240 }} value={trendStores.indexOf(trendStore)} onChange={(e) => setTrendIdx(Number(e.target.value))}>
              {trendStores.map((s, i) => (
                <option key={s.name} value={i}>{titleCase(s.name).slice(0, 45)}</option>
              ))}
            </select>
          </div>
          {trendStore && (
            <>
              <div className="lead num">
                {titleCase(trendStore.name)} · {fmtINR(trendSeries.reduce((a, b) => a + b, 0))} across {monthly.length} months
              </div>
              <LineTrend
                months={monthly.map((m) => m.month)}
                values={trendSeries}
                min={Math.min(...trendSeries, 0)}
                max={Math.max(...trendSeries, 1)}
                color="#A78BFA"
                gradId="storeTrendGrad"
                deltaSuffix=" vs prior month"
              />
            </>
          )}
          <div className="legend"><span><i style={{ background: "#A78BFA" }} />Store sales, month on month</span></div>
          <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 8 }}>
            Showing the top 10 stores by cumulative value — full store list requires a backend update.
          </div>
        </div>

        <div className="section-gap" />

        <div className="grid row2b">
          <div className="card">
            <div className="card-head"><span className="card-title">Category Mix</span><span className="card-meta">by value</span></div>
            <div className="catbar">
              {data?.categories?.map((c, i) => {
                const col = CAT_COLORS[i] || "#555";
                return (
                  <div key={c.name} style={{ flex: Math.round(c.sales), background: col, color: ["#A3E635", "#FBBF24"].includes(col) ? "#000" : undefined }}>
                    {parseFloat(c.pct) > 7 ? c.pct + "%" : ""}
                  </div>
                );
              })}
            </div>
            <div className="catlegend">
              {data?.categories?.map((c, i) => (
                <div key={c.name}>
                  <span className="lbl"><i style={{ background: CAT_COLORS[i] || "#555" }} />{cap(c.name)}</span>
                  <span className="val">{fmtINR(c.sales)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><span className="card-title">State Coverage</span><span className="card-meta">top states</span></div>
            <table>
              <thead><tr><th>State</th><th style={{ textAlign: "right" }}>Stores</th><th style={{ textAlign: "right" }}>Sales</th><th style={{ textAlign: "right" }}>Velocity</th></tr></thead>
              <tbody>
                {view?.states.map((s) => {
                  const vel = s.sales / (s.stores || 1);
                  const sc = vel > 10000 ? "s-good" : vel > 6000 ? "s-warn" : "s-bad";
                  return (
                    <tr key={s.name}>
                      <td><span className={`statusdot ${sc}`} />{s.name}</td>
                      <td className="num">{s.stores}</td>
                      <td className="num">{fmtINR(s.sales)}</td>
                      <td className="num">{s.velocity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="section-gap" />

        <CityTable states={data?.states || []} />
      </div>
    </section>
  );
}
