# Inventory — Backend Spec (EN, in-place)

> Module backend spec, updated in-place per deep-dive feature. Built on `_MASTER_Backend_Plan.md` (Flexova_Backend_Plan) invariants:
> PostgreSQL · shared-DB + `tenant_id` + RLS · `branch_id` on operational rows · money `numeric(18,4)` · UTC storage ·
> **balances are ledger-derived, never directly editable** · documents are frozen snapshots · REST drop-in matching fixtures shapes.
> Reading order per feature: Data model → Endpoints → Engines/Enforcement → Migration/Flags → Test hooks.

---

## Feature DD-1 — Variants / Matrix

Realizes the reserved capability noted in Backend Plan §4.2 ("data model accepts variants later without rebuild"). The v1 `item` stays intact; variants are an **additive layer**.

### 1) Data model

**New: `attribute`** (global reference, tenant-scoped)
| col | type | notes |
|---|---|---|
| id | uuid | pk |
| tenant_id | uuid | RLS |
| name_ar | text | ✱ |
| name_en | text | |
| type | enum | `list` \| `color` \| `number` |
| number_unit | text | nullable; for `number` (used later by sold-by-weight) |
| status | enum | active/archived |

**New: `attribute_value`**
| col | type | notes |
|---|---|---|
| id | uuid | pk |
| attribute_id | uuid | fk |
| tenant_id | uuid | RLS |
| value_ar / value_en | text | value_ar ✱ |
| swatch_hex | text | nullable; for `color` |
| sort_order | int | |

**`item` (extend, no rebuild)** — add:
| col | type | notes |
|---|---|---|
| is_product_parent | bool | default false; true = has variants, parent holds **no balance** |
| has_variants_flag | bool | mirrors UI toggle; guarded by capability flag |

Parent-level fields already present (name, category, base_uom, tax_type, image, eta_code base) are the **inherited defaults**. Parent `sale_price` and `barcode` are ignored when `is_product_parent = true`.

**New: `item_variant`** (the SKU; **balance carrier**)
| col | type | notes |
|---|---|---|
| id | uuid | pk |
| tenant_id | uuid | RLS |
| item_id | uuid | fk → parent `item` (the product template) |
| variant_of | uuid | nullable — reserved for **simple→variant migration hook (D8)**; normally = item_id |
| code | text | ✱ unique per tenant (like item.code) |
| barcodes | text[] | own barcodes |
| image | text | nullable; overrides parent image |
| eta_code | text | nullable; **inherits parent base** when null; warn-if-missing at issue time |
| reorder_level | numeric(18,4) | nullable; inherits parent |
| max_level | numeric(18,4) | nullable |
| status | enum | active/suspended |
| sort_order | int | display order under parent |

**New: `item_variant_attribute`** (which values define this variant)
`(variant_id, attribute_id, attribute_value_id)` — the combination. A variant's display name = ordered concat of its values ("أحمر · M").

**`item_price` (extend):** priceable entity becomes **variant** for product items.
- Keep `item_id` for simple items; add nullable `variant_id`. Exactly one of (`item_id` simple) / (`variant_id`) set. Unique `(price_list_id, coalesce(variant_id,item_id))`.

**`stock_movement` (extend):** add nullable `variant_id`.
- Simple item → `variant_id` null, balance keyed by `(item_id, warehouse_id)`.
- Product item → `variant_id` set, balance keyed by `(variant_id, warehouse_id)`. **`item_id` alone never carries a balance for product parents** (enforced — see §3).
- All movement types unchanged (`opening/in/out/transfer/adjustment/stocktake`); `unit_cost` and WAC now computed **per variant**.

**Derived balance:** the current-balance view/materialized-view gains `variant_id` in its grouping key. Parent rollup = `Σ` over its variants (scope-filtered by `branch_id`/warehouse policy).

