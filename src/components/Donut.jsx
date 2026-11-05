import { TipBody, useTip } from "./Tip";
import { fmtINR } from "../lib/format";

export const DONUT_COLORS = ["#22D3EE", "#A78BFA", "#F472B6", "#A3E635", "#FBBF24", "#34D399", "#7C8390"];

// Share-of-total donut. `items` is [{ name, value }]; everything past the top `topN` is grouped as "Others".
export default function Donut({ items, topN = 6, format = fmtINR, centerLabel = "Total" }) {
  const { show, hide, node } = useTip();
  const sorted = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, i) => s + i.value, 0);
  if (!total) return <div className="empty-row">No sales to chart</div>;

  const head = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const slices = rest.length ? [...head, { name: `Others (${rest.length})`, value: rest.reduce((s, i) => s + i.value, 0) }] : head;

  const R = 15.9155; // circumference = 100, so dash lengths are percentages
  let offset = 0;
  const arcs = slices.map((s, i) => {
    const pct = (s.value / total) * 100;
    const arc = { ...s, pct, dash: `${pct} ${100 - pct}`, offset: -offset, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    offset += pct;
    return arc;
  });

  return (
    <div className="donut-wrap" onMouseLeave={hide}>
      <svg viewBox="0 0 42 42" className="donut-svg" role="img" aria-label="Sales share">
        <circle cx="21" cy="21" r={R} fill="none" stroke="#161D29" strokeWidth="5" />
        {arcs.map((a) => (
          <circle
            key={a.name}
            cx="21" cy="21" r={R} fill="none" stroke={a.color} strokeWidth="5"
            strokeDasharray={a.dash} strokeDashoffset={a.offset} transform="rotate(-90 21 21)"
            onMouseMove={(e) => show(e, <TipBody label={a.name} value={format(a.value)} delta={{ text: a.pct.toFixed(1) + "% of total", color: "#9AA4B2" }} />)}
          />
        ))}
        <text x="21" y="20" textAnchor="middle" fontSize="3" fill="#5C6573">{centerLabel}</text>
        <text x="21" y="25" textAnchor="middle" fontSize="4.2" fill="#F5F7FA" fontWeight="600">{format(total)}</text>
      </svg>
      <div className="donut-legend">
        {arcs.map((a) => (
          <div key={a.name}>
            <span className="lbl"><i style={{ background: a.color }} />{a.name.length > 28 ? a.name.slice(0, 27) + "…" : a.name}</span>
            <span className="val num">{a.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      {node}
    </div>
  );
}
