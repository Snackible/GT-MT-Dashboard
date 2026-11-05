# Backend (Google Apps Script) additions

The dashboard reads everything from one Apps Script web app (`src/lib/api.js`). That script is **not** in this
repo, so these files are paste-in additions for the 4/11 meeting changes. None of them were run in Apps Script
from the session that wrote them: run the `test*_()` functions in the editor first.

| File | What it adds | Used by |
|---|---|---|
| `orders.gs` | Joins **Active Orders** to **OMS/BD** on Order No, adds state/city from the address, maps Order Type to GT/MT | GT geography, channel filter, city level |
| `rtv.gs` | `rtvData` action: credit notes from the Reliance RTV Data sheet (AMOUNT = RTV value) | RTV tab |
| `history.gs` | Nightly snapshot into an "FO History" sheet, plus `historyData` | FO historical record |

## Wire-up

1. Add the three `.gs` files to the Apps Script project.
2. In the existing `doGet(e)` add the new actions:

```js
case 'rtvData':     return json_(rtvData_());
case 'historyData': return json_(historyData_());
```

3. Point the `gtData` action at the new sheet by returning `gtDataFromActiveOrders_()` (rows now have 11 columns:
   `ref, date, month, poc, client, sales, state, fy, orderType, channel, city`). The first eight are unchanged, so the
   old front end keeps working. Once `channel` is present the GT tab shows only `GT` orders.
4. Redeploy the web app (new version). The deploying account needs access to the Sales Dashboard sheet **and** the
   Reliance RTV Data sheet.
5. Optional: run `installHistoryTrigger_()` once to start the nightly snapshot.

## Open decisions

- `CHANNEL_BY_TYPE` in `orders.gs`: "Inst Order" and "Market Place Order" are not mapped yet, so they are tagged `OTHER`
  and hidden from the GT/MT tabs.
- MT still comes from the existing `mtData` action. For city-level MT, add a `city` field to each store object.