### 2) Endpoints (`/api/v1/inventory/`)
- `attributes` — full CRUD. `GET attributes/:id` includes values. Delete blocked if any value in use (409 `attribute_in_use`).
- `attribute-values` — CRUD nested or flat; rename allowed; delete blocked if a variant uses it (409 `value_in_use`).
- `items/:id` (extend) — response gains `is_product_parent`, `variants[]` (each with attributes, code, barcodes, prices map, per-warehouse balance rollup, status). Card still "6 tabs" + variants tab payload.
- `items/:id/variants` — `GET` list · `POST` (create one) · `PATCH /:vid` (overrides) · `POST items/:id/variants/generate` (matrix: body = chosen attribute-value sets + excluded combos + per-combo code/barcode/price/opening; **atomic** — creates variants + `opening` movements in one transaction).
- `items` list (extend) — supports `has_variants` filter and `attribute_value_id[]` filter; a product row returns rollup balance + price range; `expand=variants` returns sub-rows.
- Balances/ledger read endpoints (extend) — accept `variant_id`; ledger `GET stock/movements?variant_id=…`.
- Export — flatten: one line per variant.

**Contract note:** shapes mirror `inventory.fixtures.variants.json`. The mock `items/:id` already returns `variants[]`; the API is a drop-in.

### 3) Engines & enforcement
- **Balance-carrier invariant:** a `stock_movement` whose `item.is_product_parent = true` **must** have `variant_id` set; a movement for a simple item must have it null. DB check + service guard. Prevents "parent balance".
- **WAC per variant:** weighted average cost recomputed on each purchase-`in` at `(variant_id)`; parent has no cost of its own (rollup value = Σ variant stock-value).
- **Cartesian generation:** server validates projected combo count ≤ 200 (mirror of UI `combo_explosion`), each generated `code` unique, excluded combos produce no rows; partial success not allowed (all-or-nothing per generate call).
- **Value-in-use guard:** deleting/removing an `attribute_value` referenced by a variant with ≥1 movement → 409; suggest suspend.
- **eta_code resolution:** at Sales issue time, variant `eta_code` = `coalesce(variant.eta_code, parent.eta_code)`; if empty and ETA on → variant flagged not-issuable (block is enforced in Sales, warn here — unchanged rule, variant granularity).
- **Migration hook (D8, deferred):** `variant_of` + a future `POST items/:id/convert-to-product` will remap the simple item's existing movements to a default variant in one transaction. Not implemented now; columns + nullability reserve it with zero rebuild.

### 4) Feature flag & tenancy
- Capability gated by tenant module flag `inventory.variants` (Provider Control Plane / entitlements). When off: `attribute*` and `variants*` endpoints return 404/hidden; `is_product_parent` cannot be set true. Existing product data (if flag later toggled off) remains readable, creation blocked — graceful degradation, no data loss.
- All new tables carry `tenant_id` + RLS; `item_variant` inherits parent's `branch`/warehouse scoping via movements.

### 5) Test hooks
- Property: `Σ variant balances (per warehouse) == parent rollup`; parent never has a direct balance row.
- Generate endpoint is atomic (rollback on any duplicate code / over-limit).
- Deleting a movement-bearing value is rejected; suspend path works.
- WAC computed per variant; a two-variant product with different purchase costs keeps independent avg_cost.

*End of DD-1 (Variants) — inventory.backend.md.*

---

## Feature DD-2 — Batch / Expiry

Builds on DD-1 (variant balance carrier, `variant_id` on movements, coalesce inheritance). No valuation/costing here — that is DD-3.

### 1) Data model

**Balance carrier (corrected per live build).** Batches/movements attach to the **balance carrier**, not to a variant unconditionally:
```
carrier_id = coalesce(variant_id, item_id)
```
- **Simple item** → carrier = `item_id`, `variant_id IS NULL` (no phantom "default variant" is created).
- **Variant item** → carrier = `variant_id`.
- Continues DD-1's own behavior on `stock_movement` (simple items already ride on `item_id` there). ID namespaces are distinct (`itm_` vs `var_`), so `coalesce` is an unambiguous resolver.
- **Rule for every consumer** (Sales, Purchasing, DD-3 costing, Reports, the batch engine): never branch on simple-vs-variant — read `carrier_id` via the resolver and query by it. One uniform key, no phantom rows. *(An earlier draft of this spec had `variant_id NOT NULL` with a "reserved default variant" for simple items; the live build rejected that — it would force a synthetic row with no real-world counterpart for every simple item, against "data reflects reality." Superseded by the coalesce resolver above.)*

