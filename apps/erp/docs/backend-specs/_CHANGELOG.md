# Backend Specs — CHANGELOG

> What changed · when · why. Backend dev reads here to see what's new without re-reading everything.

## 2026-08 — Inventory DD-1: Variants / Matrix
**Changed:** `modules/inventory.backend.md` — added Feature DD-1.
**What:**
- New tables: `attribute`, `attribute_value`, `item_variant`, `item_variant_attribute`.
- Extended: `item` (+`is_product_parent`, `has_variants_flag`), `item_price` (+nullable `variant_id`), `stock_movement` (+nullable `variant_id`), balance view (+`variant_id` in grouping key).
- New endpoints under `/inventory/`: `attributes` (CRUD), `attribute-values` (CRUD), `items/:id/variants` (CRUD + `generate` atomic matrix), list filters `has_variants` + `attribute_value_id[]`.
**Why:**
- Realizes the reserved variants capability (Backend Plan §4.2) as an **additive layer** — the v1 `item` is untouched, so simple items and existing modules keep working (feature-flag-aware).
- **Variant is the balance carrier** (locked decision D5): enforced so a product parent never holds a direct balance; this keeps the golden rule (balance = Σ movements) intact at finer granularity and is the base other deep-dive features (Batch/Serial/Reserved) build on.
- `variant_of` nullable reserves the simple→variant **migration hook** (D8) with zero rebuild.
- Cartesian generate is **atomic + capped at 200 combos** to avoid SKU explosion and partial writes.

## 2026-08 — Inventory DD-1 (addendum): ETA-missing warning badge
**Changed:** `modules/inventory.backend.md` context unchanged (no schema change) — this is a frontend-only addendum.
**What:** Inventory now surfaces a warning badge when a variant/simple item is missing `eta_code` (ETA on). Warning-only, no save-block.
**Why (decision A):** ETA is a core capability; the user must see a missing code at item-prep time, not discover it at invoicing. The issue-time block itself stays in Sales/POS (separation of concerns). Applied to simple items too, to remove the variant/simple inconsistency.

## 2026-08 — Inventory DD-2: Batch / Expiry
**Changed:** `modules/inventory.backend.md` — added Feature DD-2.
**What:**
- New table: `stock_batch` (variant_id, lot_number, expiry_date nullable, mfg_date, supplier_ref, status `active|hold` only).
- Extended: `item` (+`tracks_batch`, `requires_expiry`, `near_expiry_days`), `stock_movement` (+nullable `batch_id`, widened `type` enum with `receipt`/`issue`/`transfer_in`/`transfer_out`), balance view (+`batch_id` in grouping key).
- New endpoints under `/inventory/`: `items/:id/batches` (list), `.../receive`, `.../:batch_id/hold` (+release), `.../:batch_id/quarantine`, `.../:batch_id/write-off`, `.../:batch_id/trace`, and an `issue` call that runs the new batch-selection engine or accepts a manual override allocation.
- New permissions: `inventory.batch.manual_pick`, `inventory.batch.issue_override`, `inventory.batch.hold`, `inventory.batch.quarantine`.
**Why:**
- Deepens DD-1's balance carrier one level further — `(variant × warehouse)` → `(variant × warehouse × batch)` — same golden rule, no schema surprise for GRN/Purchasing to plug into later (a receipt is just another `receipt`-typed movement).
- FEFO/FIFO auto-selection (excluding hold/expired) is the core loss-prevention value; manual override stays available behind a stricter permission + audit reason for recall/specific-lot cases.
- `expired`/`near_expiry`/`depleted` are derived read-time, never stored, to avoid a background job and any drift between stored status and actual balance/date.
- Frontend build note: batch tracking currently only exercised on simple (non-`is_product_parent`) items — no fixture combines a DD-1 product-parent with DD-2 batches yet, so the per-variant batch selector isn't built; the Issue/Adjustment flows are self-contained inside Inventory (no Sales/POS integration exists yet to call them). Both disclosed as non-blocking scope trims in `inventory.frontend.md` DD-2 §5.
- Sets up DD-3 (FIFO/FEFO Costing), which consumes this feature's batch-selection output to build cost layers — no costing logic added here (Pin B: valuation stays in DD-3/Accounting; the expired-sale hard-block stays in Sales/POS).
