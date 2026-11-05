/**
 * Active Orders + OMS/BD join for the "Sales Dashboard FY | 26-27" sheet.
 *
 *  - Active Orders: A Order No | B Order Type | C PO Date | D Order Date | E POC | F Client Name | G Gross Sales
 *  - OMS/BD:        A Order No | ... | I Billing & Delivery Address | J GST | ... | P Location / City
 *  - Order No is the primary key. Active Orders has the client and the billing amount only, so state and city
 *    (needed for the geography views) come from the OMS/BD row with the same Order No.
 *  - Order Type decides GT vs MT (CHANNEL_BY_TYPE below).
 *
 * Returns rows in the layout src/lib/gt.js expects:
 *   [ref, date(YYYY-MM-DD), month(YYYY-MM), poc, client, sales, state, fy, orderType, channel, city]
 *
 * NOTE: written against the sheet as it looked on 5 Nov 2026 and not run inside Apps Script from here.
 * Test with testOrders_() before wiring it into doGet.
 */

var SALES_SHEET_ID = '1tn_pzuBoiPhjmCggTPL1edvEjTW4CHRAtx3yEQeRkrQ';

// Order Type (Active Orders col B) -> channel. Anything not listed becomes OTHER and is hidden from the GT/MT views.
// "Inst Order" and "Market Place Order" were not classified in the 4/11 meeting notes: change them here when decided.
var CHANNEL_BY_TYPE = {
  'GT Order': 'GT',
  'MT Order': 'MT',
};

var INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh', 'Puducherry',
];

function buildJoinedOrders_() {
  var ss = SpreadsheetApp.openById(SALES_SHEET_ID);
  var active = ss.getSheetByName('Active Orders').getDataRange().getDisplayValues();
  var oms = ss.getSheetByName('OMS/BD').getDataRange().getDisplayValues();

  // OMS/BD by Order No (first row wins if an order repeats for several products).
  var byOrder = {};
  for (var i = 1; i < oms.length; i++) {
    var key = String(oms[i][0]).trim();
    if (key && !byOrder[key]) byOrder[key] = { address: oms[i][8], city: String(oms[i][15] || '').trim() };
  }

  var rows = [];
  for (var r = 1; r < active.length; r++) {
    var a = active[r];
    var ref = String(a[0]).trim();
    if (!ref) continue;
    var date = parseDmy_(a[3]) || parseDmy_(a[2]);
    var join = byOrder[ref] || { address: '', city: '' };
    var type = String(a[1]).trim();
    rows.push([
      ref,
      date,
      date ? date.slice(0, 7) : '',
      String(a[4]).trim(),
      String(a[5]).trim(),
      toNumber_(a[6]),
      stateFromAddress_(join.address) || 'Unknown',
      fyOf_(date),
      type,
      CHANNEL_BY_TYPE[type] || 'OTHER',
      join.city,
    ]);
  }
  return rows;
}

/** Drop-in replacement for the rows the existing gtData action returns. */
function gtDataFromActiveOrders_() {
  return { rows: buildJoinedOrders_() };
}

// "1/4/26" or "01/04/2026" (day/month/year) -> "2026-04-01"
function parseDmy_(s) {
  var m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(String(s || '').trim());
  if (!m) return '';
  var y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
  return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
}

function toNumber_(s) {
  var n = parseFloat(String(s || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// Indian FY runs April to March: 2026-04-01 -> "FY26-27".
function fyOf_(iso) {
  if (!iso) return '';
  var y = +iso.slice(0, 4), m = +iso.slice(5, 7);
  var start = m >= 4 ? y : y - 1;
  return 'FY' + String(start).slice(2) + '-' + String(start + 1).slice(2);
}

function stateFromAddress_(address) {
  var text = String(address || '').toLowerCase();
  for (var i = 0; i < INDIAN_STATES.length; i++) {
    if (text.indexOf(INDIAN_STATES[i].toLowerCase()) !== -1) return INDIAN_STATES[i];
  }
  return '';
}

function testOrders_() {
  var rows = buildJoinedOrders_();
  Logger.log(rows.length + ' orders; first: ' + JSON.stringify(rows[0]));
  var unknown = rows.filter(function (r) { return r[6] === 'Unknown'; }).length;
  Logger.log(unknown + ' orders have no state (no OMS/BD match or no state in the address)');
}
