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
