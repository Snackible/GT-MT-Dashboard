// ===== Background Particles =====
(function(){
  const cvs=document.getElementById('particles');
  const ctx=cvs.getContext('2d');
  let W,H,particles=[],raf;
  const mouse={x:null,y:null,r:160};

  function size(){
    W = cvs.width = window.innerWidth;
    H = cvs.height = Math.max(document.body.scrollHeight, window.innerHeight);
    init();
  }
  function init(){
    particles=[];
    const n=Math.min(140,Math.floor(W*H/11000));
    for(let i=0;i<n;i++){
      particles.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.35,vy:(Math.random()-.5)*.35,r:Math.random()*1.6+.7});
    }
  }
  function step(){
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    if(window.currentTab === 'inbound') { raf=requestAnimationFrame(step); return; }
    for(const p of particles){
      if(p.x<0||p.x>W)p.vx*=-1;
      if(p.y<0||p.y>H)p.vy*=-1;
      if(mouse.x!==null){
        const dx=mouse.x-p.x,dy=mouse.y-p.y,d=Math.hypot(dx,dy);
        if(d<mouse.r){const f=(mouse.r-d)/mouse.r;p.x-=dx/d*f*2.2;p.y-=dy/d*f*2.2;}
      }
      p.x+=p.vx;p.y+=p.vy;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle= window.currentTab === 'inbound' ? 'rgba(251,191,36,.85)' : 'rgba(180,140,255,.85)';
      ctx.fill();
    }
    for(let a=0;a<particles.length;a++){
      for(let b=a+1;b<particles.length;b++){
        const A=particles[a],B=particles[b];
        const dd=(A.x-B.x)**2+(A.y-B.y)**2;
        if(dd<14000){
          const op=1-dd/14000;
          let near=false;
          if(mouse.x!==null){const md=Math.hypot(A.x-mouse.x,A.y-mouse.y);if(md<mouse.r)near=true;}
          
          if(window.currentTab === 'inbound') {
            ctx.strokeStyle=near?`rgba(255,255,255,${op})`:`rgba(251,191,36,${op*.5})`;
          } else {
            ctx.strokeStyle=near?`rgba(255,255,255,${op})`:`rgba(160,130,255,${op*.7})`;
          }
          ctx.lineWidth=.8;
          ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();
        }
      }
    }
    raf=requestAnimationFrame(step);
  }
  addEventListener('resize',size);
  addEventListener('scroll',()=>{
    const needed=Math.max(document.body.scrollHeight,window.innerHeight);
    if(needed>H){H=cvs.height=needed;init();}
  });
  addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY});
  addEventListener('mouseout',()=>{mouse.x=null;mouse.y=null});
  window.currentTab = 'mt';
  size();step();
})();

// ===== Application Logic & Data Fetching =====
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxGLvZw0ICbRcE9IuOWpuDRN-2LVx_dFW7hMd5K3Yg-VZQ8s4Xc3W85tFiHy9HZmmly/exec";

let _mtCachedData = null;
let _inboundLoaded = false;

// MT filter state
let _mtMonths = "ALL";
let _mtZone = "ALL";

const MT_PERIOD_OPTIONS = {
  yearly: [
    { label: "FY 25-26", value: "2025-07,2025-08,2025-09,2025-10,2025-11,2025-12,2026-01,2026-02,2026-03" },
    { label: "FY 26-27", value: "2026-04,2026-05,2026-06,2026-07,2026-08,2026-09,2026-10,2026-11,2026-12" }
  ],
  quarterly: [
    { label: "Q1 Jul–Sep 25", value: "2025-07,2025-08,2025-09" },
    { label: "Q2 Oct–Dec 25", value: "2025-10,2025-11,2025-12" },
    { label: "Q3 Jan–Mar 26", value: "2026-01,2026-02,2026-03" },
    { label: "Q4 Apr–Jun 26", value: "2026-04,2026-05,2026-06" },
    { label: "Q1 Jul–Sep 26", value: "2026-07,2026-08,2026-09" },
    { label: "Q2 Oct–Dec 26", value: "2026-10,2026-11,2026-12" }
  ],
  monthly: [
    { label: "Jul 25", value: "2025-07" },
    { label: "Aug 25", value: "2025-08" },
    { label: "Sep 25", value: "2025-09" },
    { label: "Oct 25", value: "2025-10" },
    { label: "Nov 25", value: "2025-11" },
    { label: "Dec 25", value: "2025-12" },
    { label: "Jan 26", value: "2026-01" },
    { label: "Feb 26", value: "2026-02" },
    { label: "Mar 26", value: "2026-03" },
    { label: "Apr 26", value: "2026-04" },
    { label: "May 26", value: "2026-05" },
    { label: "Jun 26", value: "2026-06" },
    { label: "Jul 26", value: "2026-07" }
  ]
};

function fetchMtData(months) {
  const url = APPS_SCRIPT_URL + "?action=mtData" + (months !== "ALL" ? "&months=" + months : "");
  document.getElementById("mt-kpi-sales").innerText = "...";
  fetch(url)
    .then(r => r.json())
    .then(data => {
      _mtCachedData = data;
      renderMtDashboard(data, _mtZone);
    })
    .catch(err => console.error("MT Load Failed:", err));
}

function updatePeriodValueDropdown(type) {
  const wrap = document.getElementById("mt-period-value-wrap");
  const label = document.getElementById("mt-period-value-label");
  const sel = document.getElementById("mt-period-value");

  if (type === "all") {
    wrap.style.display = "none";
    _mtMonths = "ALL";
    fetchMtData("ALL");
    return;
  }

  wrap.style.display = "flex";
  label.textContent = type === "yearly" ? "Year" : type === "quarterly" ? "Quarter" : "Month";

  const opts = MT_PERIOD_OPTIONS[type] || [];
  sel.innerHTML = opts.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
  _mtMonths = opts[0]?.value || "ALL";
  fetchMtData(_mtMonths);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('particles').style.opacity = '1';
  fetchMtData("ALL");
  // Hide value dropdown initially
  document.getElementById("mt-period-value-wrap").style.display = "none";

  // Period type dropdown
  document.getElementById("mt-period-type").addEventListener("change", function() {
    updatePeriodValueDropdown(this.value);
  });

  // Period value dropdown
  document.getElementById("mt-period-value").addEventListener("change", function() {
    _mtMonths = this.value;
    fetchMtData(_mtMonths);
  });

  // Zone dropdown
  document.getElementById("mt-zone-select").addEventListener("change", function() {
    _mtZone = this.value;
    if (_mtCachedData) renderMtDashboard(_mtCachedData, _mtZone);
  });
});
// ===== Inbound date filtering state =====
let _inboundRows = [];
let _inboundMonths = [];
let _ibMonthFrom = "ALL";
let _ibMonthTo = "ALL";
let _ibDateFrom = "";
let _ibDateTo = "";

const IB_RI = { date:0, month:1, leadBy:2, location:3, remark:4, source:5, phase:6, status:7, sample:8 };

const IB_MONTH_LABELS = {
  "2025-07":"Jul 25","2025-08":"Aug 25","2025-09":"Sep 25","2025-10":"Oct 25",
  "2025-11":"Nov 25","2025-12":"Dec 25","2026-01":"Jan 26","2026-02":"Feb 26",
  "2026-03":"Mar 26","2026-04":"Apr 26","2026-05":"May 26","2026-06":"Jun 26"
};

function getFilteredInboundRows() {
  return _inboundRows.filter(r => {
    const m = r[IB_RI.month];
    const d = r[IB_RI.date];
    if (_ibMonthFrom !== "ALL" && m && m < _ibMonthFrom) return false;
    if (_ibMonthTo   !== "ALL" && m && m > _ibMonthTo)   return false;
    if (_ibDateFrom && d && d < _ibDateFrom) return false;
    if (_ibDateTo   && d && d > _ibDateTo)   return false;
    return true;
  });
}

