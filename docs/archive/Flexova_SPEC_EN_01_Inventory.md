# Flexova — Inventory & Items Spec (EN, build-ready)

> Layer 2, Core module 1. Backbone consumed by Sales, Purchasing, POS.
> Depends on: Design System spec. v1.

## 1. Scope
**In:** items, categories, units of measure + conversions, **price lists**, barcodes, warehouses/branches, balances, item ledger, stocktake, transfers, adjustments, opening balances, reorder levels, bulk import/export.
**Out (sector extensions on top via capability flags):** variants/matrix, batch/expiry, sold-by-weight, serial tracking. Quantity-break tiers (built on price lists later).
**Golden rule:** balances change only via documented **movements**; no direct edit of a balance number.

## 2. Entities (✱ = required)

### 2.1 Item
| Field | Type | Req | Notes |
|---|---|---|---|
| name_ar | string | ✱ | primary display/search |
| name_en | string | | English UI + ETA when needed |
| code/SKU | string | ✱ | unique per tenant; auto-generate, editable |
| item_type | enum | ✱ | `stocked` / `service` / `non_stock`; service has no balance |
| category_id | ref | | category tree |
| base_uom_id | ref | ✱ | smallest unit; balances stored in it |
| barcodes | string[] | | multiple; per-unit barcode allowed; auto-gen if empty |
| image | file | | one image (v1) |
| tax_type (ETA) | ref | | ETA tax type (T1 VAT…) |
| eta_code (EGS/GS1) | string | (✱ if ETA on) | required to issue valid e-invoice; warn if missing |
| reorder_level | number | | per warehouse or total; feeds low-stock |
| max_level | number | | optional |
| status | enum | | `active` / `suspended` |
| notes | string | | |
| capability_flags | set | | `has_variants`,`track_batch_expiry`,`sold_by_weight`,`track_serial` (sector layer) |

### 2.2 UoM + Conversion
base unit (stores balances) + extra units with factor. Per unit: name, factor, optional barcode, optional unit sale price. Buy/sell in any unit; deduct in base.

### 2.3 Price List (v1)
- Default list (retail) always exists + extra lists (e.g. wholesale, VIP).
- Per list: name, currency (EGP v1), status, **sale price per item**.
- Each customer/customer-group → default price list. Invoice auto-pulls item price from customer's list; **manual per-line override**.
- Quantity-break tiers = later enhancement on same structure.

### 2.4 Category — tree (recommend max 3 levels). Fields: name, parent_id. No balances.

### 2.5 Warehouse
name ✱, code, linked branch, type (`sale`/`storage`/`damaged`), status, default-for-user/branch flag. Cannot delete if it holds stock.

### 2.6 Stock Balance — computed per (item × warehouse): available qty, (later: reserved/in-transit), avg cost, last-movement date.

### 2.7 Item Ledger (Movement) — per line: date, type (`in`/`out`/`transfer`/`adjustment`/`opening`/`stocktake`), source doc ref, warehouse, qty(±), running balance, cost, user.

### 2.8 Costing — **Weighted Average only (v1)**. FIFO later (tenant option). Movement stores cost per line → supports later switch. User sees avg cost + last purchase price.

### 2.9 Stocktake — header: warehouse, date, **mode**, status (`draft→counting→approved`). Lines: item, book qty (computed), actual qty (entered), diff. Approval auto-generates an adjustment.
- **Mode (chosen at creation):** `freeze` (lock warehouse vs sales/movements during count; recommend full counts) | `live` (sales continue; snapshot book-qty at start, reconcile; default for partial).

### 2.10 Transfer — from→to warehouse, lines, note. **v1 immediate** (in-transit two-step reserved for wholesale/logistics).
### 2.11 Adjustment — warehouse, lines(±), **required reason** (`damage`/`spoilage`/`count_diff`/`gift_sample`/`entry_fix`).

## 3. Flows
- **Add item (full):** tabbed form; basic required, rest progressive. If ETA on & eta_code empty → save allowed + banner "not ready for e-invoicing".
- **Quick-add (during invoice/POS):** mini modal (name✱, sale price, default unit, auto code) → flag "incomplete".
- **Bulk import:** download template → upload → validate/preview (good vs error rows, fix/skip) → confirm → result report.
- **Stocktake / Transfer / Adjustment:** per entities above; sensitive actions confirm.
- **Search/review:** instant search by code/name/barcode → item card → ledger tab.

## 4. Screens
- **Items list:** actions (+item, import, export, print-barcode); search + filters (category, warehouse, type, status, low-stock, price range); columns thumb·code·name·category·unit·balance·sale-price·status·actions; tabular-nums; compact available; bulk actions; row actions (edit/ledger/duplicate/suspend).
- **Item card:** tabs — Basic / Pricing+Tax (price lists, ETA code w/ hint) / Stock (track?, reorder, opening balances per warehouse) / Units / (conditional) Sector attributes. Footer: save / save+new / cancel.
- **Warehouses:** list + form; mark default; block delete if stock.
- **Item ledger:** timeline + filters (date range, warehouse, type); header shows per-warehouse balance, avg cost, stock value; rows link to source.
- **Stocktake:** header + lines (item·book·actual·diff, colored), barcode entry, summary bar, approve (confirm) → respects mode.
- **Transfers / Adjustments:** doc editors; adjustment reason required.
- **Low stock:** filtered view; select → "create purchase order" (hands to Purchasing).

## 5. States
All 5 per Design System §8. **Offline:** read from local cache; quick-add and POS movements stored locally, flagged `local/syncing/synced/conflict`. Conflicts: balances replay as movements (no overwrite); real conflicts (e.g. concurrent manual adjustment) surfaced to user — no silent resolution.

## 6. Integrations
ETA (item tax_type + eta_code; UoM → ETA unit codes; surface missing code, block enforced in Sales). Purchases/Sales (consume item, generate in/out, quick-add). Barcode (scan USB/camera; print labels single/bulk). Excel import/export. POS (reads items/balances, sells offline-first, syncs).

## 7. Performance
Virtualized lists; server-side search/filter; pagination/infinite scroll; lazy thumbnails; fetch balances on demand (not all warehouses at once).

## 8. Decisions (v1, locked)
- Price lists **in v1** (multiple, customer-assignable); quantity tiers later.
- Costing = weighted average only.
- Stocktake = both modes selectable.
- Item images = enabled (1/item, lazy thumbnails).
- Transfers = immediate (in-transit later).
- Serial = sector extension via `track_serial`.

## 9. Acceptance criteria
- No balance mutates except via a movement record.
- Service items have no stock balance and are excluded from stocktake.
- Invoice line price defaults from customer's price list, overridable per line.
- Item without eta_code (when ETA on) can be saved but is flagged not-issuable.
- Bulk import rejects invalid rows individually with a clear per-row reason.
- Stocktake approval creates an adjustment equal to the net difference.
