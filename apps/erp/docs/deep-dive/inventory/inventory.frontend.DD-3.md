# Inventory — Deep-Dive DD-3: FIFO / FEFO Costing (Frontend Spec)

> **Append this section to** `apps/erp/docs/deep-dive/inventory/inventory.frontend.md` (cumulative, in-place).
> Builds on DD-1 (variants = balance carrier) and DD-2 (batch/expiry, `selectBatchesForIssue`, movement carries `batch_id`, cost on the movement). **No new design tokens.**

---

## 0. Scope & flag

- Costing is part of the **Hard Core** — it is **not** behind a module flag. Valuation/COGS must always exist. What *is* configurable is the **method per item** (see §1).
- Batch costing rides on **`inventory.batch_expiry`** (DD-2): when batches are on, batch-tracked items cost by the specific batch that was issued; when off, items cost by FIFO or Weighted Average.
- **Golden rule preserved:** cost is derived from `stock_movement.cost` + qty (Pin A). No stored/editable "current cost" field is the source of truth. `item.avg_cost` is a **cache/display** value maintained from movements, never hand-edited.
- **Boundary:** DD-3 **computes** COGS + valuation deltas and surfaces them in Inventory UI. It **does not post** to the ledger — posting `Dr COGS / Cr Inventory` is Accounting's job (module #3). DD-3 emits an event/contract at that seam.

---

## 1. Entities & config surfaced to the user

| Entity / field | User-facing meaning | Where |
|---|---|---|
| `settings.default_costing_method` | tenant-wide default: **FIFO** or **Weighted Average** | Inventory Settings |
| `item.costing_method` | per-item override; empty = inherit tenant default | Item Editor |
| effective method (computed) | `coalesce(item.costing_method, settings.default_costing_method)`; **forced `specific` when the item is batch-tracked** | shown as a read-only chip |
| `item.avg_cost` | current unit cost (maintained from movements) | Item cost card, lists |
| cost layers (derived) | the receipts still holding stock, oldest→newest, each with remaining qty + unit cost | Item cost card |
| COGS on a sale line | cost of goods sold for that issue | Sales/POS doc (margin) |

**Effective method resolution (read-time, never stored beyond the two fields above):**
```
if item.tracks_batch  -> 'specific'      (batch actual cost — method field ignored & shown disabled)
else                  -> coalesce(item.costing_method, settings.default_costing_method)  // 'fifo' | 'average'
```
Same coalesce/inheritance pattern as DD-2's `effectiveNearExpiryDays`. **LIFO is not offered** (disallowed under IAS 2 / Egyptian accounting).

---

## 2. Screens & fields

### 2.1 Inventory Settings → **Costing** (new field)
- Radio **`default_costing_method`**: `FIFO` (default) · `Weighted Average`. Label i18n `inventory.costing.default_method`.
- Helper text `inventory.costing.default_method_hint` ("الطريقة الافتراضية للأصناف اللي ملهاش تتبّع تشغيلات").
- Changing the tenant default affects only items with no per-item override and is **prospective** (does not retro-rewrite historical COGS). Confirm dialog `inventory.costing.change_default_confirm`.

### 2.2 Item Editor → **Costing** (extends DD-1 Item Editor, `/inventory/items/:id`)
- Select **`costing_method`**: `— (inherit) · FIFO · Weighted Average`. Label `inventory.costing.method`. Placeholder shows the inherited tenant default as a ghost value (same pattern as `near_expiry_days`).
- When `tracks_batch=on`: the select is **disabled** and shows a read-only chip `inventory.costing.specific_locked` ("تكلفة فعلية للتشغيلة") — because batch items cost by the exact batch issued.
- States: inherit(empty→ghost) · fifo · average · batch-locked(disabled).

### 2.3 Item Editor → **Cost card** (new panel, permission `inventory.cost.view`)
Read-only valuation view for the item:
- **Current unit cost** (`avg_cost`) + effective method chip.
- **Cost-layer stack** (FIFO / batch): a table of open layers — Receipt ref · Date · Batch (if any) · Warehouse · Unit cost · **Qty remaining** · Layer value. Oldest at top (consumption order). Depleted layers hidden behind a "show depleted" toggle.
- **Average items**: instead of a stack, show the running-average timeline (each receipt → recalculated average), same table shape with a "new avg" column.
- **Total valuation** for the item = Σ (qty remaining × unit cost), per warehouse chips.
- Entirely hidden without `inventory.cost.view`.

### 2.4 Issue / Sale — **COGS surfacing** (read-only, permission-gated)
- On any issue (Sales invoice line, POS sale, transfer-out, adjustment-out), the system computes COGS by consuming layers in effective-method order and writes it to the issue movement's `cost`.
- Where `inventory.cost.view` is granted, the Sales/POS line shows a small **margin** readout: `unit price − unit COGS` (amount + %). Without the permission, price shows but COGS/margin are hidden.
- **Batch items:** the batch already chosen by DD-2's `selectBatchesForIssue` drives the cost — physical pick and cost consumption are the same batch order (no divergence, by construction).