function aggregateInbound(rows) {
  let totalLeads = 0, convertedLeads = 0, hotLeads = 0, coldLeads = 0, samplesProvided = 0;
  const phaseBreakdown = {}, statusBreakdown = {}, sourceBreakdown = {};
  const leadByBreakdown = {}, locationBreakdown = {};
  const recentRemarks = [];

  rows.forEach(r => {
    totalLeads++;
    const leadByName = r[IB_RI.leadBy];
    const locName = r[IB_RI.location];
    const remark = r[IB_RI.remark];
    const source = r[IB_RI.source];
    const phase = r[IB_RI.phase];
    const status = r[IB_RI.status];
    const sample = r[IB_RI.sample];

    const phaseLower = phase.toLowerCase();
    const statusLower = status.toLowerCase();
    const isConverted = phaseLower.includes("converted") || statusLower.includes("converted");
    const isHot = phaseLower.includes("hot");
    const isCold = phaseLower.includes("cold");

    if (isConverted) convertedLeads++;
    if (isHot) hotLeads++;
    if (isCold) coldLeads++;
    if (sample.toLowerCase() === "yes") samplesProvided++;

    const phaseKey = phase || "Not set";
    phaseBreakdown[phaseKey] = (phaseBreakdown[phaseKey] || 0) + 1;
    const statusKey = status || "Not set";
    statusBreakdown[statusKey] = (statusBreakdown[statusKey] || 0) + 1;
    const sourceKey = source || "Not set";
    sourceBreakdown[sourceKey] = (sourceBreakdown[sourceKey] || 0) + 1;

    if (!leadByBreakdown[leadByName]) leadByBreakdown[leadByName] = { total: 0, converted: 0, hot: 0 };
    leadByBreakdown[leadByName].total++;
    if (isConverted) leadByBreakdown[leadByName].converted++;
    if (isHot) leadByBreakdown[leadByName].hot++;

    if (!locationBreakdown[locName]) locationBreakdown[locName] = { total: 0, converted: 0 };
    locationBreakdown[locName].total++;
    if (isConverted) locationBreakdown[locName].converted++;

    if (remark && recentRemarks.length < 20) {
      recentRemarks.push({ leadBy: leadByName, location: locName, remark, status: phase || status || "Pending" });
    }
  });

  const sortedLeadOwners = Object.entries(leadByBreakdown)
    .map(([name, m]) => ({ name, total: m.total, converted: m.converted, hot: m.hot, convRate: m.total > 0 ? ((m.converted/m.total)*100).toFixed(1) : "0.0" }))
    .sort((a,b) => b.total - a.total);

  const sortedLocations = Object.entries(locationBreakdown)
    .map(([place, m]) => ({ place, total: m.total, converted: m.converted }))
    .sort((a,b) => b.total - a.total).slice(0,10);

  const monthVolume = {};
    const monthConverted = {};
    rows.forEach(r => {
      const m = r[IB_RI.month];
      if (!m) return;
      monthVolume[m] = (monthVolume[m] || 0) + 1;
      const phase = String(r[IB_RI.phase] || '').toLowerCase();
      const status = String(r[IB_RI.status] || '').toLowerCase();
      if (phase.includes('converted') || status.includes('converted')) {
        monthConverted[m] = (monthConverted[m] || 0) + 1;
      }
    });

  const today = new Date().toISOString().slice(0,10);
  let overdue90 = 0, overdue30 = 0, overdueUnder30 = 0, upcoming = 0;
  rows.forEach(r => {
    const d = r[IB_RI.date];
    if (!d) return;
    const diffDays = (new Date(today) - new Date(d)) / 86400000;
    if (diffDays >= 90) overdue90++;
    else if (diffDays >= 30) overdue30++;
    else if (diffDays >= 0) overdueUnder30++;
    else upcoming++;
  });

  // Classify remarks into categories
  const RCAT_PATTERNS = {
    "Catalogue shared":  ["catalogue shared","catalog shared","catlog shared","shared the catlog","shared catalog","catalogue send","shared catlog","catalogue sent","catalog sent","catlogue sent"],
    "Did not pick up":   ["did not pick","didn't pick","dnp","not pick","no pick","didnt pick","did not piclup","didn't picked"],
    "Not interested":    ["not interested","not int","no interest","noint","not intrested","not intersted","does not deal","not deals","no requirement","not required","not deal","does not work in fmcg","works in mt"],
    "Busy / call later": ["busy","call later","call back","will call","call tomm","call tomorr","call after"],
    "Number issue":      ["wrong number","no number","switched off","not reachable","invalid","not available","number does not exist","wrong no"]
  };

  function classifyRemark(text) {
    if (!text) return "Other";
    const t = text.toLowerCase();
    for (const [cat, keywords] of Object.entries(RCAT_PATTERNS)) {
      if (keywords.some(k => t.includes(k))) return cat;
    }
    return "Other";
  }

  const remarksCatCount = {};
  const remarksRaw = [];

  rows.forEach(r => {
    const remark = r[IB_RI.remark];
    const leadBy = r[IB_RI.leadBy];
    const location = r[IB_RI.location];
    const status = r[IB_RI.phase] || r[IB_RI.status] || "Pending";
    if (!remark) return;
    const cat = classifyRemark(remark);
    remarksCatCount[cat] = (remarksCatCount[cat] || 0) + 1;
    if (remarksRaw.length < 200) {
      remarksRaw.push({ remark, leadBy, location, status, cat });
    }
  });

  const RCAT_ORDER = ["Catalogue shared","Did not pick up","Not interested","Busy / call later","Number issue","Other"];
  const remarksBreakdown = RCAT_ORDER.map(name => ({ name, count: remarksCatCount[name] || 0 })).filter(c => c.count > 0);

  return {
    kpis: {
      totalLeads, convertedLeads, hotLeads, coldLeads, samplesProvided,
      conversionRate: totalLeads > 0 ? ((convertedLeads/totalLeads)*100).toFixed(1) + "%" : "0%"
    },
    statusBreakdown: Object.entries(statusBreakdown).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})),
    sourceBreakdown: Object.entries(sourceBreakdown).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})),
    leadByPerformance: sortedLeadOwners,
    topLocations: sortedLocations,
    remarksBreakdown,
    remarksRaw,
    monthlyVolume: Object.keys(monthVolume).sort().map(m => ({ month: m, count: monthVolume[m], converted: monthConverted[m] || 0 })),
    urgency: { overdue90, overdue30, overdueUnder30, upcoming }
  };
}

function renderInboundFromFilters() {
  const rows = getFilteredInboundRows();
  const agg = aggregateInbound(rows);
  renderInboundDashboard(agg);

  const summaryEl = document.getElementById('inbound-filter-summary');
  if (summaryEl) {
    const parts = [];
    if (_ibMonthFrom !== "ALL" || _ibMonthTo !== "ALL") {
      parts.push(`${IB_MONTH_LABELS[_ibMonthFrom] || 'start'} → ${IB_MONTH_LABELS[_ibMonthTo] || 'latest'}`);
    }
    if (_ibDateFrom || _ibDateTo) {
      parts.push(`${_ibDateFrom || 'start'} → ${_ibDateTo || 'today'}`);
    }
    summaryEl.textContent = parts.length ? `Showing ${rows.length} of ${_inboundRows.length} leads · ${parts.join(' · ')}` : `Showing all ${rows.length} leads`;
  }
}
document.getElementById('inbound-month-from')?.addEventListener('change', e => {
  _ibMonthFrom = e.target.value; renderInboundFromFilters();
});
document.getElementById('inbound-month-to')?.addEventListener('change', e => {
  _ibMonthTo = e.target.value; renderInboundFromFilters();
});
document.getElementById('inbound-date-from')?.addEventListener('change', e => {
  _ibDateFrom = e.target.value; renderInboundFromFilters();
});
document.getElementById('inbound-date-to')?.addEventListener('change', e => {
  _ibDateTo = e.target.value; renderInboundFromFilters();
});
document.getElementById('inbound-reset-dates')?.addEventListener('click', () => {
  _ibMonthFrom = "ALL"; _ibMonthTo = "ALL"; _ibDateFrom = ""; _ibDateTo = "";
  document.getElementById('inbound-month-from').value = "ALL";
  document.getElementById('inbound-month-to').value = "ALL";
  document.getElementById('inbound-date-from').value = "";
  document.getElementById('inbound-date-to').value = "";
  renderInboundFromFilters();
});