**New: `stock_batch`**
| col | type | notes |
|---|---|---|
| id | uuid | pk |
| tenant_id | uuid | RLS |
| item_id | uuid | fk → `item`, **NOT NULL** — always the owning product |
| variant_id | uuid | fk → `item_variant`, **nullable** — set only for a variant item; NULL for a simple item |
| lot_number | text | required |
| expiry_date | date | nullable — null only when the owning item has `requires_expiry=false` |
| mfg_date | date | nullable |
| supplier_ref | text | nullable |
| status | enum | `active` \| `hold` only — `expired`/`near_expiry`/`depleted` are **derived read-time**, never stored (§3) |
| hold_reason | text | nullable — required when status=hold |

**Identity / merge key:** `(carrier_id, lot_number, expiry_date)` — works identically for simple and variant items. Re-receiving the same triplet appends a `receipt` movement to the existing row — no duplicate batch. NULL-in-UNIQUE note: Postgres treats NULLs as distinct, so a plain `UNIQUE(carrier_id, lot_number, expiry_date)` would not catch lot-only duplicates — use **two partial unique indexes** on the carrier: one `WHERE expiry_date IS NULL`, one `WHERE expiry_date IS NOT NULL`. (If `carrier_id` is a generated column, index it directly; otherwise index the `coalesce(variant_id, item_id)` expression.)

**`item` (extend):** `tracks_batch boolean default false`, `requires_expiry boolean default true` (only meaningful when tracked), `near_expiry_days integer nullable` (coalesces with `inventory_settings.global_near_expiry_days`). Tracking is **item-level** (a drug tracks lots regardless of pack size); batches themselves are **per carrier**.

**`stock_movement` (extend):** add nullable `batch_id uuid fk → stock_batch`. Balance carrier deepens to **(carrier_id × warehouse_id × batch_id)**; `batch_id IS NULL` degrades cleanly to DD-1's `(carrier × warehouse)`. Cost stays on the movement (`stock_movement.cost`, already present) — no cost field on `stock_batch`; cost layers are DD-3 (Pin A). New movement subtypes: `receipt` (an `in` that also creates/merges a batch), `issue` (an `out` against a specific batch), `transfer_in`/`transfer_out` (paired legs, used by quarantine). No schema change to `type` beyond widening the enum.

**Derived balance:** `balance(carrier, warehouse, batch) = Σ stock_movement.qty WHERE carrier_id=? AND warehouse_id=? AND batch_id=?`. No stored/editable balance anywhere; per-carrier-per-warehouse balance = Σ over its batches. Enforced by a DB constraint that all stock mutations go through movement inserts.

### 2) Derived status (read-time function)

```
effectiveNearExpiryDays(item)  = coalesce(item.near_expiry_days, settings.global_near_expiry_days)

effectiveBatchStatus(batch, totalBalance, today):
  if batch.status == 'hold'                            -> 'hold'
  if totalBalance == 0                                 -> 'depleted'
  if batch.expiry_date != null and expiry < today      -> 'expired'
  if batch.expiry_date != null
       and expiry <= today + effectiveNearExpiryDays    -> 'near_expiry'
  else                                                 -> 'active'
```

### 3) Batch-selection engine (the core deliverable of DD-2)

