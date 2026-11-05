import { useMemo, useState } from "react";
import { fmtINR } from "../lib/format";
import { downloadCsv } from "../lib/csv";

const LEVELS = [["state", "State wise"], ["city", "City wise"], ["store", "Store wise"]];
const BAR_COLORS = { state: "#22D3EE", city: "#A78BFA", store: "#F472B6" };

/**
 * Geography drill-down: State -> City -> Store (e.g. Mumbai with 4 stores).
 * records: [{ state, city, store, sales, orders? }]  (one per store/client or per order; they are summed)
 * Click a state (State wise) or a city (City wise) to expand the level below it.
 */
export default function GeoDrill({ title = "Geography", records, storeNoun = "store", filename = "geography.csv", note }) {
  const hasOrders = records.some((r) => r.orders != null);
  const hasCity = records.some((r) => r.city);
  const [level, setLevel] = useState("state");
  const [open, setOpen] = useState(() => new Set());

  // Roll the records up into state -> city -> store.
  const tree = useMemo(() => {
    const states = new Map();
    const add = (m, key, init) => { if (!m.has(key)) m.set(key, init()); return m.get(key); };
    const blank = () => ({ sales: 0, orders: 0, stores: new Set(), kids: new Map() });
    records.forEach((r) => {
      const st = add(states, r.state || "Unknown", blank);
      const ct = add(st.kids, r.city || "—", blank);
      const sr = add(ct.kids, r.store || "—", blank);
      [st, ct, sr].forEach((n) => { n.sales += r.sales || 0; n.orders += r.orders || 0; n.stores.add(r.store || "—"); });
    });
    return states;
  }, [records]);

  const sortKids = (m) => [...m.entries()].sort((a, b) => b[1].sales - a[1].sales);

  const rows = useMemo(() => {
    const out = [];
    const push = (key, lvl, indent, label, sub, n, expandable) =>
      out.push({ key, lvl, indent, label, sub, sales: n.sales, orders: n.orders, stores: n.stores.size, expandable, expanded: open.has(key) });
    if (level === "state") {
      sortKids(tree).forEach(([sName, s]) => {
        push("s:" + sName, "state", 0, sName, "", s, hasCity);
        if (open.has("s:" + sName)) sortKids(s.kids).forEach(([cName, c]) => push(`s:${sName}|c:${cName}`, "city", 1, cName, "", c, false));
      });
    } else if (level === "city") {
      const cities = [];
      tree.forEach((s, sName) => s.kids.forEach((c, cName) => cities.push([sName, cName, c])));
      cities.sort((a, b) => b[2].sales - a[2].sales).forEach(([sName, cName, c]) => {
        const key = `c:${sName}|${cName}`;
        push(key, "city", 0, cName, sName, c, true);
        if (open.has(key)) sortKids(c.kids).forEach(([name, n]) => push(`${key}|${name}`, "store", 1, name, "", n, false));
      });
    } else {
      const stores = [];
      tree.forEach((s, sName) => s.kids.forEach((c, cName) => c.kids.forEach((n, name) => stores.push([sName, cName, name, n]))));
      stores.sort((a, b) => b[3].sales - a[3].sales).forEach(([sName, cName, name, n]) =>
        push(`st:${sName}|${cName}|${name}`, "store", 0, name, [cName === "—" ? null : cName, sName].filter(Boolean).join(", "), n, false));
    }
    return out;
  }, [tree, level, open, hasCity]);

  const max = Math.max(...rows.filter((r) => r.indent === 0).map((r) => r.sales), 1);
  const toggle = (row) => {
    if (!row.expandable) return;
    setOpen((o) => { const n = new Set(o); n.has(row.key) ? n.delete(row.key) : n.add(row.key); return n; });
  };
  const pick = (l) => { setLevel(l); setOpen(new Set()); };

  const download = () => {
    const flat = [];
    tree.forEach((s, sName) => s.kids.forEach((c, cName) => c.kids.forEach((n, name) => flat.push({ state: sName, city: cName === "—" ? "" : cName, store: name, sales: n.sales, orders: n.orders }))));
    downloadCsv(filename, [
      { label: "State", value: (r) => r.state },
      { label: "City", value: (r) => r.city },
      { label: storeNoun[0].toUpperCase() + storeNoun.slice(1), value: (r) => r.store },
      { label: "Sales (INR)", value: (r) => Math.round(r.sales) },
      ...(hasOrders ? [{ label: "Orders", value: (r) => r.orders }] : []),
    ], flat.sort((a, b) => b.sales - a.sales));
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <span className="card-title">{title}</span>
          <span className="card-meta" style={{ marginLeft: 10 }}>state → city → {storeNoun}</span>
        </div>
        <button className="fchip" onClick={download} disabled={records.length === 0}>⬇ Download CSV</button>
      </div>

      <div className="geo-levels view-toggle" style={{ display: "inline-flex" }}>
        {LEVELS.map(([v, label]) => (
          <button key={v} className={level === v ? "on" : ""} disabled={v === "city" && !hasCity} title={v === "city" && !hasCity ? "City comes from the OMS/BD join (see backend/README.md)" : undefined} onClick={() => pick(v)}>{label}</button>
        ))}
      </div>

      <div style={{ maxHeight: 460, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>{level === "state" ? "State" : level === "city" ? "City" : storeNoun[0].toUpperCase() + storeNoun.slice(1)}</th>
              <th style={{ textAlign: "right" }}>{storeNoun[0].toUpperCase() + storeNoun.slice(1)}s</th>
              {hasOrders && <th style={{ textAlign: "right" }}>Orders</th>}
              <th style={{ textAlign: "right" }}>Sales</th>
              <th style={{ width: "22%" }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={hasOrders ? 5 : 4} className="empty-row">No data for this view</td></tr>
            ) : rows.map((r) => (
              <tr key={r.key} className={r.expandable ? "geo-row" : undefined} onClick={() => toggle(r)}>
                <td style={{ paddingLeft: 12 + r.indent * 22 }}>
                  <span className="geo-caret">{r.expandable ? (r.expanded ? "▾" : "▸") : ""}</span>
                  {r.label}
                  {r.sub && <span style={{ color: "var(--text-2)", fontSize: 12 }}> · {r.sub}</span>}
                </td>
                <td className="num">{r.stores}</td>
                {hasOrders && <td className="num">{r.orders}</td>}
                <td className="num">{fmtINR(r.sales)}</td>
                <td>{r.indent === 0 && <div className="geo-bar"><div style={{ width: `${Math.round((r.sales / max) * 100)}%`, background: BAR_COLORS[r.lvl] }} /></div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="geo-note">
        {level === "state" && hasCity && `Click a state to see its cities. `}
        {level === "city" && `Click a city to see its ${storeNoun}s. `}
        {!hasCity && `City-level split needs the city from the OMS/BD sheet (backend/README.md). `}
        {note}
      </div>
    </div>
  );
}
