# Inventory Backend — DD-3: FIFO / FEFO Costing

> **Append in-place to** `apps/erp/docs/backend-specs/modules/inventory.backend.md`
> **Add the CHANGELOG line** (bottom of this file) to `apps/erp/docs/backend-specs/_CHANGELOG.md`.
> Builds on DD-1 (carrier) + DD-2 (batch engine, `batch_id` on movement, cost on movement). This is the valuation/costing layer promised by DD-2's Pin A. **Posting to the ledger is Accounting's job (module #3) — DD-3 stops at the seam.**

---

## 1. Data model

### 1.0 No new "cost layer" table (derive-first)
The **cost layer is not a new entity**. A layer **is a receipt-type `stock_movement`** (`opening | in | receipt | transfer_in | adjustment(+)`) with its `cost` (unit) already stored (Pin A). `qty_remaining` per layer is **derived** by replaying the movement stream in effective-method order — it is **not** a stored column. This keeps the golden rule: single source of truth = movements + cost.

```
layer identity (logical) = carrier_id × warehouse_id × receipt_movement_id [× batch_id]
   carrier_id = coalesce(variant_id, item_id)     -- SAME resolver as DD-1/DD-2, never branch
```
An optional materialized `cost_layer` cache MAY be added **later, for performance only**; if added it MUST reconcile exactly to the derivation and never change semantics.

### 1.1 `item` — add columns
```
+ costing_method   enum('fifo','average')  NULL   -- per-item override; NULL = inherit tenant default
                                                  -- IGNORED when tracks_batch=true (forced 'specific')
```
`avg_cost` (already present) becomes a **maintained cache** for average-method items: recalculated on each receipt via the moving-average formula (§4.3). For FIFO/specific items it is set to the current derived weighted unit cost (Σ layer value / Σ qty remaining) for display consistency.

### 1.2 Settings
```
inventory_settings.default_costing_method  enum('fifo','average')  NOT NULL DEFAULT 'fifo'
```
Effective method (read-time):
```
effectiveCostingMethod(item, settings):
  if item.tracks_batch                              -> 'specific'
  else coalesce(item.costing_method, settings.default_costing_method)   -> 'fifo' | 'average'
```
Same coalesce inheritance as DD-2's `effectiveNearExpiryDays`. **`specific` is never a stored value** — batch items simply cost by their batch's receipt movement.

### 1.3 `stock_movement` — NO shape change (R3)
`stock_movement.cost` is reused with a consistent meaning: **unit cost of the value flowing through this movement**.
- **Receipt-type** (`opening/in/receipt/transfer_in/adjustment+`): acquisition unit cost (already set today).
- **Issue-type** (`out/issue/transfer_out/adjustment−`): the **unit COGS** computed by DD-3 at issue time (previously unset/zero for issues).
- `pending_cost_reconciliation` for provisional-cost issues is a **movement flag** (`_flag` in mock; a boolean column server-side) — not a new table.

---

## 2. Costing engine (the core deliverable of DD-3)

Lives beside DD-2's batch engine (`features/inventory/items/costing.ts`, sibling of `batches.ts`). Consumes DD-2's `selectBatchesForIssue` output for batch items; consumes the raw movement stream for non-batch items.

### 2.1 Derive layers
```
deriveCostLayers(carrier_id, warehouse_id, ledger, method):
  receipts = movements(carrier×warehouse) with qty>0, ordered:
     method='fifo'|'specific' -> ORDER BY date ASC, id ASC        (oldest first)
     method='average'         -> single running layer (see 2.3)
  replay all issues (qty<0) against receipts in that order,
     decrementing each layer's remaining
  return open layers [{ receipt_movement_id, batch_id?, unit_cost, qty_remaining }]
```
Deterministic: same order every replay ⇒ derivation is stable without a stored `qty_remaining`.

### 2.2 Consume layers → COGS (FIFO / specific)
```
consumeCostLayers(carrier_id, warehouse_id, qty, { method, batchFilter? }):
  layers = deriveCostLayers(...)
  if batchFilter (batch item): restrict layers to the batches DD-2 already allocated,
     in DD-2's allocation order  -> cost each allocation at its own batch receipt cost
  else (FIFO): walk layers oldest→newest, take from each until qty satisfied
  return { unit_cogs, total_cogs, consumed: [{ layer_id/batch_id, qty, unit_cost }] }
  if layers run out (negative stock): value remainder at running cost,
     mark pending_cost_reconciliation
```
**Batch = specific by construction:** DD-2 already decided *which physical batch* leaves; DD-3 costs *that* batch's receipt. Physical pick (FEFO/FIFO) and cost consumption are one and the same order — **zero divergence**, which is exactly why `requires_expiry` (physical FEFO) and costing never conflict.

### 2.3 Weighted Average (non-batch, method='average')
Reuse the **existing moving-average formula** already live in the MFG module (`stores/mfgItemStock.ts`) — do NOT invent a second formula:
```
on receipt:  new_avg = round2( (qty_before·avg_before + qty_in·unit_cost_in) / (qty_before + qty_in) )
on issue:    unit_cogs = current avg ; avg unchanged by issues
```
`item.avg_cost` is the persisted cache of this running average. (MFG keeps its own stock costing untouched in this DD — see §6 boundary; convergence is a later, separate item.)

### 2.4 COGS timing = **perpetual** (real-time per issue)
COGS is computed at the moment of issue (invoice/POS/transfer-out/adjustment-out) and written to the issue movement's `cost`. No periodic batch job. Rationale: ETA (real-time invoicing) and POS offline-first both need margin visible at sale time, and it reuses DD-2's issue seam exactly.

### 2.5 Returns & adjustments (clean because of Pin A)
```
sales_return   -> receipt movement, unit_cost = COGS on the original sale movement
                  (cost travels on the movement; no re-lookup of consumed layers)
purchase_return-> issue movement consuming that supplier's layer at its cost
stocktake short-> issue at effective-method cost (surfaces as loss at Accounting seam)
stocktake over -> receipt; unit_cost defaults to avg_cost/last_purchase_price,
                  supervisor override gated by inventory.costing.overage_cost
```

### 2.6 Valuation
```
itemValuation(carrier, warehouse, asOf?):  Σ (layer.qty_remaining × layer.unit_cost)   // derived
tenantValuation: Σ over items/warehouses
```
`asOf` replays movements only up to that date — valuation is a pure function of the movement history.

---

## 3. Accounting seam (DD-3 computes, Accounting posts)

DD-3 emits a **COGS/valuation event** — it does **not** write journal entries.
```
CostEvent {
  movement_id, carrier_id, warehouse_id, qty,
  unit_cogs, total_cogs, method,
  consumed: [{ layer_id|batch_id, qty, unit_cost }],
  pending_cost_reconciliation: bool,
  kind: 'issue' | 'sales_return' | 'purchase_return' | 'adjustment' | 'reconciliation'
}
```
Accounting (module #3) subscribes and posts `Dr COGS / Cr Inventory` (and the reverse for returns, loss account for shortages). This mirrors DD-2's Pin B placement discipline: Inventory owns the computation and the operational UI; the financial posting lives in the owning financial module. **No `journal_entry` creation anywhere in the Inventory module.**

---

## 4. Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/inventory/carriers/:carrierId/cost-layers?warehouse_id=&as_of=` | derived open layers (oldest→newest) + remaining + unit cost |
| GET | `/inventory/carriers/:carrierId/cost` | current unit cost + effective method |
| GET | `/inventory/valuation?warehouse_id=&category_id=&method=&as_of=` | valuation report rows + totals |
| POST | `/inventory/issue` | (DD-2) now also returns computed `unit_cogs` + `CostEvent` |
| POST | `/inventory/returns/sale` | receipt at original-sale COGS |
| POST | `/inventory/returns/purchase` | issue consuming supplier layer |
| POST | `/inventory/cost-reconcile` | reconcile a `pending_cost_reconciliation` issue once a covering receipt exists |
| PATCH | `/inventory/items/:id/costing-method` | set/clear per-item method (gated) |
| PATCH | `/inventory/settings/costing` | set tenant default method (prospective) |

---

## 5. Enforcement rules
1. Effective method resolved server-side; `tracks_batch=true` ⇒ method forced `specific` (client `costing_method` ignored, not an error).
2. Every issue-type movement gets a computed `cost` (unit COGS) before persist; issues no longer persist with cost unset.
3. FIFO/specific consumption order is enforced server-side and matches DD-2's batch allocation order for batch items (single ordering, no second sort).
4. Negative-stock issue is **allowed** (offline-first) with provisional cost + `pending_cost_reconciliation`; a later covering receipt triggers reconciliation (COGS delta event). *(Adopted default — a block-until-layer tenant setting is a future toggle, not built.)*
5. Tenant-default change is **prospective**: never rewrites historical movement costs.
6. `avg_cost` is a cache — recalculated only from movements; never accepted as a direct write from the client.
7. Cost visibility (`inventory.cost.view`) gates layers/valuation/margin responses (redacted, not just hidden in UI).
8. **LIFO is rejected** and not a selectable value (IAS 2 / Egyptian accounting).

---

## 6. Boundaries & compatibility (feature-flag-aware)
- **MFG untouched:** MFG's `mfgItemStock` moving-average stays as-is this DD; DD-3 reuses its *formula* but does not refactor MFG. Convergence (MFG consuming Inventory costing) is a **separate future item**, logged, not done here.
- **Batch flag off:** every item costs by FIFO or Average; the `specific` branch is simply never taken. No batch dependency for non-batch tenants.
- **Purchasing GRN (#4):** already a producer of receipt movements (DD-2) → each GRN receipt is automatically a cost layer, no schema change needed later.
- **Sales/POS (#2):** consume `unit_cogs` for margin; the hard block on selling expired stays in Sales/POS (DD-2 Pin B) — DD-3 adds only cost, not new blocks.

---

### CHANGELOG entry (copy to `_CHANGELOG.md`)
```
## [Inventory] DD-3 FIFO/FEFO Costing — 2026-08 — Ahmad
- Costing = valuation layer on DD-2. Cost layer = receipt-type stock_movement (Pin A); qty_remaining DERIVED, no new table/column.
- item += costing_method (fifo|average, nullable; inherit tenant default; forced 'specific' when tracks_batch). inventory_settings += default_costing_method (default fifo).
- avg_cost becomes a maintained cache (moving-average formula reused from MFG mfgItemStock; MFG itself untouched).
- stock_movement.cost reused for issue-type = unit COGS (previously unset for issues); no shape change (R3).
- Engine costing.ts: deriveCostLayers / consumeCostLayers (FIFO + specific-batch via DD-2 allocation order) / weighted-average. Perpetual COGS at issue time.
- Returns: sale-return receipt at original-sale COGS; purchase-return issue at supplier layer. Stocktake short=loss, over=avg/override.
- Negative/offline issue allowed at provisional cost + pending_cost_reconciliation; reconcile on covering receipt.
- Accounting seam: DD-3 emits CostEvent; Accounting (#3) posts Dr COGS/Cr Inventory. NO journal entries in Inventory.
- LIFO rejected (IAS 2 / Egyptian accounting). Cost visibility gated by inventory.cost.view (ad-hoc; formalize in Permissions #8).
```

*End DD-3 backend section.*
