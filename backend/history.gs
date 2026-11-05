/**
 * Historical record for the Founders Office (FO).
 * The dashboard sheets are overwritten as orders change, so this keeps one dated row per channel per day
 * in a separate "FO History" spreadsheet. Run installHistoryTrigger_() once to snapshot every night.
 *
 * Interpretation of "Database for FO for historical relevance" from the 4/11 meeting: confirm it matches
 * what FO needs (extra columns, per-client history, a real database) before building on it.
 * Not run inside Apps Script from here.
 */

function historySheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FO_HISTORY_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheetByName('History');
  var ss = SpreadsheetApp.create('FO History');
  var sh = ss.getSheets()[0];
  sh.setName('History');
  sh.appendRow(['Snapshot date', 'Channel', 'Orders', 'Sales (INR)', 'Active clients', 'FY']);
  sh.setFrozenRows(1);
  props.setProperty('FO_HISTORY_SHEET_ID', ss.getId());
  return sh;
}

/** One row per channel for today. Re-running on the same day replaces that day's rows. */
function snapshotDaily() {
  var today = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var sh = historySheet_();
  var existing = sh.getDataRange().getValues();
  for (var i = existing.length - 1; i >= 1; i--) {
    if (Utilities.formatDate(new Date(existing[i][0]), 'Asia/Kolkata', 'yyyy-MM-dd') === today) sh.deleteRow(i + 1);
  }
  var stats = {}; // channel -> { orders, sales, clients }
  buildJoinedOrders_().forEach(function (r) {
    var ch = r[9];
    var s = (stats[ch] = stats[ch] || { orders: 0, sales: 0, clients: {} });
    s.orders++;
    s.sales += r[5];
    s.clients[r[4]] = 1;
  });
  var fy = fyOf_(today);
  Object.keys(stats).forEach(function (ch) {
    sh.appendRow([today, ch, stats[ch].orders, Math.round(stats[ch].sales), Object.keys(stats[ch].clients).length, fy]);
  });
}

function installHistoryTrigger_() {
  ScriptApp.newTrigger('snapshotDaily').timeBased().everyDays(1).atHour(23).inTimezone('Asia/Kolkata').create();
}

/** Action `historyData`: all snapshots, newest first. */
function historyData_() {
  var v = historySheet_().getDataRange().getValues().slice(1);
  return {
    rows: v.map(function (r) {
      return { date: Utilities.formatDate(new Date(r[0]), 'Asia/Kolkata', 'yyyy-MM-dd'), channel: r[1], orders: r[2], sales: r[3], clients: r[4], fy: r[5] };
    }).reverse(),
  };
}
