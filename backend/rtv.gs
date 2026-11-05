/**
 * RTV data for the RTV tab: reads the "Reliance RTV Data" Google Sheet (Sheet1) and returns one object per credit note.
 * RTV value = the AMOUNT column.
 *
 * The script runs as whoever deployed the web app, so that account (Aditi's) must be able to open the sheet.
 * Not run inside Apps Script from here: test with testRtv_() first.
 */

var RTV_SHEET_ID = '1RsRbLYMj90O7vPdeN-ZXO5AcVbfQMn7NMnkqBbdCP50';

function rtvData_() {
  var sheet = SpreadsheetApp.openById(RTV_SHEET_ID).getSheetByName('Sheet1');
  var values = sheet.getDataRange().getValues();
  var head = values[0].map(function (h) { return String(h).trim().toUpperCase(); });
  var col = function (name) { return head.indexOf(name); };

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    if (v[col('REFERENCE')] === '' || v[col('REFERENCE')] == null) continue; // skip blank rows
    rows.push({
      type: String(v[col('DT')]),
      reference: String(v[col('REFERENCE')]).replace(/\.0$/, ''),
      docDate: toIso_(v[col('DOCDATE')]),
      amount: Number(v[col('AMOUNT')]) || 0,
      currency: String(v[col('CURRENCY')] || 'INR'),
      dueDate: toIso_(v[col('DUEDATE')]),
      status: String(v[col('DD')] || ''),               // ALREADY_CLEARED | OVER_DUE
      clearedOn: toIso_(v[col('CLEARINGDOCUMENTDATE')]),
      utr: String(v[col('UTRNO')] || ''),
    });
  }
  return { source: 'Reliance RTV Data', rows: rows };
}

// Accepts a Date, "14.11.2025" (SAP style), "2025-11-14 00:00:00" or "2025-11-14T..." and returns "2025-11-14" (or "").
function toIso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kolkata', 'yyyy-MM-dd');
  var s = String(v || '').trim();
  var dmy = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (dmy) return dmy[3] + '-' + dmy[2] + '-' + dmy[1];
  var iso = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return iso ? iso[1] : '';
}

function testRtv_() {
  var d = rtvData_();
  var total = d.rows.reduce(function (s, r) { return s + r.amount; }, 0);
  Logger.log(d.rows.length + ' credit notes, total ' + total);
}
