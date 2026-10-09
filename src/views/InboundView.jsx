import { useEffect, useMemo, useState } from "react";
import { useLazyApi } from "../lib/useApi";
import { monthLabel, monthShort } from "../lib/format";
import { aggregateInbound, filterInbound, IB } from "../lib/inbound";
import { LoadingBanner, MonthOptions } from "../components/ui";

const FUNNEL_COLORS = { overdue: "#F87171", "no follow-up scheduled": "#FBBF24", converted: "#34D399", cold: "#9AA4B2", upcoming: "#22D3EE", "not set": "#5C6573" };
const RCAT_COLORS = { "Catalogue shared": "#22D3EE", "Did not pick up": "#5C6573", "Not interested": "#F87171", "Busy / call later": "#FBBF24", "Number issue": "#A78BFA", Other: "#293345" };
const INITIAL = { monthFrom: "ALL", monthTo: "ALL", dateFrom: "", dateTo: "" };

const PBar = ({ label, right, pct, color }) => (
  <div className="pbar-row">
    <div className="pbar-head"><span>{label}</span><span>{right}</span></div>
    <div className="pbar-track"><div className="pbar-fill" style={{ width: `${Math.max(pct, 1.5)}%`, background: color }} /></div>
  </div>
);

function BarChart({ items, valueKey, color }) {
  const max = Math.max(...items.map((m) => m[valueKey]), 1);
  return (
    <>
      <div className="b2b-bar-chart" style={{ height: 100 }}>
        {items.map((m) => (
          <div key={m.month} className="b2b-bar-col">
            <span className="b2b-bar-val">{m[valueKey]}</span>
            <div className={"b2b-bar" + (m[valueKey] === max ? " peak" : "")} style={{ height: Math.max((m[valueKey] / max) * 100, 4), background: color }} />
          </div>
        ))}
      </div>
      <div className="b2b-bar-labels">
        {items.map((m) => <span key={m.month} className="b2b-bar-label">{monthShort(m.month)}</span>)}
      </div>
    </>
  );
}