// Tab Switching
  function switchTab(view) {
  window.currentTab = view;
  // Toggle UI buttons
  const buttons = document.querySelectorAll('#dashboard-tabs button');
  buttons[0].classList.toggle('on', view === 'mt');
  buttons[1].classList.toggle('on', view === 'gt');
  buttons[2].classList.toggle('on', view === 'inbound');
  
  // Toggle branding dot color
  const dot = document.getElementById('nav-dot');
  if(view === 'inbound') {
    document.getElementById('particles').style.opacity = '0';
    dot.style.background = '#FBBF24';
    dot.style.boxShadow = '0 0 0 3px rgba(251,191,36,.18),0 0 12px rgba(251,191,36,.6)';
  } else if(view === 'gt') {
    dot.style.background = '#A3E635';
    dot.style.boxShadow = '0 0 0 3px rgba(163,230,53,.18),0 0 12px rgba(163,230,53,.6)';
  } else {
    document.getElementById('particles').style.opacity = '1';
    dot.style.background = '#34D399';
    dot.style.boxShadow = '0 0 0 3px rgba(52,211,153,.18),0 0 12px rgba(52,211,153,.6)';
  }

  // Toggle View Containers
  document.getElementById('view-mt').style.display = view === 'mt' ? 'block' : 'none';
  document.getElementById('view-gt').style.display = view === 'gt' ? 'block' : 'none';
  document.getElementById('view-inbound').style.display = view === 'inbound' ? 'block' : 'none';
  // Load inbound data if clicked for the first time
  if (view === 'gt' && !_gtLoaded) {
    console.log("Fetching GT Data...");
    document.getElementById("gt-kpi-sales").innerText = "Loading...";
    fetch(APPS_SCRIPT_URL + "?action=gtData")
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.error) { console.error(data.error); return; }
        _gtLoaded = true;
        _gtRows = data.rows;
        initGtFilters();
        renderGtDashboard();
      })
      .catch(function(err) { console.error("GT Load Failed:", err); });
  }

  if (view === 'inbound' && !_inboundLoaded) {
    console.log("Fetching Inbound Data...");
    document.getElementById('inbound-kpi-total').innerText = "Load...";
    fetch(APPS_SCRIPT_URL + "?action=inboundData")
      .then(r => r.json())
      .then(data => {
        if (data.error) { console.error(data.error); return; }
        _inboundLoaded = true;
        _inboundRows = data.rows;

        const mSet = new Set(_inboundRows.map(r => r[IB_RI.month]).filter(Boolean));
        _inboundMonths = Array.from(mSet).sort();
        const fromSel = document.getElementById('inbound-month-from');
        const toSel = document.getElementById('inbound-month-to');
        _inboundMonths.forEach(m => {
          const label = IB_MONTH_LABELS[m] || m;
          fromSel.innerHTML += `<option value="${m}">${label}</option>`;
          toSel.innerHTML += `<option value="${m}">${label}</option>`;
        });

        renderInboundFromFilters();
      })
      .catch(err => console.error("Inbound Load Failed:", err));
  }
}

