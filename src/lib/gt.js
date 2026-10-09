export const GT = { ref: 0, date: 1, month: 2, poc: 3, client: 4, sales: 5, state: 6, fy: 7 };

export function filterGtRows(rows, f) {
  return rows.filter((r) => {
    if (f.fy !== "ALL" && r[GT.fy] !== f.fy) return false;
    if (f.state !== "ALL" && r[GT.state] !== f.state) return false;
    if (f.monthFrom !== "ALL" && r[GT.month] && r[GT.month] < f.monthFrom) return false;
    if (f.monthTo !== "ALL" && r[GT.month] && r[GT.month] > f.monthTo) return false;
    if (f.dateFrom && r[GT.date] && r[GT.date] < f.dateFrom) return false;
    if (f.dateTo && r[GT.date] && r[GT.date] > f.dateTo) return false;
    return true;
  });
}

export function aggregateGt(rows) {
  let totalSales = 0;
  const clientSales = {}, clientOrders = {}, pocOrders = {}, pocSales = {};
  const monthlySales = {}, monthlyOrders = {}, stateData = {};

  rows.forEach((r) => {
    const s = r[GT.sales] || 0;
    totalSales += s;
    const c = r[GT.client];
    if (c) {
      clientSales[c] = (clientSales[c] || 0) + s;
      clientOrders[c] = (clientOrders[c] || 0) + 1;
    }
    const p = r[GT.poc];
    if (p) {
      pocOrders[p] = (pocOrders[p] || 0) + 1;
      pocSales[p] = (pocSales[p] || 0) + s;
    }
    const m = r[GT.month];
    if (m) {
      monthlySales[m] = (monthlySales[m] || 0) + s;
      monthlyOrders[m] = (monthlyOrders[m] || 0) + 1;
    }
    const st = r[GT.state];
    if (st) {
      const sd = (stateData[st] ||= { sales: 0, orders: 0, clients: {} });
      sd.sales += s;
      sd.orders++;
      if (c) sd.clients[c] = 1;
    }
  });

  const uniqueClients = Object.keys(clientSales).length;
  const repeatClients = Object.keys(clientOrders).filter((c) => clientOrders[c] > 1).length;
  const ordersWithSales = rows.filter((r) => r[GT.sales] > 0).length;
  const byValue = Object.entries(clientSales).sort((a, b) => b[1] - a[1]);
  const allClients = byValue.map(([name, sales]) => {
    const orders = clientOrders[name] || 0;
    return { name, sales, orders, aov: orders > 0 ? sales / orders : 0 };
  });

  return {
    totalSales,
    totalOrders: rows.length,
    uniqueClients,
    ordersWithSales,
    aov: ordersWithSales > 0 ? totalSales / ordersWithSales : 0,
    repeatClients,
    repeatPct: uniqueClients > 0 ? Math.round((repeatClients / uniqueClients) * 100) : 0,
    oneTime: uniqueClients - repeatClients,
    topClients: allClients.slice(0, 8),
    allClients,
    topRepeat: Object.entries(clientOrders)
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, orders]) => ({ name, orders, sales: clientSales[name] || 0 })),
    pocList: Object.entries(pocOrders)
      .sort((a, b) => b[1] - a[1])
      .map(([name, orders]) => ({ name, orders, sales: pocSales[name] || 0 })),
    monthly: Object.keys(monthlySales).sort().map((m) => ({ month: m, sales: monthlySales[m], orders: monthlyOrders[m] })),
    states: Object.entries(stateData)
      .sort((a, b) => b[1].sales - a[1].sales)
      .map(([name, v]) => ({ name, sales: v.sales, orders: v.orders, clients: Object.keys(v.clients).length })),
  };
}
