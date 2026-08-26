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
- New table: `stock_batch` (`item_id` NOT NULL, `variant_id` nullable, identity/merge key = `(carrier_id, lot_number, expiry_date)` where `carrier_id = coalesce(variant_id, item_id)`, status `active|hold` only).
- Extended: `item` (+`tracks_batch`, `requires_expiry`, `near_expiry_days`), `stock_movement` (+nullable `batch_id`, widened `type` enum with `receipt`/`issue`/`transfer_in`/`transfer_out`), balance now keyed `(carrier_id × warehouse_id × batch_id)`, `inventory_settings` (+`global_near_expiry_days`).
- New endpoints under `/inventory/`: `carriers/:carrierId/batches` (list), `batches`, `stock-in`, `opening-balances`, `adjustments`, `issue` (auto via the selection engine, or manual), `batches/:id/hold`, `batches/:id/quarantine`, `write-off`, `batches/expiring`, `batches/:id/trace`.
- New permissions: `inventory.batch.manual_pick`, `inventory.batch.issue_override`, `inventory.batch.hold`, `inventory.batch.quarantine`.
**Why:**
- Deepens DD-1's balance carrier one level further — `(carrier × warehouse)` → `(carrier × warehouse × batch)` — same golden rule, no schema surprise for GRN/Purchasing to plug into later (a receipt is just another `receipt`-typed movement).
- **Corrected per the live build:** an earlier draft required `variant_id NOT NULL` with a "reserved default variant" for simple items. Rejected — it forces a synthetic row with no real-world counterpart for every simple item, against "data reflects reality." Settled on `carrier_id = coalesce(variant_id, item_id)`, resolved by one function every consumer (Sales, Purchasing, DD-3 costing, Reports, the batch engine) reads without ever branching on simple-vs-variant.
- FEFO/FIFO auto-selection (excluding hold/expired) is the core loss-prevention value; manual override stays available behind a stricter permission + audit reason for recall/specific-lot cases.
- `expired`/`near_expiry`/`depleted` are derived read-time, never stored, to avoid a background job and any drift between stored status and actual balance/date.
- Frontend build note: batch tracking currently only exercised on simple (non-`is_product_parent`) items — no fixture combines a DD-1 product-parent with DD-2 batches yet, so the per-variant batch selector isn't built; the Issue/Adjustment flows are self-contained inside Inventory (no Sales/POS integration exists yet to call them). Both disclosed as non-blocking scope trims in `inventory.frontend.md` DD-2 §5.
- Sets up DD-3 (FIFO/FEFO Costing), which consumes this feature's batch-selection output to build cost layers — no costing logic added here (Pin A: cost stays on the movement, not the batch; Pin B: the expired-sale hard-block stays in Sales/POS).