// ===== MT Dashboard Rendering =====
function renderMtDashboard(data, zoneFilter) {
  if (data.error) { console.error(data.error); return; }
  const kpi = data.kpis;

  let filteredSales, filteredStores, filteredSkus, filteredStores2, filteredStates;
  if (zoneFilter === 'ALL') {
    filteredSales = kpi.netSalesRaw;
    filteredStores = kpi.activeStores;
    filteredSkus = data.topSkus;
    filteredStores2 = data.topStores;
    filteredStates = data.states;
  } else {
    const zd = data.zones[zoneFilter] || { sales: 0 };
    filteredSales = zd.sales;
    filteredStores = data.zoneStoreCount?.[zoneFilter] || 0;
    filteredSkus = data.topSkus;
    filteredStores2 = data.zoneTopStores?.[zoneFilter] || [];
    filteredStates = data.zoneStates?.[zoneFilter] || [];
  }

  const fmtSales = filteredSales >= 100000 
    ? "₹" + (filteredSales/100000).toFixed(2) + "L" 
    : "₹" + Math.round(filteredSales).toLocaleString('en-IN');

  const hkpiSales = document.getElementById('hkpi-sales');
  const hkpiStores = document.getElementById('hkpi-stores');
  if (hkpiSales) hkpiSales.innerText = kpi.netSalesFormatted;
  if (hkpiStores) hkpiStores.innerText = kpi.activeStores;
  document.getElementById('mt-kpi-sales').innerText = fmtSales;
  document.getElementById('mt-kpi-stores').innerText = filteredStores;
  document.getElementById('mt-kpi-velocity').innerText = filteredStores > 0 ? "₹" + Math.round(filteredSales / filteredStores).toLocaleString('en-IN') : "—";
  
  const zonePct = zoneFilter === 'ALL' ? kpi.topZonePct : (data.zones[zoneFilter]?.pct || "0");
  document.getElementById('mt-kpi-zonepct').innerText = zonePct + "%";

  // Zone Bars
  const zoneOrder = ["WEST","NORTH","EAST","SOUTH"];
  const maxZoneSales = Math.max(...zoneOrder.map(z => data.zones[z]?.sales || 0));
  const zClass = ["","v2","v3","v4"];
  document.getElementById('mt-zones').innerHTML = zoneOrder.map((zone, i) => {
    if(!data.zones[zone]) return '';
    const z = data.zones[zone];
    const width = (z.sales / maxZoneSales * 100) + "%";
    const val = "₹" + (z.sales >= 100000 ? (z.sales/100000).toFixed(2)+"L" : Math.round(z.sales).toLocaleString('en-IN'));
    return `<div class="zoneitem ${zClass[i]}"><span class="lbl">${zone.charAt(0)+zone.slice(1).toLowerCase()}</span><div class="zonebar"><div style="width:${width}"></div></div><span class="val num">${val}<span class="pct">${z.pct}%</span></span></div>`;
  }).join('');

  // SKUs
  if (data.topSkus) {
    document.getElementById('mt-skus').innerHTML = data.topSkus.map((s, i) => {
      const name = s.name.replace(/SNACKIBLE\s*/i,'').replace(/\b(\w)/g,c=>c.toUpperCase()).slice(0,35);
      const val = s.sales >= 100000 ? "₹"+(s.sales/100000).toFixed(2)+"L" : "₹"+Math.round(s.sales).toLocaleString('en-IN');
      return `<div class="skurow"><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="skuname">${name}</span><div class="skubar"><div style="width:${s.pctOfTop}%"></div></div><span class="skuval">${val}</span></div>`;
    }).join('');
  }

  // Stores with sparklines + tooltip
  if (filteredStores2) {
    const allMonths = data.monthly ? data.monthly.map(m => m.month) : [];
    const MONTH_LABELS = {
      "2025-07":"Jul 25","2025-08":"Aug 25","2025-09":"Sep 25","2025-10":"Oct 25",
      "2025-11":"Nov 25","2025-12":"Dec 25","2026-01":"Jan 26","2026-02":"Feb 26",
      "2026-03":"Mar 26","2026-04":"Apr 26","2026-05":"May 26","2026-06":"Jun 26",
      "2026-07":"Jul 26"
    };

    const W = 240, H = 36, pad = 4;

    document.getElementById('mt-stores').innerHTML = filteredStores2.map((s, idx) => {
      const val = s.sales >= 100000 ? "₹"+(s.sales/100000).toFixed(2)+"L" : "₹"+Math.round(s.sales).toLocaleString('en-IN');
      const cap = s.name.replace(/\b(\w)/g,c=>c.toUpperCase()).slice(0,40);
      const zone = s.zone ? s.zone.charAt(0)+s.zone.slice(1).toLowerCase() : '';
      const monthly = s.monthly || {};
      const months = allMonths.length > 0 ? allMonths : Object.keys(monthly).sort();
      const vals = months.map(m => monthly[m] || 0);
      const maxV = Math.max(...vals, 1);
      const step = months.length > 1 ? (W - pad*2) / (months.length - 1) : 0;
      const pts = vals.map((v, i) => ({
        x: pad + i * step,
        y: pad + (H - pad*2) - (v / maxV) * (H - pad*2),
        val: v,
        month: months[i]
      }));

      const lastVal = vals[vals.length-1];
      const prevVal = vals[vals.length-2] || 0;
      const trend = lastVal - prevVal;
      const trendCol = trend > 0 ? '#34D399' : trend < 0 ? '#F87171' : '#5C6573';
      const trendLabel = trend > 0 ? '↑ trending' : trend < 0 ? '↓ declining' : '→ flat';

      const polyPts = pts.map(p => `${p.x},${p.y}`).join(' ');

      // Invisible hover zones + visible dots per data point
      const circles = pts.map((p, i) => {
        const prev = vals[i-1] || 0;
        const pct = prev > 0 ? (((p.val - prev) / prev) * 100).toFixed(1) : null;
        const pctStr = pct !== null ? (pct >= 0 ? `+${pct}%` : `${pct}%`) : 'first month';
        const pctCol = pct === null ? '#9AA4B2' : pct >= 0 ? '#34D399' : '#F87171';
        const fmtVal = p.val >= 100000 ? "₹"+(p.val/100000).toFixed(2)+"L" : "₹"+Math.round(p.val).toLocaleString('en-IN');
        const label = MONTH_LABELS[p.month] || p.month;
        return `<circle
          cx="${p.x}" cy="${p.y}" r="10"
          fill="transparent"
          class="spark-dot"
          data-month="${label}"
          data-val="${fmtVal}"
          data-pct="${pctStr}"
          data-pct-col="${pctCol}"
          data-store="${idx}"
        />
        <circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${trendCol}" opacity="0.6" pointer-events="none"/>`;
      }).join('');

      return `<div style="padding:14px 0;border-bottom:1px solid #161C25">
        <div style="display:grid;grid-template-columns:1fr 90px;gap:12px;align-items:start">
          <div>
            <div style="font-size:13px;color:#F5F7FA;font-weight:500;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cap}</div>
            <div style="font-size:11px;color:#5C6573;margin-bottom:8px">${s.state} · ${zone}</div>
            <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" style="overflow:visible;display:block">
              <polyline points="${polyPts}" fill="none" stroke="${trendCol}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              ${circles}
            </svg>
          </div>
          <div style="text-align:right;padding-top:2px">
            <div style="font-size:15px;font-weight:600;color:#F5F7FA">${val}</div>
            <div style="font-size:11px;color:${trendCol};margin-top:4px">${trendLabel}</div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Tooltip
    const tip = document.createElement('div');
    tip.id = 'spark-tip';
    tip.style.cssText = 'position:fixed;display:none;background:#11161F;border:1px solid #1F2733;border-radius:10px;padding:10px 14px;font-size:12px;color:#F5F7FA;pointer-events:none;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.6);font-family:system-ui,sans-serif;min-width:120px';
    document.body.appendChild(tip);

    document.getElementById('mt-stores').addEventListener('mousemove', function(e) {
      const dot = e.target.closest('.spark-dot');
      if (!dot) { tip.style.display = 'none'; return; }
      const month = dot.dataset.month;
      const val = dot.dataset.val;
      const pct = dot.dataset.pct;
      const col = dot.dataset.pctCol;
      tip.innerHTML = `<div style="font-size:11px;color:#9AA4B2;margin-bottom:4px">${month}</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px">${val}</div>
        <div style="font-size:12px;color:${col};font-weight:500">${pct} vs prior month</div>`;
      tip.style.display = 'block';
      tip.style.left = (e.clientX + 14) + 'px';
      tip.style.top = (e.clientY - 40) + 'px';
    });

    document.getElementById('mt-stores').addEventListener('mouseleave', function() {
      tip.style.display = 'none';
    });
  }

  // Categories
  const catColors = ['#22D3EE','#A78BFA','#F472B6','#A3E635','#FBBF24','#34D399','#7C8390'];
  if (data.categories) {
    document.getElementById('mt-catbar').innerHTML = data.categories.map((c,i) => {
      const col = catColors[i] || '#555';
      const label = parseFloat(c.pct) > 7 ? c.pct+'%' : '';
      const textCol = ['#A3E635','#FBBF24'].includes(col) ? 'color:#000' : '';
      return `<div style="flex:${Math.round(c.sales)};background:${col};${textCol}">${label}</div>`;
    }).join('');
    
    document.getElementById('mt-catlegend').innerHTML = data.categories.map((c,i) => {
      const col = catColors[i] || '#555';
      const name = c.name.charAt(0)+c.name.slice(1).toLowerCase();
      const val = c.sales >= 100000 ? "₹"+(c.sales/100000).toFixed(2)+"L" : "₹"+Math.round(c.sales).toLocaleString('en-IN');
      return `<div><span class="lbl"><i style="background:${col}"></i>${name}</span><span class="val">${val}</span></div>`;
    }).join('');
  }

  // Monthly horizontal bar chart
  const hbarEl = document.getElementById("mt-monthly-hbar");
  if (hbarEl && data.monthly && data.monthly.length > 0) {
    const maxMonthSales = Math.max(...data.monthly.map(m => m.sales));
    const monthLabels = {
      "2025-07":"Jul 25","2025-08":"Aug 25","2025-09":"Sep 25","2025-10":"Oct 25",
      "2025-11":"Nov 25","2025-12":"Dec 25","2026-01":"Jan 26","2026-02":"Feb 26",
      "2026-03":"Mar 26","2026-04":"Apr 26","2026-05":"May 26","2026-06":"Jun 26",
      "2026-07":"Jul 26"
    };
    hbarEl.innerHTML = data.monthly.map(m => {
      const pct = (m.sales / maxMonthSales * 100).toFixed(1);
      const val = m.sales >= 100000
        ? "₹" + (m.sales/100000).toFixed(2) + "L"
        : "₹" + Math.round(m.sales).toLocaleString("en-IN");
      const label = monthLabels[m.month] || m.month;
      return `<div style="display:grid;grid-template-columns:54px 1fr 80px;align-items:center;gap:10px">
        <span style="font-size:11px;color:var(--text-2);text-align:right">${label}</span>
        <div style="height:8px;background:var(--panel-2);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#22D3EE,#67E8F9);border-radius:99px;transition:width .4s"></div>
        </div>
        <span style="font-size:12px;color:var(--text-1);font-variant-numeric:tabular-nums">${val}</span>
      </div>`;
    }).join("");
  }

  // States Table
  const statusColor = (v, stores) => {
    const vel = v.sales / (stores || 1);
    return vel > 10000 ? 's-good' : vel > 6000 ? 's-warn' : 's-bad';
  };
  if (filteredStates) {
    document.getElementById('mt-states').innerHTML = filteredStates.map(s => {
      const sc = statusColor(s, s.stores);
      const sales = s.sales >= 100000 ? "₹"+(s.sales/100000).toFixed(2)+"L" : "₹"+Math.round(s.sales).toLocaleString('en-IN');
      return `<tr><td><span class="statusdot ${sc}"></span>${s.name}</td><td class="num">${s.stores}</td><td class="num">${sales}</td><td class="num">${s.velocity}</td></tr>`;
    }).join('');
  }
}

// Zone handled by dropdown above
// ===== INBOUND Dashboard Rendering =====
function renderInboundDashboard(data) {
  if (data.error) { console.error("Backend Error:", data.error); return; }
  const kpi = data.kpis;

  document.getElementById('inbound-kpi-total').innerText = (kpi.totalLeads || 0).toLocaleString();
  document.getElementById('inbound-kpi-hot').innerText = (kpi.hotLeads || 0).toLocaleString();
  document.getElementById('inbound-kpi-cold').innerText = (kpi.coldLeads || 0).toLocaleString();
  document.getElementById('inbound-kpi-converted').innerText = (kpi.convertedLeads || 0).toLocaleString();
  document.getElementById('inbound-kpi-rate').innerText = kpi.conversionRate || "0%";

  const statusList = data.statusBreakdown || [];
  const funnelTotal = statusList.reduce((s,x)=>s+x.count,0) || 1;
  const funnelColors = {
    "overdue": "#F87171", "no follow-up scheduled": "#FBBF24",
    "converted": "#34D399", "cold": "#9AA4B2", "upcoming": "#22D3EE", "not set": "#5C6573",
    "#ref!": null
  };

  const blocksEl = document.getElementById('inbound-funnel-blocks');
  if (blocksEl) {
    blocksEl.innerHTML = statusList
      .filter(s => s.name !== '#REF!' && funnelColors[s.name.toLowerCase()] !== null)
      .slice(0,4).map(s => {
        const col = funnelColors[s.name.toLowerCase()] || "var(--text-1)";
      return `<div class="stat-block"><div class="stat-block-val" style="color:${col}">${s.count}</div><div class="stat-block-label">${s.name.toUpperCase()}</div></div>`;
      }).join('');
  }

  const barsEl = document.getElementById('inbound-funnel-bars');
  if (barsEl) {
    barsEl.innerHTML = statusList
      .filter(s => funnelColors[s.name.toLowerCase()] !== null && s.name !== '#REF!')
      .map(s => {
        const col = funnelColors[s.name.toLowerCase()] || "#5C6573";
        const pct = (s.count / funnelTotal * 100);
        return `<div class="pbar-row"><div class="pbar-head"><span>${s.name}</span><span>${pct.toFixed(1)}%</span></div><div class="pbar-track"><div class="pbar-fill" style="width:${Math.max(pct,1.5)}%;background:${col}"></div></div></div>`;
      }).join('');
  }

  const months = data.monthlyVolume || [];
  const maxVol = Math.max(...months.map(m=>m.count), 1);
  const monthLabels = {"2025-11":"Nov","2025-12":"Dec","2026-01":"Jan","2026-02":"Feb","2026-03":"Mar","2026-04":"Apr","2026-05":"May","2026-06":"Jun"};
  const chartEl = document.getElementById('inbound-monthly-chart');
  const labelsEl = document.getElementById('inbound-monthly-labels');
  if (chartEl) {
    chartEl.innerHTML = months.map(m => {
      const h = Math.max((m.count / maxVol) * 130, 4);
      const isPeak = m.count === maxVol;
      return `<div class="b2b-bar-col"><span class="b2b-bar-val">${m.count}</span><div class="b2b-bar ${isPeak?'peak':''}" style="height:${h}px"></div></div>`;
    }).join('');
  }
  if (labelsEl) {
    labelsEl.innerHTML = months.map(m => `<span class="b2b-bar-label">${monthLabels[m.month]||m.month}</span>`).join('');
  }

  
const convMonths = (data.monthlyVolume || []).filter(m => m.converted > 0);
  const maxConv = Math.max(...convMonths.map(m => m.converted), 1);
  const convChartEl = document.getElementById('inbound-conv-chart');
  const convLabelsEl = document.getElementById('inbound-conv-labels');
  if (convChartEl) {
    convChartEl.innerHTML = convMonths.map(m => {
      const h = Math.max((m.count / maxConv) * 130, 4);
      const isPeak = m.count === maxConv;
      return `<div class="b2b-bar-col"><span class="b2b-bar-val">${m.count}</span><div class="b2b-bar ${isPeak ? 'peak' : ''}" style="height:${h}px;background:#34D399"></div></div>`;
    }).join('');
  }
  if (convLabelsEl) {
    convLabelsEl.innerHTML = convMonths.map(m => `<span class="b2b-bar-label">${monthLabels[m.month] || m.month}</span>`).join('');
  }

  const sourcesEl = document.getElementById('inbound-sources');
  if (sourcesEl && data.sourceBreakdown) {
    const totalSrc = data.sourceBreakdown.reduce((a,s)=>a+s.count,0) || 1;
    sourcesEl.innerHTML = data.sourceBreakdown.map(s => {
      const pct = (s.count / totalSrc * 100);
      return `<div class="pbar-row"><div class="pbar-head"><span>${s.name}</span><span>${s.count} <span style="color:var(--text-2)">${pct.toFixed(1)}%</span></span></div><div class="pbar-track"><div class="pbar-fill" style="width:${Math.max(pct,1.5)}%;background:var(--cyan)"></div></div></div>`;
    }).join('');
  }

  const u = data.urgency || {};
  const urgencyTotal = (u.overdue90||0)+(u.overdue30||0)+(u.overdueUnder30||0)+(u.upcoming||0) || 1;
  const urgencyEl = document.getElementById('inbound-urgency');
  if (urgencyEl) {
    const rows = [
      {label:"90+ days overdue", val:u.overdue90||0, col:"#F87171"},
      {label:"30-90 days overdue", val:u.overdue30||0, col:"#FBBF24"},
      {label:"Under 30 days overdue", val:u.overdueUnder30||0, col:"#FBBF24"},
      {label:"Upcoming", val:u.upcoming||0, col:"#34D399"}
    ];
    urgencyEl.innerHTML = rows.map(r => {
      const pct = (r.val / urgencyTotal * 100);
      return `<div class="pbar-row"><div class="pbar-head"><span>${r.label}</span><span>${r.val}</span></div><div class="pbar-track"><div class="pbar-fill" style="width:${Math.max(pct,1.5)}%;background:${r.col}"></div></div></div>`;
    }).join('');
  }

  if (data.leadByPerformance) {
    document.getElementById('inbound-leadby').innerHTML = data.leadByPerformance.map(rep => {
      const wonClass = rep.converted > 0 ? 'pos' : 'neu';
      const rateClass = parseFloat(rep.convRate) > 0 ? 'pos' : 'neu';
      const hot = rep.hot > 0 ? ` · ${rep.hot} hot` : '';
      return `<tr><td>${rep.name}${hot}</td><td class="num">${rep.total}</td><td class="num ${wonClass}">${rep.converted}</td><td class="num ${rateClass}">${rep.convRate}%</td></tr>`;
    }).join('');
  }

  if (data.topLocations) {
    document.getElementById('inbound-locations').innerHTML = data.topLocations.map(loc => {
      const wonClass = loc.converted > 0 ? 'pos' : 'neu';
      return `<tr><td>${loc.place}</td><td class="num">${loc.total}</td><td class="num ${wonClass}">${loc.converted}</td></tr>`;
    }).join('');
  }

  if (data.remarksBreakdown) {
    const RCAT_COLORS = {
      "Catalogue shared":   "#22D3EE",
      "Did not pick up":    "#5C6573",
      "Not interested":     "#F87171",
      "Busy / call later":  "#FBBF24",
      "Number issue":       "#A78BFA",
      "Other":              "#293345"
    };

    const breakdown = data.remarksBreakdown;
    const totalRemarks = breakdown.reduce((s, c) => s + c.count, 0);

    const totalEl = document.getElementById('inbound-remarks-total');
    if (totalEl) totalEl.textContent = `· ${totalRemarks.toLocaleString()} classified`;

    // Stacked bar
    const barEl = document.getElementById('inbound-remarks-bar');
    if (barEl) {
      barEl.innerHTML = breakdown.map(c => {
        const pct = (c.count / totalRemarks * 100).toFixed(1);
        const col = RCAT_COLORS[c.name] || '#293345';
        const label = parseFloat(pct) > 8 ? `${c.name.split(' ')[0]} ${pct}%` : '';
        return `<div style="flex:${c.count};background:${col};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:${col === '#FBBF24' || col === '#22D3EE' ? '#000' : '#fff'};overflow:hidden;padding:0 4px;white-space:nowrap">${label}</div>`;
      }).join('');
    }

    // Progress bars
    const barsEl = document.getElementById('inbound-remarks-bars');
    if (barsEl) {
      const maxCount = Math.max(...breakdown.map(c => c.count));
      barsEl.innerHTML = breakdown.map(c => {
        const pct = (c.count / totalRemarks * 100).toFixed(1);
        const barW = (c.count / maxCount * 100).toFixed(0);
        const col = RCAT_COLORS[c.name] || '#293345';
        return `<div class="pbar-row" style="margin-bottom:0">
          <div class="pbar-head">
            <span style="display:flex;align-items:center;gap:8px">
              <i style="width:8px;height:8px;background:${col};border-radius:2px;display:inline-block;flex-shrink:0"></i>${c.name}
            </span>
            <span><strong>${c.count}</strong> <span style="color:var(--text-2)">${pct}%</span></span>
          </div>
          <div class="pbar-track"><div class="pbar-fill" style="width:${barW}%;background:${col}"></div></div>
        </div>`;
      }).join('');
    }

    // Pills + filtered feed
    let activeCategory = 'ALL';
    const allRemarks = data.remarksRaw || [];

    function renderRemarksFeed(category) {
      const feedEl = document.getElementById('inbound-remarks-feed');
      if (!feedEl) return;
      const filtered = category === 'ALL'
        ? allRemarks.slice(0, 20)
        : allRemarks.filter(r => r.cat === category).slice(0, 20);

      if (filtered.length === 0) {
        feedEl.innerHTML = `<div style="padding:16px;color:var(--text-2);font-size:13px">No remarks in this category.</div>`;
        return;
      }

      const header = `<div style="padding:8px 12px;background:var(--panel-2);font-size:11px;color:var(--text-2);border-bottom:1px solid var(--line)">${category === 'ALL' ? 'All remarks' : category} · showing ${filtered.length}</div>`;
      feedEl.innerHTML = header + filtered.map(r => {
        const statusLower = (r.status || '').toLowerCase();
        const statusClass = statusLower.includes('hot') ? 'hot' : statusLower.includes('converted') ? 'converted' : '';
        return `<div class="feed-item">
          <div class="feed-meta"><span><strong>${r.leadBy}</strong> · ${r.location}</span><span class="feed-badge ${statusClass}">${r.status || 'Pending'}</span></div>
          <div class="feed-text">"${r.remark}"</div>
        </div>`;
      }).join('');
    }

    const pillsEl = document.getElementById('inbound-remarks-pills');
    if (pillsEl) {
      const allPills = [{ name: 'All', key: 'ALL', col: 'var(--text-2)', count: totalRemarks }, ...breakdown.map(c => ({ name: c.name, key: c.name, col: RCAT_COLORS[c.name] || '#293345', count: c.count }))];
      pillsEl.innerHTML = allPills.map(p =>
        `<span data-cat="${p.key}" style="padding:5px 12px;border-radius:99px;background:${p.col}22;border:1px solid ${p.col}55;font-size:12px;color:${p.col};cursor:pointer">${p.name} ${p.count}</span>`
      ).join('');

      pillsEl.querySelectorAll('span').forEach(pill => {
        pill.addEventListener('click', () => {
          activeCategory = pill.dataset.cat;
          pillsEl.querySelectorAll('span').forEach(p => p.style.fontWeight = '400');
          pill.style.fontWeight = '600';
          renderRemarksFeed(activeCategory);
        });
      });
    }

    renderRemarksFeed('ALL');
  }

  const samplesEl = document.getElementById('inbound-samples');
  if (samplesEl) {
    const provided = kpi.samplesProvided || 0;
    const total = kpi.totalLeads || 1;
    const pct = ((provided / total) * 100).toFixed(2);
    samplesEl.innerHTML = `
      <div class="pbar-row">
        <div class="pbar-head"><span>Samples sent</span><span>${provided}</span></div>
        <div class="pbar-track"><div class="pbar-fill" style="width:${Math.max(pct,1.5)}%;background:var(--violet)"></div></div>
      </div>
      <div class="pbar-row">
        <div class="pbar-head"><span>% of total leads</span><span>${pct}%</span></div>
      </div>
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--line-soft);font-size:11px;color:var(--text-2)">
        Sample data is sparse — most rows have this field unfilled. Treat as directional only.
      </div>`;
  }
}

// ===== GT SALES TAB =====
var _gtRows = [];
var _gtLoaded = false;
var _gtFyFilter = "ALL";
var _gtStateFilter = "ALL";
var _gtMonthFrom = "ALL";
var _gtMonthTo = "ALL";
var _gtDateFrom = "";
var _gtDateTo = "";
var GT = { ref:0, date:1, month:2, poc:3, client:4, sales:5, state:6, fy:7 };

var GT_MONTH_LABELS = {
  "2025-04":"Apr 25","2025-05":"May 25","2025-06":"Jun 25","2025-07":"Jul 25",
  "2025-08":"Aug 25","2025-09":"Sep 25","2025-10":"Oct 25","2025-11":"Nov 25",
  "2025-12":"Dec 25","2026-01":"Jan 26","2026-02":"Feb 26","2026-03":"Mar 26",
  "2026-04":"Apr 26","2026-05":"May 26","2026-06":"Jun 26","2026-07":"Jul 26",
  "2026-08":"Aug 26","2026-09":"Sep 26","2026-10":"Oct 26","2026-11":"Nov 26","2026-12":"Dec 26"
};

function getFilteredGtRows() {
  return _gtRows.filter(function(r) {
    if (_gtFyFilter !== "ALL" && r[GT.fy] !== _gtFyFilter) return false;
    if (_gtStateFilter !== "ALL" && r[GT.state] !== _gtStateFilter) return false;
    if (_gtMonthFrom !== "ALL" && r[GT.month] && r[GT.month] < _gtMonthFrom) return false;
    if (_gtMonthTo !== "ALL" && r[GT.month] && r[GT.month] > _gtMonthTo) return false;
    if (_gtDateFrom && r[GT.date] && r[GT.date] < _gtDateFrom) return false;
    if (_gtDateTo && r[GT.date] && r[GT.date] > _gtDateTo) return false;
    return true;
  });
}

function aggregateGt(rows) {
  var totalSales = 0, totalOrders = 0;
  var clientSales = {}, clientOrders = {}, pocOrders = {}, pocSales = {};
  var monthlySales = {}, monthlyOrders = {};
  var stateData = {};

  rows.forEach(function(r) {
    var s = r[GT.sales] || 0;
    totalOrders++;
    totalSales += s;

    var c = r[GT.client];
    if (c) {
      clientSales[c] = (clientSales[c] || 0) + s;
      clientOrders[c] = (clientOrders[c] || 0) + 1;
    }

    var p = r[GT.poc];
    if (p) {
      pocOrders[p] = (pocOrders[p] || 0) + 1;
      pocSales[p] = (pocSales[p] || 0) + s;
    }

    var m = r[GT.month];
    if (m) {
      monthlySales[m] = (monthlySales[m] || 0) + s;
      monthlyOrders[m] = (monthlyOrders[m] || 0) + 1;
    }

    var st = r[GT.state];
    if (st) {
      if (!stateData[st]) stateData[st] = { sales: 0, orders: 0, clients: {} };
      stateData[st].sales += s;
      stateData[st].orders++;
      if (c) stateData[st].clients[c] = 1;
    }
  });

  var uniqueClients = Object.keys(clientSales).length;
  var repeatClients = Object.keys(clientOrders).filter(function(c) { return clientOrders[c] > 1; }).length;
  var ordersWithSales = rows.filter(function(r) { return r[GT.sales] > 0; }).length;
  var aov = ordersWithSales > 0 ? totalSales / ordersWithSales : 0;
  var repeatPct = uniqueClients > 0 ? Math.round(repeatClients / uniqueClients * 100) : 0;

  var topClients = Object.entries(clientSales).sort(function(a,b) { return b[1] - a[1]; }).slice(0, 8).map(function(e) {
    return { name: e[0], sales: e[1], orders: clientOrders[e[0]] || 0 };
  });

  var topRepeat = Object.entries(clientOrders).filter(function(e) { return e[1] > 1; })
    .sort(function(a,b) { return b[1] - a[1]; }).slice(0, 5).map(function(e) {
      return { name: e[0], orders: e[1], sales: clientSales[e[0]] || 0 };
    });

  var pocList = Object.entries(pocOrders).sort(function(a,b) { return b[1] - a[1]; });

  var monthly = Object.keys(monthlySales).sort().map(function(m) {
    return { month: m, sales: monthlySales[m], orders: monthlyOrders[m] };
  });

  var states = Object.entries(stateData).sort(function(a,b) { return b[1].sales - a[1].sales; }).map(function(e) {
    return { name: e[0], sales: e[1].sales, orders: e[1].orders, clients: Object.keys(e[1].clients).length };
  });

  return {
    totalSales: totalSales, totalOrders: totalOrders, uniqueClients: uniqueClients,
    ordersWithSales: ordersWithSales, aov: aov, repeatClients: repeatClients,
    repeatPct: repeatPct, oneTime: uniqueClients - repeatClients,
    topClients: topClients, topRepeat: topRepeat, pocList: pocList,
    monthly: monthly, states: states
  };
}

function fmtGt(v) {
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + "L";
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

function renderGtDashboard() {
  var rows = getFilteredGtRows();
  var d = aggregateGt(rows);

  // KPIs
  document.getElementById("gt-kpi-sales").innerText = fmtGt(d.totalSales);
  document.getElementById("gt-kpi-sales-sub").innerHTML = '<span style="font-size:12px;color:var(--text-1)">' + d.ordersWithSales + ' orders with value</span>';
  document.getElementById("gt-kpi-orders").innerText = d.totalOrders.toLocaleString();
  document.getElementById("gt-kpi-orders-sub").innerHTML = '<span style="font-size:12px;color:var(--text-1)">' + d.ordersWithSales + ' with sales data</span>';
  document.getElementById("gt-kpi-clients").innerText = d.uniqueClients;
  document.getElementById("gt-kpi-clients-sub").innerHTML = '<span style="font-size:12px;color:var(--text-1)">' + d.repeatClients + ' repeat</span>';
  document.getElementById("gt-kpi-aov").innerText = fmtGt(d.aov);
  document.getElementById("gt-kpi-aov-sub").innerHTML = '<span style="font-size:12px;color:var(--text-1)">on ' + d.ordersWithSales + ' valued orders</span>';
  document.getElementById("gt-kpi-repeat").innerText = d.repeatPct + "%";
  document.getElementById("gt-repeat-bar").style.width = d.repeatPct + "%";

  // Monthly trend chart
  var mon = d.monthly;
  if (mon.length > 0) {
    var maxS = Math.max.apply(null, mon.map(function(m) { return m.sales; }));
    var svgW = 720, svgH = 180, pad = 30, chartH = svgH - 40;
    var step = mon.length > 1 ? (svgW - pad * 2) / (mon.length - 1) : 0;

    var points = mon.map(function(m, i) {
      var x = pad + i * step;
      var y = 10 + chartH - (m.sales / (maxS || 1)) * chartH;
      return { x: x, y: y, m: m };
    });

    var gridLines = "";
    for (var g = 0; g < 4; g++) {
      var gy = 10 + g * (chartH / 3);
      gridLines += '<line x1="0" y1="' + gy + '" x2="' + svgW + '" y2="' + gy + '" stroke="#1F2733" stroke-width="1"/>';
    }

    var linePath = points.map(function(p, i) { return (i === 0 ? "M" : "L") + p.x + "," + p.y; }).join(" ");
    var areaPath = linePath + " L" + points[points.length - 1].x + "," + (svgH - 20) + " L" + points[0].x + "," + (svgH - 20) + " Z";

    // Color by FY
    var fy26Start = -1;
    for (var f = 0; f < mon.length; f++) {
      if (mon[f].month >= "2026-04") { fy26Start = f; break; }
    }

    var lineColor = "#A3E635";
    var svg = '<defs><linearGradient id="gtArea" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0" stop-color="' + lineColor + '" stop-opacity=".5"/>' +
      '<stop offset="1" stop-color="' + lineColor + '" stop-opacity=".02"/></linearGradient></defs>';
    svg += gridLines;
    svg += '<path d="' + areaPath + '" fill="url(#gtArea)"/>';
    svg += '<path d="' + linePath + '" fill="none" stroke="' + lineColor + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    // Data points
    points.forEach(function(p) {
      var col = p.m.month >= "2026-04" ? "#22D3EE" : "#A3E635";
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="4" fill="' + col + '" stroke="#0B0F14" stroke-width="2"/>';
    });

    // X labels — show "Jun 25" format
    svg += '<g fill="#5C6573" font-size="9" text-anchor="middle">';
    points.forEach(function(p) {
      var lbl = GT_MONTH_LABELS[p.m.month] || p.m.month;
      var parts = lbl.split(" "); // ["Jun", "25"]
      // Show every label if <=8 months, else every other
      var show = mon.length <= 8 || points.indexOf(p) % 2 === 0;
      if (show) {
        svg += '<text x="' + p.x + '" y="' + (svgH - 10) + '">' + parts[0] + '</text>';
        if (parts[1]) svg += '<text x="' + p.x + '" y="' + (svgH - 1) + '" font-size="8">\'' + parts[1] + '</text>';
      }
    });
    svg += '</g>';

    // Invisible hover zones for tooltip
    svg += '<g class="gt-trend-dots">';
    points.forEach(function(p, i) {
      var prev = mon[i-1] ? mon[i-1].sales : null;
      var pct = prev && prev > 0 ? (((p.m.sales - prev) / prev) * 100).toFixed(1) : null;
      var pctStr = pct !== null ? (pct >= 0 ? '+' + pct + '%' : pct + '%') : 'first month';
      var pctCol = pct === null ? '#9AA4B2' : pct >= 0 ? '#34D399' : '#F87171';
      var lbl = GT_MONTH_LABELS[p.m.month] || p.m.month;
      var fmtVal = fmtGt(p.m.sales);
      svg += '<circle cx="' + p.x + '" cy="' + p.y + '" r="14" fill="transparent"' +
        ' class="gt-hover-dot"' +
        ' data-month="' + lbl + '"' +
        ' data-val="' + fmtVal + '"' +
        ' data-pct="' + pctStr + '"' +
        ' data-pct-col="' + pctCol + '"/>';
    });
    svg += '</g>';

    document.getElementById("gt-trend-svg").innerHTML = svg;

    // Tooltip logic
    var gtTip = document.getElementById('gt-trend-tip');
    if (!gtTip) {
      gtTip = document.createElement('div');
      gtTip.id = 'gt-trend-tip';
      gtTip.style.cssText = 'position:fixed;display:none;background:#11161F;border:1px solid #1F2733;border-radius:10px;padding:10px 14px;font-size:12px;color:#F5F7FA;pointer-events:none;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.6);font-family:system-ui,sans-serif;min-width:130px';
      document.body.appendChild(gtTip);
    }

    var svgEl = document.getElementById('gt-trend-svg');
    svgEl.addEventListener('mousemove', function(e) {
      var dot = e.target.closest('.gt-hover-dot');
      if (!dot) { gtTip.style.display = 'none'; return; }
      gtTip.innerHTML = '<div style="font-size:11px;color:#9AA4B2;margin-bottom:4px">' + dot.dataset.month + '</div>' +
        '<div style="font-size:16px;font-weight:600;margin-bottom:6px">' + dot.dataset.val + '</div>' +
        '<div style="font-size:12px;color:' + dot.dataset.pctCol + ';font-weight:500">' + dot.dataset.pct + ' vs prior month</div>';
      gtTip.style.display = 'block';
      gtTip.style.left = (e.clientX + 14) + 'px';
      gtTip.style.top = (e.clientY - 40) + 'px';
    });
    svgEl.addEventListener('mouseleave', function() { gtTip.style.display = 'none'; });
    document.getElementById("gt-trend-lead").innerHTML = fmtGt(d.totalSales) + ' <span style="font-size:13px;color:var(--text-1);font-weight:400">across ' + mon.length + ' months</span>';
    document.getElementById("gt-trend-legend").innerHTML = '<span><i style="background:#A3E635"></i>FY 25-26</span><span><i style="background:#22D3EE"></i>FY 26-27</span>';
  }

  // POC bars
  var pocColors = ["#22D3EE","#A78BFA","#F472B6","#A3E635","#FBBF24","#34D399","#F87171"];
  var maxPoc = d.pocList.length > 0 ? d.pocList[0][1] : 1;
  document.getElementById("gt-poc-lead").innerHTML = d.pocList.length + ' reps';
  document.getElementById("gt-poc-bars").innerHTML = d.pocList.slice(0, 7).map(function(p, i) {
    var w = Math.round(p[1] / maxPoc * 100);
    var col1 = pocColors[i % pocColors.length];
    return '<div class="zoneitem"><span class="lbl">' + p[0] + '</span>' +
      '<div class="zonebar"><div style="width:' + w + '%;background:' + col1 + '"></div></div>' +
      '<span class="val num">' + p[1] + ' <span class="pct">' + fmtGt(d.pocList.length > 0 ? (function() { var pocS = {}; rows.forEach(function(r) { if (r[GT.poc] === p[0]) pocS[p[0]] = (pocS[p[0]] || 0) + r[GT.sales]; }); return pocS[p[0]] || 0; })() : 0) + '</span></span></div>';
  }).join("");

  // Top clients
  var maxClientSales = d.topClients.length > 0 ? d.topClients[0].sales : 1;
  document.getElementById("gt-top-clients").innerHTML = d.topClients.map(function(c, i) {
    var w = Math.round(c.sales / maxClientSales * 100);
    return '<div class="skurow"><span class="rank">' + String(i + 1).padStart(2, "0") + '</span>' +
      '<span class="skuname">' + c.name + '</span>' +
      '<div class="skubar"><div style="width:' + w + '%;background:linear-gradient(90deg,#22D3EE,#A78BFA)"></div></div>' +
      '<span class="skuval">' + fmtGt(c.sales) + '</span></div>';
  }).join("");

  // Client split
  document.getElementById("gt-client-split").innerHTML =
    '<div style="background:var(--panel-2);border-radius:10px;padding:14px">' +
    '<div style="font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Repeat (2+)</div>' +
    '<div style="font-size:24px;font-weight:600;color:#34D399">' + d.repeatClients + '</div>' +
    '<div style="font-size:12px;color:var(--text-1);margin-top:2px">' + d.repeatPct + '% of base</div></div>' +
    '<div style="background:var(--panel-2);border-radius:10px;padding:14px">' +
    '<div style="font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">One-time</div>' +
    '<div style="font-size:24px;font-weight:600;color:var(--text-1)">' + d.oneTime + '</div>' +
    '<div style="font-size:12px;color:var(--text-1);margin-top:2px">' + (100 - d.repeatPct) + '% of base</div></div>';

  // Top repeat clients
  document.getElementById("gt-repeat-list").innerHTML = d.topRepeat.map(function(c) {
    return '<div class="storerow"><div><div class="storename">' + c.name + '</div>' +
      '<div class="storesub">' + c.orders + ' orders</div></div>' +
      '<span class="storeval num">' + fmtGt(c.sales) + '</span></div>';
  }).join("");

  // State table
  document.getElementById("gt-states-table").innerHTML = d.states.filter(function(s) { return s.name !== "Unknown"; }).slice(0, 12).map(function(s) {
    var vel = s.orders > 0 ? s.sales / s.orders : 0;
    var sc = vel > 20000 ? "s-good" : vel > 10000 ? "s-warn" : "s-bad";
    return '<tr><td><span class="statusdot ' + sc + '"></span>' + s.name + '</td>' +
      '<td class="num">' + s.orders + '</td><td class="num">' + fmtGt(s.sales) + '</td>' +
      '<td class="num">' + s.clients + '</td></tr>';
  }).join("");

  // Monthly order volume bars
  var maxVol = Math.max.apply(null, d.monthly.map(function(m) { return m.orders; }).concat([1]));
  document.getElementById("gt-monthly-chart").innerHTML = d.monthly.map(function(m) {
    var h = Math.max(m.orders / maxVol * 130, 4);
    var isPeak = m.orders === maxVol;
    var col = m.month >= "2026-04" ? "background:#22D3EE" : "background:#A3E635";
    return '<div class="b2b-bar-col"><span class="b2b-bar-val">' + m.orders + '</span>' +
      '<div class="b2b-bar ' + (isPeak ? "peak" : "") + '" style="height:' + h + 'px;' + col + '"></div></div>';
  }).join("");
  document.getElementById("gt-monthly-labels").innerHTML = d.monthly.map(function(m) {
    var lbl = GT_MONTH_LABELS[m.month] || m.month;
    return '<span class="b2b-bar-label">' + lbl.split(" ")[0] + '</span>';
  }).join("");

  // Filter summary
  var summaryEl = document.getElementById("gt-filter-summary");
  if (summaryEl) {
    var total = _gtRows.length;
    summaryEl.textContent = rows.length < total ? "Showing " + rows.length + " of " + total + " orders" : "Showing all " + rows.length + " orders";
  }
}

function initGtFilters() {
  // State dropdown
  var stateSet = {};
  _gtRows.forEach(function(r) { if (r[GT.state] && r[GT.state] !== "Unknown") stateSet[r[GT.state]] = 1; });
  var stateSelect = document.getElementById("gt-state-filter");
  Object.keys(stateSet).sort().forEach(function(s) {
    stateSelect.innerHTML += '<option value="' + s + '">' + s + '</option>';
  });

  // Month dropdowns
  var monthSet = {};
  _gtRows.forEach(function(r) { if (r[GT.month]) monthSet[r[GT.month]] = 1; });
  var months = Object.keys(monthSet).sort();
  var fromSel = document.getElementById("gt-month-from");
  var toSel = document.getElementById("gt-month-to");
  fromSel.innerHTML = '<option value="ALL">From</option>';
  toSel.innerHTML = '<option value="ALL">To</option>';
  months.forEach(function(m) {
    var label = GT_MONTH_LABELS[m] || m;
    fromSel.innerHTML += '<option value="' + m + '">' + label + '</option>';
    toSel.innerHTML += '<option value="' + m + '">' + label + '</option>';
  });

  // Event listeners
  stateSelect.addEventListener("change", function(e) { _gtStateFilter = e.target.value; renderGtDashboard(); });
  fromSel.addEventListener("change", function(e) { _gtMonthFrom = e.target.value; renderGtDashboard(); });
  toSel.addEventListener("change", function(e) { _gtMonthTo = e.target.value; renderGtDashboard(); });
  document.getElementById("gt-date-from").addEventListener("change", function(e) { _gtDateFrom = e.target.value; renderGtDashboard(); });
  document.getElementById("gt-date-to").addEventListener("change", function(e) { _gtDateTo = e.target.value; renderGtDashboard(); });
  document.getElementById("gt-reset-filters").addEventListener("click", function() {
    _gtFyFilter = "ALL"; _gtStateFilter = "ALL"; _gtMonthFrom = "ALL"; _gtMonthTo = "ALL"; _gtDateFrom = ""; _gtDateTo = "";
    document.getElementById("gt-state-filter").value = "ALL";
    document.getElementById("gt-month-from").value = "ALL";
    document.getElementById("gt-month-to").value = "ALL";
    document.getElementById("gt-date-from").value = "";
    document.getElementById("gt-date-to").value = "";
    document.querySelectorAll("#gt-fy-filters .fchip").forEach(function(b) { b.classList.remove("on"); });
    document.querySelector('#gt-fy-filters .fchip[data-fy="ALL"]').classList.add("on");
    renderGtDashboard();
  });

  // FY filter chips
  document.querySelectorAll("#gt-fy-filters .fchip").forEach(function(b) {
    b.addEventListener("click", function() {
      document.querySelectorAll("#gt-fy-filters .fchip").forEach(function(x) { x.classList.remove("on"); });
      b.classList.add("on");
      _gtFyFilter = b.getAttribute("data-fy");
      renderGtDashboard();
    });
  });
}

// ===== Tooltip Engine =====
const tooltip = document.getElementById('chart-tooltip');
document.querySelectorAll('.data-points circle').forEach(circle => {
  circle.addEventListener('mouseenter', (e) => {
    const val = e.target.getAttribute('data-val');
    const month = e.target.getAttribute('data-month');
    
    tooltip.innerHTML = `<span style="color:#9AA4B2; font-size:11px;">${month}</span><br/><strong style="font-size:16px; font-variant-numeric:tabular-nums;">${val}</strong>`;
    tooltip.style.opacity = 1;
    
    e.target.setAttribute('r', '8');
    e.target.style.fill = '#FFF';
  });
  
  circle.addEventListener('mousemove', (e) => {
    tooltip.style.left = (e.pageX + 15) + 'px';
    tooltip.style.top = (e.pageY - 35) + 'px';
  });
  
  circle.addEventListener('mouseleave', (e) => {
    tooltip.style.opacity = 0;
    e.target.setAttribute('r', '6');
    e.target.style.fill = '#22D3EE';
  });
});
  