```
selectBatchesForIssue(carrier_id, warehouse_id, qty_needed, opts):
  candidates = batches with balance(carrier,warehouse,batch) > 0
               AND stored status = 'active'            -- exclude hold
               AND (not manual) => effectiveStatus != 'expired'   -- exclude expired from auto
  order:
    if item.requires_expiry:  ORDER BY expiry_date ASC, earliest_receipt_date ASC   (FEFO)
    else (lot-only):          ORDER BY earliest_receipt_date ASC                    (FIFO)
  allocate qty across ordered candidates until qty_needed satisfied
  return [{batch_id, qty}]   -> becomes movement rows

manual override path (opts.manual = true):
  requires permission inventory.batch.manual_pick
  caller supplies explicit [{batch_id, qty}]
  selecting an 'expired' or 'hold' batch additionally requires
      inventory.batch.issue_override + a reason -> audit log entry
```
DD-3 (FIFO/FEFO Costing) **consumes** this engine's output to build cost layers — no costing logic here.

### 4) Endpoints (`/api/v1/inventory/`)

| Method | Path | Purpose |
|---|---|---|
| GET | `carriers/:carrierId/batches?warehouse_id=` | batches + per-warehouse balance + effective status (`carrierId` = item_id for simple, variant_id for variant) |
| POST | `batches` | create or return existing (merge key) |
| POST | `stock-in` | receipt: upsert batch by merge key + append `receipt` movement |
| POST | `opening-balances` | bulk opening per batch |
| POST | `adjustments` | adjustment (±) with optional batch |
| POST | `issue` | issue via the selection engine (auto) or an explicit manual list |
| PATCH | `batches/:id/hold` | set/clear hold (reason required to set) |
| POST | `batches/:id/quarantine` | transfer expired qty → `wh_damaged` (reason=expired) |
| POST | `write-off` | adjustment-out from `wh_damaged` (reason=expired) |
| GET | `batches/expiring?days=&warehouse_id=` | near-expiry + expired list |
| GET | `batches/:id/trace` | full movement timeline (recall) |

**Contract note:** shapes mirror `Inventory.fixtures.batch.json` (merged into `Inventory.fixtures.json`) — `stock_batch[]` (now `item_id` + nullable `variant_id`) + batch-tagged `ledger` rows.

### 5) Enforcement rules

1. `item.tracks_batch=true` ⇒ every IN/OUT movement for that item **must** carry `batch_id` (422 otherwise).
2. `item.requires_expiry=true` ⇒ batch creation **must** include `expiry_date` (422 otherwise).
3. Receipt/opening: upsert batch by merge key; never duplicate on the same `(carrier, lot, expiry)`.
4. Issue: engine order enforced server-side; expired & hold excluded from auto; manual override gated + logged.
5. Quarantine = movement pair (out of source / into `wh_damaged`); write-off = adjustment-out. All balances stay = Σ movements.
6. **No hard block on selling expired here.** Inventory only exposes status + excludes from auto-pick. The hard block lives in **Sales/POS** (mirrors the ETA block placement, Pin B).
7. Break-glass / audit: hold, override, quarantine, write-off all emit immutable audit-log events.

### 6) Feature flag & tenancy

Capability gated by tenant module flag `inventory.batch_expiry`. Off ⇒ `batch_id` stays NULL, the engine short-circuits, `tracks_batch` cannot be set true, existing batch data (if later toggled off) stays readable, writes blocked — same graceful-degradation contract as DD-1's `inventory.variants`. `batch_id` on the movement is designed so a future **Purchasing GRN (module #4) is just another producer** of a receipt movement — no schema change needed later. All new tables carry `tenant_id` + RLS.

### 7) Test hooks

- Property: a batch's balance always equals `Σ movements WHERE batch_id = :id`; never negative.
- Re-receiving the same `(carrier, lot, expiry)` never creates a second `stock_batch` row — identical behavior for simple and variant items.
- `selectBatchesForIssue` never returns a `hold` or `expired` batch without an explicit override.
- Quarantine + write-off round-trip: `wh_damaged` balance goes to exactly 0 after write-off; the batch stays queryable via trace.
- `requires_expiry=true` rejects a receive/opening call missing `expiry_date` (422); `requires_expiry=false` accepts one.

*End of DD-2 (Batch/Expiry) — inventory.backend.md.*
