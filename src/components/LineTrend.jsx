import { fmtAxis, fmtINR, monthLabel, monthShort, pctChange } from "../lib/format";
import { TipBody, useTip } from "./Tip";

const W = 900, H = 180, PAD_L = 48, PAD_R = 16, PAD_T = 16, PAD_B = 32;
const CW = W - PAD_L - PAD_R;
const CH = H - PAD_T - PAD_B;

// Month-on-month line chart with area fill, gridlines and hover tooltips.
export default function LineTrend({ months, values, color, gradId, min, max, heading, deltaSuffix = "" }) {
  const { show, hide, node } = useTip();
  const range = max - min || 1;
  const yOf = (v) => PAD_T + CH - ((v - min) / range) * CH;
  const pts = values.map((v, i) => ({
    x: PAD_L + (values.length > 1 ? (i / (values.length - 1)) * CW : 0),
    y: yOf(v),
    v,
    month: months[i],
    prev: i > 0 ? values[i - 1] : null,
  }));
  const baseY = PAD_T + CH;
  const yearTag = (m) => (m.endsWith("-01") ? " 26" : m === months[0] ? " " + m.slice(2, 4) : "");

  return (
    <>
      <svg viewBox="0 -20 900 200" width="100%" height="200" preserveAspectRatio="none" style={{ overflow: "visible", display: "block" }}>
        {heading && (
          <text x="0" y="-8" fontSize="12" fill="#F5F7FA" fontWeight="600">
            {heading}
          </text>
        )}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[min, (min + max) / 2, max].map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yOf(v)} y2={yOf(v)} stroke="#1F2733" strokeWidth="1" />
            <text x={PAD_L - 6} y={yOf(v) + 4} textAnchor="end" fontSize="10" fill="#5C6573">
              {fmtAxis(v)}
            </text>
          </g>
        ))}
        {pts.length > 0 && (
          <>
            <path d={`M${pts[0].x},${baseY} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${baseY} Z`} fill={`url(#${gradId})`} />
            <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}
        {pts.map((p) => (
          <circle
            key={p.month}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={color}
            stroke="#0A0F1A"
            strokeWidth="2"
            onMouseMove={(e) => show(e, <TipBody label={monthLabel(p.month)} value={fmtINR(p.v)} delta={pctChange(p.v, p.prev)} suffix={deltaSuffix} />)}
            onMouseLeave={hide}
          />
        ))}
        {pts.map((p) => (
          <text key={p.month} x={p.x} y={H - 4} textAnchor="middle" fontSize="10" fill="#5C6573">
            {monthShort(p.month)}
            {yearTag(p.month)}
          </text>
        ))}
      </svg>
      {node}
    </>
  );
}
