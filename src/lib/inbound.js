export const IB = { date: 0, month: 1, leadBy: 2, location: 3, remark: 4, source: 5, phase: 6, status: 7, sample: 8 };

const RCAT_PATTERNS = {
  "Catalogue shared": ["catalogue shared", "catalog shared", "catlog shared", "shared the catlog", "shared catalog", "catalogue send", "shared catlog", "catalogue sent", "catalog sent", "catlogue sent"],
  "Did not pick up": ["did not pick", "didn't pick", "dnp", "not pick", "no pick", "didnt pick", "did not piclup", "didn't picked"],
  "Not interested": ["not interested", "not int", "no interest", "noint", "not intrested", "not intersted", "does not deal", "not deals", "no requirement", "not required", "not deal", "does not work in fmcg", "works in mt"],
  "Busy / call later": ["busy", "call later", "call back", "will call", "call tomm", "call tomorr", "call after"],
  "Number issue": ["wrong number", "no number", "switched off", "not reachable", "invalid", "not available", "number does not exist", "wrong no"],
};
export const RCAT_ORDER = ["Catalogue shared", "Did not pick up", "Not interested", "Busy / call later", "Number issue", "Other"];

function classifyRemark(text) {
  if (!text) return "Other";
  const t = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(RCAT_PATTERNS)) {
    if (keywords.some((k) => t.includes(k))) return cat;
  }
  return "Other";
}

export function filterInbound(rows, f) {
  return rows.filter((r) => {
    const m = r[IB.month];
    const d = r[IB.date];
    if (f.monthFrom !== "ALL" && m && m < f.monthFrom) return false;
    if (f.monthTo !== "ALL" && m && m > f.monthTo) return false;
    if (f.dateFrom && d && d < f.dateFrom) return false;
    if (f.dateTo && d && d > f.dateTo) return false;
    return true;
  });
}

const sortedCounts = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

export function aggregateInbound(rows) {
  let convertedLeads = 0, hotLeads = 0, coldLeads = 0, samplesProvided = 0;
  const statusBreakdown = {}, sourceBreakdown = {}, leadBy = {}, locations = {};
  const monthVolume = {}, monthConverted = {}, remarksCatCount = {}, remarksRaw = [];
  const today = new Date().toISOString().slice(0, 10);
  let overdue90 = 0, overdue30 = 0, overdueUnder30 = 0, upcoming = 0;

  rows.forEach((r) => {
    const owner = r[IB.leadBy], loc = r[IB.location], remark = r[IB.remark];
    const phase = r[IB.phase], status = r[IB.status];
    const phaseL = phase.toLowerCase(), statusL = status.toLowerCase();
    const isConverted = phaseL.includes("converted") || statusL.includes("converted");
    const isHot = phaseL.includes("hot");
    if (isConverted) convertedLeads++;
    if (isHot) hotLeads++;
    if (phaseL.includes("cold")) coldLeads++;
    if (r[IB.sample].toLowerCase() === "yes") samplesProvided++;

    const statusKey = status || "Not set";
    const sourceKey = r[IB.source] || "Not set";
    statusBreakdown[statusKey] = (statusBreakdown[statusKey] || 0) + 1;
    sourceBreakdown[sourceKey] = (sourceBreakdown[sourceKey] || 0) + 1;

    const lb = (leadBy[owner] ||= { total: 0, converted: 0, hot: 0 });
    lb.total++;
    if (isConverted) lb.converted++;
    if (isHot) lb.hot++;
    const lc = (locations[loc] ||= { total: 0, converted: 0 });
    lc.total++;
    if (isConverted) lc.converted++;

    const m = r[IB.month];
    if (m) {
      monthVolume[m] = (monthVolume[m] || 0) + 1;
      if (isConverted) monthConverted[m] = (monthConverted[m] || 0) + 1;
    }

    const d = r[IB.date];
    if (d) {
      const diff = (new Date(today) - new Date(d)) / 86400000;
      if (diff >= 90) overdue90++;
      else if (diff >= 30) overdue30++;
      else if (diff >= 0) overdueUnder30++;
      else upcoming++;
    }

    if (remark) {
      const cat = classifyRemark(remark);
      remarksCatCount[cat] = (remarksCatCount[cat] || 0) + 1;
      if (remarksRaw.length < 200) remarksRaw.push({ remark, leadBy: owner, location: loc, status: phase || status || "Pending", cat });
    }
  });

  const total = rows.length;
  return {
    kpis: {
      totalLeads: total, convertedLeads, hotLeads, coldLeads, samplesProvided,
      conversionRate: total > 0 ? ((convertedLeads / total) * 100).toFixed(1) + "%" : "0%",
    },
    statusBreakdown: sortedCounts(statusBreakdown),
    sourceBreakdown: sortedCounts(sourceBreakdown),
    leadByPerformance: Object.entries(leadBy)
      .map(([name, m]) => ({ name, ...m, convRate: m.total > 0 ? ((m.converted / m.total) * 100).toFixed(1) : "0.0" }))
      .sort((a, b) => b.total - a.total),
    topLocations: Object.entries(locations)
      .map(([place, m]) => ({ place, ...m }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    remarksBreakdown: RCAT_ORDER.map((name) => ({ name, count: remarksCatCount[name] || 0 })).filter((c) => c.count > 0),
    remarksRaw,
    monthlyVolume: Object.keys(monthVolume).sort().map((m) => ({ month: m, count: monthVolume[m], converted: monthConverted[m] || 0 })),
    urgency: { overdue90, overdue30, overdueUnder30, upcoming },
  };
}