## [Inventory] DD-3 FIFO/FEFO Costing — 2026-08-26 — Ahmad
**Changed:** `modules/inventory.backend.md` — added Feature DD-3.
**What:**
- Costing = valuation layer on DD-2. Cost layer = receipt-type `stock_movement` (Pin A); `qty_remaining` DERIVED, no new table/column.
- `item` += `costing_method` (fifo|average, nullable; inherit tenant default; forced `specific` when `tracks_batch`). `inventory_settings` += `default_costing_method` (default fifo).
- `avg_cost` becomes a maintained cache (moving-average formula reused from MFG `mfgItemStock`, reimplemented locally — MFG itself untouched, zero import).
- `stock_movement.cost` reused for issue-type = unit COGS (previously unset for issues); one additive flag `pending_cost_reconciliation` — no other shape change (R3).
- Engine `costing.ts`: `deriveCostLayers` / `consumeCostLayers` (FIFO + specific-batch via DD-2 allocation order) / `weightedAverageOnReceipt` / `itemCurrentCost` / `itemValuation`. Perpetual COGS at issue time.
- Returns: sale-return receipt at original-sale COGS; purchase-return issue at supplier layer. Stocktake short=loss, over=avg/override.
- Negative/offline issue allowed at provisional cost + `pending_cost_reconciliation`; reconcile action on the Cost card once a covering receipt exists.
- Accounting seam: `CostEvent` emitted into the mock's `cost_events[]`. Zero journal-entry code in Inventory (verified).
- New endpoints (frontend-only mock so far): cost-layers, cost, valuation, cost-reconcile, costing-method, settings/costing.
- New UI: Item Editor Costing select + Cost card (layer stack / average timeline); `CostingSection.tsx` — Receipt/Issue/Return for **non-batch** items (a genuinely new surface, none existed pre-DD-3); Inventory Settings page (new, `/inventory/settings`); Inventory Valuation report (new, `/inventory/valuation`); margin readout in the Issue dialogs.
**Why:**
- LIFO rejected (IAS 2 / Egyptian accounting) — not a selectable value anywhere.
- Cost visibility gated by `inventory.cost.view` (ad hoc; formalize in Permissions #8, same convention as DD-2's four batch permissions) — layers/valuation/margin all early-return without it, not just visually hidden.
- MFG boundary: convergence (MFG consuming Inventory's costing) stays a separate, logged, not-yet-built item — DD-3 only reuses the *formula*.
- Frontend build note: Receipt/Issue/Return UI built for non-batch **simple** carriers only (same batch-vs-variant scope trim as DD-2); Sales/POS margin + returns live inside Inventory's own dialogs since no Sales/POS integration seam exists yet (identical boundary to DD-2's self-contained Issue/Adjustment). Disclosed as non-blocking in `inventory.frontend.md` DD-3 §5.

## [Cross-module] Mock fixture loader — case-sensitive match fixed — 2026-08-26 — Ahmad
**Changed:** `apps/erp/src/lib/mock/client.ts` — `loadFixture()` only (no schema/endpoint change; not part of DD-3's own feature surface, caught while live-verifying it).
**What:** `loadFixture()` matched the `import.meta.glob` key against `moduleName` with a case-sensitive `.includes()`. `Inventory.fixtures.json` is capitalized (the single source-of-truth file) while every caller passes lowercase `"inventory"` — the match silently failed and `loadFixture` threw `Fixture not found: inventory`. Fixed to a case-insensitive match.
**Why:** This is a pre-existing bug (reproduces on `HEAD` with DD-3's changes stashed out), not introduced by any deep-dive. It broke data loading for every consumer of the Inventory fixture: **Inventory** itself, plus **Purchasing** and **Sales**, both of which cross-read a slim copy of it (`usePurchasingData.ts`, `useSalesData.ts`) — all three rendered a permanent "failed to load" ErrorState on every page load in this checkout. `tsc -b`/`pnpm build` cannot catch this class of bug (it's a runtime-only string mismatch); only live Playwright verification surfaced it. Same disclosure convention as DD-2's standalone ledger-i18n fix — recorded as its own entry since it's unrelated to DD-3's actual feature scope.

**Follow-up (2026-08-26):** the loader fix was only half of it — 14 *static* `import ... from "@/lib/mock/fixtures/…"` references across `pos/`, `fnb/`, `svc/`, `repair/`, `play/`, `wholesale/` used lowercase `inventory`/`crm`/`accounting.fixtures.json` paths. Those resolve fine on a case-insensitive filesystem (macOS/Windows) but fail `tsc -b` with TS2307 "Cannot find module" on a case-sensitive one (Linux CI/deploy) — verified: 11 such errors on a case-sensitive Linux checkout of `d5667f0`, plus 1 unrelated pre-existing TS7006 in `posShift.ts:10` (implicit-any callback param, also fixed). Static fixture imports case-corrected to match the git-tracked capitalized filenames (`Inventory.fixtures.json`, `CRM.fixtures.json`, `Accounting.fixtures.json`); loader + filenames + imports are now a single canonical case throughout. No Linux/case-sensitive box was available in this session to re-run `tsc -b` natively (no Docker; WSL's case-sensitive-directory feature errored "request is not supported" — the optional component isn't enabled) — verified instead via an exhaustive deterministic script cross-checking every `*.fixtures.json` string reference in `apps/erp/src` (82 found) against `git ls-files`' authoritative case-sensitive filenames: 0 mismatches. `tsc -b`/`pnpm build` clean on Windows.
