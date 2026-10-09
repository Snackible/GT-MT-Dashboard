import { useState } from "react";

// Cursor-following tooltip. `show(event, content)` on hover, `hide()` on leave.
export function useTip() {
  const [tip, setTip] = useState(null);
  return {
    show: (e, content) => setTip({ x: e.clientX + 14, y: e.clientY - 40, content }),
    hide: () => setTip(null),
    node: tip && (
      <div className="tip" style={{ left: tip.x, top: tip.y }}>
        {tip.content}
      </div>
    ),
  };
}

export function TipBody({ label, value, delta, suffix = "" }) {
  return (
    <>
      <div className="tip-label">{label}</div>
      <div className="tip-value">{value}</div>
      {delta && (
        <div className="tip-delta" style={{ color: delta.color }}>
          {delta.text}
          {suffix}
        </div>
      )}
    </>
  );
}
