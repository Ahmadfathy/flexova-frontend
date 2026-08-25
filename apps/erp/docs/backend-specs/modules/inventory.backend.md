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

Builds on DD-1's balance carrier: the carrier deepens from `(variant × warehouse)` to `(variant × warehouse × batch)`. Additive layer — items/variants with `tracks_batch=false` are entirely unaffected.

### 1) Data model

**New: `stock_batch`**
| col | type | notes |
|---|---|---|
| id | uuid | pk |
| tenant_id | uuid | RLS |
| variant_id | uuid | fk → `item_variant` — the DD-1 balance carrier; for a simple item this is its reserved default variant (`variant_of = item_id`, D1 hook from DD-1) |
| lot_number | text | required |
| expiry_date | date | nullable — null only when the owning item has `requires_expiry=false` |
| mfg_date | date | nullable |
| supplier_ref | text | nullable |
| status | enum | `active` \| `hold` only — `expired`/`near_expiry`/`depleted` are **derived read-time**, never stored (decision 6) |
| hold_reason | text | nullable — set when status=hold |

**Identity / merge key:** `(variant_id, lot_number, expiry_date)`. Re-receiving the same triplet appends a `receipt` movement to the existing row — no duplicate batch. NULL-in-UNIQUE note: Postgres treats NULLs as distinct, so a plain `UNIQUE(variant_id, lot_number, expiry_date)` would not catch lot-only duplicates — use **two partial unique indexes**, one `WHERE expiry_date IS NULL`, one `WHERE expiry_date IS NOT NULL`.

**`item` (extend):** `tracks_batch boolean default false`, `requires_expiry boolean default true`, `near_expiry_days integer nullable` (coalesces with a tenant `settings.global_near_expiry_days`).

**`stock_movement` (extend):** add nullable `batch_id uuid fk → stock_batch`. `tracks_batch=true` on the owning item/variant ⇒ every IN/OUT movement **must** carry `batch_id` (DB check + service guard, 422 otherwise). New movement subtypes for existing `type` semantics: `receipt` (an `in` that also creates/merges a batch), `issue` (an `out` against a specific batch), `transfer_in`/`transfer_out` (paired legs, used by quarantine). No schema change to `type` beyond widening the enum.

**Derived balance:** the balance view's grouping key gains `batch_id`. A batch's balance = `Σ stock_movement.qty WHERE batch_id = :id` (golden rule, one level finer than DD-1).

### 2) Endpoints (`/api/v1/inventory/`)

- `items/:id/batches` — `GET` list (per variant when the item has DD-1 variants) · each row includes derived `status`, per-warehouse balance.
- `items/:id/batches/receive` — `POST` — body: `{ variant_id, warehouse_id, lot_number, expiry_date?, mfg_date?, supplier_ref?, cost, qty }`. Merges into an existing batch on `(variant_id, lot_number, expiry_date)` match, else creates one; always appends a `receipt` (or `opening`, first-ever stock) movement. Atomic.
- `items/:id/batches/:batch_id/hold` — `POST { reason }` / `DELETE` (release).
- `items/:id/batches/:batch_id/quarantine` — `POST` — writes the paired `transfer_out`/`transfer_in` legs into `wh_damaged`; 409 if the batch isn't `expired`.
- `items/:id/batches/:batch_id/write-off` — `POST` — adjustment-out against the `wh_damaged` balance; 409 if that balance is 0.
- `items/:id/batches/:batch_id/trace` — `GET` — the batch's full movement timeline, read-only.
- `issue` (new, or an extension of the future POS/Sales issue call) — `POST { item_id, warehouse_id, qty, allocations? }`. Omitted `allocations` ⇒ server runs `selectBatchesForIssue` and writes the resulting `issue` movements; explicit `allocations` ⇒ manual pick, validated against permission (§3) and, for any expired/hold batch, a required `override_reason` (audit-logged).
- Ledger read endpoints (extend) — accept `batch_id` filter.

**Contract note:** shapes mirror `Inventory.fixtures.batch.json` (merged into `Inventory.fixtures.json`) — `stock_batch[]` + batch-tagged `ledger` rows.

### 3) Engines & enforcement

- **`selectBatchesForIssue(carrier, warehouse, qty)`** — FEFO (`ORDER BY expiry_date ASC`) when the item `requires_expiry`, else FIFO (`ORDER BY earliest receipt date ASC`). Excludes `hold` and `expired` batches. Greedy allocation across eligible batches until qty is covered or stock runs out (partial ⇒ 409 with shortfall).
- **Manual override:** any allocation touching an expired/hold batch requires the caller to hold `inventory.batch.issue_override` and supply a reason; written to the immutable audit log alongside the movement (same convention as other `!`/`!!` sensitive actions).
- **Status derivation (service + read model):** `hold` → `depleted` (balance 0) → `expired` (`expiry_date < today`) → `near_expiry` (`expiry_date <= today + effective_near_expiry_days`) → `active`. `effective_near_expiry_days = coalesce(item.near_expiry_days, tenant_settings.global_near_expiry_days)`.
- **Quarantine/write-off:** quarantine is a same-item transfer to `wh_damaged` (reason=`expired`), never deletes the batch; write-off is an adjustment-out scoped to the `wh_damaged` balance only, so a batch can't be zeroed out of a warehouse it was never quarantined into.
- **Boundary respected (Pin B):** Inventory computes and exposes batch status and excludes expired/hold from auto-pick; the **hard sell-block** on an expired batch at invoice time belongs to Sales/POS (same separation already used for the ETA block), not here.
- **Boundary with DD-3:** this feature builds the **batch-selection engine** only (which batch actually lands on the movement). DD-3 (FIFO/FEFO Costing) **consumes** its output to build cost layers — no costing logic here.

### 4) Feature flag & tenancy

Capability gated by tenant module flag `inventory.batch_expiry`. Off ⇒ `batches*` endpoints 404/hidden, `tracks_batch` cannot be set true, existing batch data (if later toggled off) stays readable, writes blocked — same graceful-degradation contract as DD-1's `inventory.variants`. All new tables carry `tenant_id` + RLS.

### 5) Test hooks

- Property: a batch's balance always equals `Σ movements WHERE batch_id = :id`; never negative.
- Re-receiving the same `(variant, lot, expiry)` never creates a second `stock_batch` row.
- `selectBatchesForIssue` never returns a `hold` or `expired` batch without an explicit override.
- Quarantine + write-off round-trip: `wh_damaged` balance goes to exactly 0 after write-off; the batch stays queryable via trace.
- `requires_expiry=true` rejects a receive/opening call missing `expiry_date` (422); `requires_expiry=false` accepts one.

*End of DD-2 (Batch/Expiry) — inventory.backend.md.*
