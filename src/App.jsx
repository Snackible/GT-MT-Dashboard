import { useMemo, useState } from "react";
import { Spinner } from "./components/ui";
import Particles from "./components/Particles";
import MtView from "./views/MtView";
import GtView from "./views/GtView";
import RtvView from "./views/RtvView";
import InboundView from "./views/InboundView";

const TABS = [
  { id: "mt", label: "Modern Trade", color: "52,211,153", hex: "#34D399" },
  { id: "gt", label: "GT Sales", color: "163,230,53", hex: "#A3E635" },
  { id: "rtv", label: "RTV", color: "248,113,113", hex: "#F87171" },
  { id: "inbound", label: "Inbound Leads", color: "251,191,36", hex: "#FBBF24" },
];

export default function App() {
  const [tab, setTab] = useState("mt");
  const [loading, setLoading] = useState({});
  const loadingFor = (id) => (v) => setLoading((l) => (l[id] === v ? l : { ...l, [id]: v }));
  const cbs = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, loadingFor(t.id)])), []);
  const cur = TABS.find((t) => t.id === tab);

  return (
    <>
      <div className="nav">
        <div className="nav-brand">
          <div className="dot" style={{ background: cur.hex, boxShadow: `0 0 0 3px rgba(${cur.color},.18),0 0 12px rgba(${cur.color},.6)` }} />
          <div className="nav-brand-text">Command Center</div>
        </div>
        <div className="nav-divider" />
        <div className="seg">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}{loading[t.id] && <Spinner />}</button>
          ))}
        </div>
      </div>

      <Particles tab={tab} />

      {/* All views stay mounted so filters and loaded data survive tab switches. */}
      <div className="view" hidden={tab !== "mt"}><MtView onLoading={cbs.mt} /></div>
      <div className="view" hidden={tab !== "gt"}><GtView active={tab === "gt"} onLoading={cbs.gt} /></div>
      <div className="view" hidden={tab !== "rtv"}><RtvView /></div>
      <div className="view" hidden={tab !== "inbound"}><InboundView active={tab === "inbound"} onLoading={cbs.inbound} /></div>
    </>
  );
}