### 2.5 Returns
- **Sales return** (customer returns goods): the return re-enters stock as a **receipt** whose unit cost = the **COGS recorded on the original sale movement** (cost travels on the movement — no re-lookup of old layers). Return line shows this reversed cost read-only.
- **Purchase return** (return to supplier): an **issue** consuming that supplier's layer; COGS of the return = that layer's cost.

### 2.6 Stock adjustments / stocktake — cost handling
- **Shortage** (count < system): adjustment-**out** valued at effective-method cost → surfaces as an inventory **loss** at the Accounting seam.
- **Overage** (count > system): adjustment-**in** needs a cost. Default = current `avg_cost` (or last purchase price if no cost yet); a permission-gated field lets a supervisor override the overage unit cost. Label `inventory.costing.overage_cost`.

### 2.7 Negative stock / offline-first (POS) — provisional cost
- When an issue happens with **no covering layer** (offline POS sold before the receipt synced, or oversell), the system **allows** it (offline-first principle) and values COGS at the item's **current running cost** (provisional), tagging the movement `pending_cost_reconciliation`.
- A **Cost reconciliation** chip appears on the item cost card and in an Alerts row: `inventory.costing.pending_reconciliation` ("بيع بتكلفة مبدئية — بانتظار استلام مغطّي"). When the covering receipt arrives, the COGS delta is reconciled and the flag clears.
- **This is a decision default (allow-and-reconcile), not a hard rule** — a tenant setting could flip it to block-until-layer later; not built now.

### 2.8 **Inventory Valuation report** (new report, permission `inventory.cost.view`)
- Table: Item · Category · Warehouse · Qty on hand · Effective method · Unit cost · **Total value**. Grand total + per-warehouse and per-category subtotals.
- Filters: warehouse, category, method, "as-of date" (valuation is derived, so an as-of date replays movements up to that date).
- Export (permission `inventory.cost.export`). Reuses the existing report/table shell — no new layout primitives.

---

## 3. i18n keys (add to `i18n/locales/{ar,en}/inventory.json`)

`costing.default_method`, `costing.default_method_hint`, `costing.change_default_confirm`, `costing.method`, `costing.method.fifo`, `costing.method.average`, `costing.method.inherit`, `costing.specific_locked`, `costing.cost_card_title`, `costing.unit_cost`, `costing.qty_remaining`, `costing.layer_value`, `costing.total_valuation`, `costing.new_avg`, `costing.show_depleted`, `costing.margin`, `costing.overage_cost`, `costing.pending_reconciliation`, `costing.valuation_report_title`, `costing.as_of_date`, `costing.method_chip`.

---

## 4. Permissions (add to `apps/erp/src/lib/permissions.ts`)

- `inventory.cost.view` — see unit cost, cost layers, valuation, margin. **SoD-sensitive** (cost visibility ≠ operational stock actions).
- `inventory.cost.export` — export the valuation report.
- `inventory.costing.overage_cost` — override the unit cost of a stocktake overage.
- `inventory.costing.method_edit` — change per-item or tenant default costing method.

Dimensions follow the Core model (action × scope: all/branch/warehouse). Cost view defaults to **governance/owner + accounting roles**, not to every operational cashier. *(Ad-hoc convention now — formalized in Permissions module #8, same as DD-2's four batch permissions.)*

---

## 5. Acceptance criteria

1. Non-batch item, method **FIFO**, two receipts (100@10 then 100@12): issue 150 → COGS = 100×10 + 50×12 = **1600**; remaining layer = 50@12; valuation = **600**. Displayed exactly in the cost card.
2. Non-batch item, method **Weighted Average**, receipts 100@10 then 100@14: `avg_cost` = **12** after 2nd receipt; issue 150 → COGS = **1800**; remaining 50 → value **600**.
3. **Batch-tracked** item: method select is disabled/locked to `specific`; issue picks the DD-2 batch order (FEFO/FIFO) and costs each allocation at **its own batch receipt cost** — physical pick and cost never diverge.
4. **Sales return**: return receipt cost equals the COGS on the original sale movement (not the current layer cost); valuation reflects it.
5. **Stocktake overage**: adjustment-in defaults to `avg_cost`; overriding requires `inventory.costing.overage_cost`; shortage values at effective-method cost.
6. **Negative/offline issue** with no layer: allowed, COGS at provisional running cost, movement flagged `pending_cost_reconciliation`; after covering receipt the flag clears and COGS delta reconciles.
7. **Cost/margin hidden** without `inventory.cost.view` everywhere (cost card, valuation report, Sales/POS margin) — price still shows.
8. **Golden rule:** every displayed unit cost / valuation is derivable from `Σ` over `stock_movement` (cost, qty) for its carrier×warehouse(×batch); `avg_cost` cache reconciles to the derivation; no hand-edited cost is a source of truth.
9. Changing the tenant default method is **prospective** — historical COGS unchanged; only inheriting items adopt the new default for future issues.
10. **Carrier:** all costing keys on `carrier_id = coalesce(variant_id, item_id)` — never branches simple-vs-variant (inherited from DD-1/DD-2).
11. Valuation report "as-of date" replays movements up to that date and totals correctly per warehouse/category.
12. **No** journal entries created in Inventory — COGS/valuation surface as an event/contract for Accounting; verified no ledger-posting call in the Inventory feature.

---

*End DD-3 frontend section.*