function Remarks({ breakdown, raw }) {
  const [cat, setCat] = useState("ALL");
  const total = breakdown.reduce((s, c) => s + c.count, 0);
  const max = Math.max(...breakdown.map((c) => c.count));
  const feed = (cat === "ALL" ? raw : raw.filter((r) => r.cat === cat)).slice(0, 20);
  const pills = [{ key: "ALL", name: "All", col: "var(--text-2)", count: total }, ...breakdown.map((c) => ({ key: c.name, name: c.name, col: RCAT_COLORS[c.name] || "#293345", count: c.count }))];
  return (
    <div className="b2b-card">
      <div className="b2b-card-title">
        Remarks breakdown <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-2)" }}>· {total.toLocaleString()} classified</span>
      </div>
      <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
        {breakdown.map((c) => {
          const pct = ((c.count / total) * 100).toFixed(1);
          const col = RCAT_COLORS[c.name] || "#293345";
          return (
            <div key={c.name} style={{ flex: c.count, background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: col === "#FBBF24" || col === "#22D3EE" ? "#000" : "#fff", overflow: "hidden", padding: "0 4px", whiteSpace: "nowrap" }}>
              {parseFloat(pct) > 8 ? `${c.name.split(" ")[0]} ${pct}%` : ""}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {breakdown.map((c) => (
          <div key={c.name} className="pbar-row" style={{ marginBottom: 0 }}>
            <div className="pbar-head">
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i style={{ width: 8, height: 8, background: RCAT_COLORS[c.name] || "#293345", borderRadius: 2, display: "inline-block", flexShrink: 0 }} />{c.name}
              </span>
              <span><strong>{c.count}</strong> <span style={{ color: "var(--text-2)" }}>{((c.count / total) * 100).toFixed(1)}%</span></span>
            </div>
            <div className="pbar-track"><div className="pbar-fill" style={{ width: `${((c.count / max) * 100).toFixed(0)}%`, background: RCAT_COLORS[c.name] || "#293345" }} /></div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {pills.map((p) => (
          <span key={p.key} onClick={() => setCat(p.key)} style={{ padding: "5px 12px", borderRadius: 99, background: `${p.col}22`, border: `1px solid ${p.col}55`, fontSize: 12, color: p.col, cursor: "pointer", fontWeight: cat === p.key ? 600 : 400 }}>
            {p.name} {p.count}
          </span>
        ))}
      </div>
      <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
        {feed.length === 0 ? (
          <div style={{ padding: 16, color: "var(--text-2)", fontSize: 13 }}>No remarks in this category.</div>
        ) : (
          <>
            <div style={{ padding: "8px 12px", background: "var(--panel-2)", fontSize: 11, color: "var(--text-2)", borderBottom: "1px solid var(--line)" }}>
              {cat === "ALL" ? "All remarks" : cat} · showing {feed.length}
            </div>
            {feed.map((r, i) => {
              const sl = (r.status || "").toLowerCase();
              return (
                <div key={i} className="feed-item">
                  <div className="feed-meta">
                    <span><strong>{r.leadBy}</strong> · {r.location}</span>
                    <span className={"feed-badge " + (sl.includes("hot") ? "hot" : sl.includes("converted") ? "converted" : "")}>{r.status || "Pending"}</span>
                  </div>
                  <div className="feed-text">"{r.remark}"</div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

export default function InboundView({ active, onLoading }) {
  const { data, loading } = useLazyApi("inboundData", active);
  useEffect(() => onLoading?.(loading), [loading, onLoading]);
  const allRows = data?.rows || [];
  const [f, setF] = useState(INITIAL);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  const months = useMemo(() => [...new Set(allRows.map((r) => r[IB.month]).filter(Boolean))].sort(), [allRows]);
  const rows = useMemo(() => filterInbound(allRows, f), [allRows, f]);
  const agg = useMemo(() => aggregateInbound(rows), [rows]);

  const parts = [];
  if (f.monthFrom !== "ALL" || f.monthTo !== "ALL") parts.push(`${f.monthFrom === "ALL" ? "start" : monthLabel(f.monthFrom)} → ${f.monthTo === "ALL" ? "latest" : monthLabel(f.monthTo)}`);
  if (f.dateFrom || f.dateTo) parts.push(`${f.dateFrom || "start"} → ${f.dateTo || "today"}`);

  const { kpis, urgency: u } = agg;
  const ready = !!data;
  const val = (v) => (ready ? v : loading ? <span className="skeleton" /> : "-");
  const statusList = agg.statusBreakdown.filter((s) => s.name !== "#REF!" && FUNNEL_COLORS[s.name.toLowerCase()] !== null);
  const funnelTotal = agg.statusBreakdown.reduce((s, x) => s + x.count, 0) || 1;
  const srcTotal = agg.sourceBreakdown.reduce((a, s) => a + s.count, 0) || 1;
  const urgencyRows = [
    { label: "90+ days overdue", val: u.overdue90, col: "#F87171" },
    { label: "30-90 days overdue", val: u.overdue30, col: "#FBBF24" },
    { label: "Under 30 days overdue", val: u.overdueUnder30, col: "#FBBF24" },
    { label: "Upcoming", val: u.upcoming, col: "#34D399" },
  ];
  const urgencyTotal = urgencyRows.reduce((s, r) => s + r.val, 0) || 1;
  const samplePct = ((kpis.samplesProvided / (kpis.totalLeads || 1)) * 100).toFixed(2);

  return (
    <section className="data" style={{ paddingTop: 80 }}>
      <div className="shell">
        <div className="filters filter-bar" style={{ marginBottom: 24 }}>
          <div className="filter-group">
            <span className="flabel">Month</span>
            <select className="fchip fselect" value={f.monthFrom} onChange={(e) => set({ monthFrom: e.target.value })}>
              <option value="ALL">From</option><MonthOptions months={months} label={monthLabel} />
            </select>
            <span className="arrow">→</span>
            <select className="fchip fselect" value={f.monthTo} onChange={(e) => set({ monthTo: e.target.value })}>
              <option value="ALL">To</option><MonthOptions months={months} label={monthLabel} />
            </select>
          </div>
          <div className="filter-group nosep">
            <span className="flabel">Or date range</span>
            <input type="date" className="fchip fselect dark" value={f.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} />
            <span className="arrow">→</span>
            <input type="date" className="fchip fselect dark" value={f.dateTo} onChange={(e) => set({ dateTo: e.target.value })} />
            <button className="fchip" style={{ color: "var(--text-2)" }} onClick={() => setF(INITIAL)}>✕ Reset</button>
          </div>
          <span style={{ fontSize: 12, color: "var(--text-2)", marginLeft: "auto" }}>
            {ready && (parts.length ? `Showing ${rows.length} of ${allRows.length} leads · ${parts.join(" · ")}` : `Showing all ${rows.length} leads`)}
          </span>
        </div>

        <div className="kpi-strip">
          {[
            ["Total inbound", val(kpis.totalLeads.toLocaleString()), "var(--line)"],
            ["Hot leads", val(kpis.hotLeads.toLocaleString()), "var(--amber)"],
            ["Cold leads", val(kpis.coldLeads.toLocaleString()), "var(--line)"],
            ["Converted", val(kpis.convertedLeads.toLocaleString()), "var(--green)"],
            ["Conv. rate", val(kpis.conversionRate), "var(--cyan)"],
          ].map(([label, v, border]) => (
            <div key={label} className="kpi-strip-cell" style={{ borderTop: `2px solid ${border}` }}>
              <div className="kpi-strip-label">{label}</div>
              <div className="kpi-strip-val">{v}</div>
            </div>
          ))}
        </div>

        {loading && <LoadingBanner>Loading leads from the sheet — this can take around 20 seconds…</LoadingBanner>}
        {ready && (
          <>
            <div className="b2b-grid b2b-row2" style={{ marginBottom: 16 }}>
              <div className="b2b-card">
                <div className="b2b-card-title">Pipeline funnel</div>
                <div className="stat-blocks">
                  {statusList.slice(0, 4).map((s) => (
                    <div key={s.name} className="stat-block">
                      <div className="stat-block-val" style={{ color: FUNNEL_COLORS[s.name.toLowerCase()] || "var(--text-1)" }}>{s.count}</div>
                      <div className="stat-block-label">{s.name.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                {statusList.map((s) => {
                  const pct = (s.count / funnelTotal) * 100;
                  return <PBar key={s.name} label={s.name} right={pct.toFixed(1) + "%"} pct={pct} color={FUNNEL_COLORS[s.name.toLowerCase()] || "#5C6573"} />;
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="b2b-card">
                  <div className="b2b-card-title">Monthly lead volume</div>
                  <BarChart items={agg.monthlyVolume} valueKey="count" />
                </div>
                <div className="b2b-card">
                  <div className="b2b-card-title">Monthly conversion volume</div>
                  <BarChart items={agg.monthlyVolume} valueKey="converted" color="#34D399" />
                </div>
              </div>
            </div>

            <div className="b2b-grid b2b-row2" style={{ marginBottom: 16 }}>
              <div className="b2b-card">
                <div className="b2b-card-title">Source split</div>
                {agg.sourceBreakdown.map((s) => {
                  const pct = (s.count / srcTotal) * 100;
                  return <PBar key={s.name} label={s.name} right={<>{s.count} <span style={{ color: "var(--text-2)" }}>{pct.toFixed(1)}%</span></>} pct={pct} color="var(--cyan)" />;
                })}
              </div>
              <div className="b2b-card">
                <div className="b2b-card-title">Follow-up urgency</div>
                {urgencyRows.map((r) => <PBar key={r.label} label={r.label} right={r.val} pct={(r.val / urgencyTotal) * 100} color={r.col} />)}
              </div>
            </div>

            <div className="b2b-grid b2b-row2" style={{ marginBottom: 16 }}>
              <div className="b2b-card">
                <div className="b2b-card-title">Sample tracking</div>
                <PBar label="Samples sent" right={kpis.samplesProvided} pct={Number(samplePct)} color="var(--violet)" />
                <div className="pbar-row"><div className="pbar-head"><span>% of total leads</span><span>{samplePct}%</span></div></div>
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line-soft)", fontSize: 11, color: "var(--text-2)" }}>
                  Sample data is sparse — most rows have this field unfilled. Treat as directional only.
                </div>
              </div>
            </div>

            <div className="b2b-card" style={{ marginBottom: 16 }}>
              <div className="b2b-card-title">Performance by rep</div>
              <table className="b2b-table">
                <thead><tr><th>Rep</th><th className="num">Leads</th><th className="num">Won</th><th className="num">Conv. rate</th></tr></thead>
                <tbody>
                  {agg.leadByPerformance.map((rep) => (
                    <tr key={rep.name}>
                      <td>{rep.name}{rep.hot > 0 ? ` · ${rep.hot} hot` : ""}</td>
                      <td className="num">{rep.total}</td>
                      <td className={"num " + (rep.converted > 0 ? "pos" : "neu")}>{rep.converted}</td>
                      <td className={"num " + (parseFloat(rep.convRate) > 0 ? "pos" : "neu")}>{rep.convRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="b2b-card" style={{ marginBottom: 16 }}>
              <div className="b2b-card-title">Performance by location</div>
              <table className="b2b-table">
                <thead><tr><th>Region</th><th className="num">Total</th><th className="num">Won</th></tr></thead>
                <tbody>
                  {agg.topLocations.map((loc) => (
                    <tr key={loc.place}>
                      <td>{loc.place}</td>
                      <td className="num">{loc.total}</td>
                      <td className={"num " + (loc.converted > 0 ? "pos" : "neu")}>{loc.converted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {agg.remarksBreakdown.length > 0 && <Remarks breakdown={agg.remarksBreakdown} raw={agg.remarksRaw} />}
          </>
        )}
      </div>
    </section>
  );
}
