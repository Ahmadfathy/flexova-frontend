# Claude Code Prompt — DD-3 FIFO/FEFO Costing (Inventory)

> Save at `apps/erp/docs/deep-dive/inventory/prompts/DD-3_Costing.claude-code.md` and run in Claude Code on branch `chore/fe21-phase-a-monorepo`, working dir `apps/erp`.
> ⛔ Do NOT touch `packages/shared` (tokens), `apps/storefront`, or the **MFG** module (`src/features/mfg`, `src/stores/mfg*`). No new design tokens. No journal-entry / ledger-posting code (that's Accounting #3).

## Context
Implement DD-3 (Costing/Valuation) for Inventory, building on DD-1 (carrier = `coalesce(variant_id, item_id)`) and DD-2 (batch engine `selectBatchesForIssue`, `stock_movement.cost` = Pin A, `batch_id` on movement). Specs: `apps/erp/docs/deep-dive/inventory/inventory.frontend.md` (DD-3 section) and `apps/erp/docs/backend-specs/modules/inventory.backend.md` (DD-3 section). **Cost layer = receipt-type movement; qty_remaining is DERIVED, no new table/column. Reuse the carrier resolver; never branch simple-vs-variant.**

## Tasks (in order)

1. **Types** — in `apps/erp/src/features/inventory/items/types.ts`:
   - `item += costing_method?: 'fifo' | 'average' | null` (inherit when null; ignored when `tracks_batch`).
   - `settings += default_costing_method: 'fifo' | 'average'`.
   - Do **NOT** add `qty_remaining` or a cost-layer type to `InventoryLedgerRow` (derive-first, R3). `stock_movement.cost` stays as-is; for issue rows it will now hold unit COGS.

2. **Costing engine** — new `apps/erp/src/features/inventory/items/costing.ts` (sibling of `batches.ts`):
   - `effectiveCostingMethod(item, settings)` → `'specific' | 'fifo' | 'average'` (coalesce, forced `specific` when `tracks_batch`).
   - `deriveCostLayers(carrierId, warehouseId, ledger, method)` → open layers `{ receipt_movement_id, batch_id?, unit_cost, qty_remaining }`, oldest→newest, by replaying movements. Key on `balanceCarrier()` from `batches.ts`.
   - `consumeCostLayers(carrierId, warehouseId, qty, { method, batchFilter? })` → `{ unit_cogs, total_cogs, consumed[] }`. For batch items, restrict/order by the **DD-2 allocation** (from `selectBatchesForIssue`) so physical pick == cost order. On layer exhaustion (negative stock): value remainder at running cost, mark `pending_cost_reconciliation`.
   - `weightedAverageOnReceipt(qtyBefore, avgBefore, qtyIn, unitCostIn)` — **reuse the exact formula in `src/stores/mfgItemStock.ts`** (`round2((qb·ab + qi·ci)/(qb+qi))`); do not invent a new one and do not import/modify MFG.
   - `itemCurrentCost(...)` (for `avg_cost` cache/display) and `itemValuation(carrier, warehouse, asOf?)`.

3. **Wire into issue** — extend DD-2's `buildIssueMovements` (in `batches.ts`) path so each issue movement's `cost` = computed unit COGS via `consumeCostLayers`. Keep the change additive; batch items pass `batchFilter` from the DD-2 allocation.

4. **Fixtures** — merge `apps/erp/docs/deep-dive/inventory/fixtures/Inventory.fixtures.costing.json` into `apps/erp/src/lib/mock/fixtures/Inventory.fixtures.json`:
   - `settings.default_costing_method = 'fifo'`.
   - apply `item_costing_methods` onto `items[]`; append `demo_costing_items` to `items[]`; append `demo_costing_movements` to `ledger[]`; add top-level `cost_events`.
   - Keep `_flag` edge-case rows. Numbers are pre-balanced (FIFO 1600, AVG 1800, remaining 600 each; offline reconciliation delta 5).

5. **Mock client** — in `apps/erp/src/lib/mock/client.ts`: expose cost layers per carrier, current cost, valuation (with `as_of`), and COGS on issue; emit a `CostEvent` object at issue/return/reconcile (consumed by the cost card + a read-only Accounting-seam preview). No posting.

6. **i18n** — add keys from frontend spec §3 to `apps/erp/src/i18n/locales/{ar,en}/inventory.json`.

7. **Permissions** — add to `apps/erp/src/lib/permissions.ts`: `inventory.cost.view`, `inventory.cost.export`, `inventory.costing.overage_cost`, `inventory.costing.method_edit`.

8. **UI** (build on DD-1/DD-2 screens):
   - Inventory Settings → Costing radio (`default_costing_method`, prospective-change confirm).
   - Item Editor → Costing select (`costing_method`, inherit ghost; disabled+locked chip when `tracks_batch`).
   - Item Editor → **Cost card** (layer stack for FIFO/batch, running-avg timeline for average, total valuation) — gated by `inventory.cost.view`.
   - Sales/POS line → margin readout (price − unit COGS), gated by `inventory.cost.view`.
   - Returns: sale-return receipt at original-sale COGS; purchase-return issue.
   - Stocktake overage cost field (default avg; override gated).
   - Offline/negative issue → provisional cost + `pending_cost_reconciliation` chip + reconcile action.
   - **Inventory Valuation report** (new route under reports/inventory) with warehouse/category/method/as-of filters + export.

9. **Routes/menu** — add the Valuation report route; everything else extends existing Item Editor / Settings / Sales screens. Cost UI flag-agnostic (costing always on) but cost **visibility** permission-gated.

## Verification (must pass)
- `pnpm --filter @flexova/erp typecheck` and build clean.
- JSON valid; balances from movements: `it_cost_fifo`=60, `it_cost_avg`=50, `it_cost_offline`=30.
- FIFO: issue 150 → COGS **1600**, remaining 50@12 value **600**. AVG: `avg_cost` **12** after 2nd receipt, issue 150 → COGS **1800**, remaining value **600**.
- Batch item: method locked to `specific`; each allocation costed at its own batch receipt cost; physical pick order == cost order.
- Sales return receipt cost == original-sale movement COGS (10.6667), not current layer cost.
- Offline issue with no layer: allowed, provisional cost 15, flag set; covering receipt (16) reconciles delta (1/unit × 5 = **5**), flag clears.
- Cost/margin/valuation redacted without `inventory.cost.view`.
- Tenant-default change is prospective (no historical COGS rewrite).
- **No** ledger-posting/journal-entry code in Inventory; a `CostEvent` is emitted instead.
- No edits under `packages/shared`, `apps/storefront`, or MFG.
- Playwright smoke: (a) FIFO cost card shows two layers then one after issue; (b) average timeline recomputes to 12; (c) batch issue margin uses batch cost; (d) offline sale flagged then reconciled; (e) cost card hidden without permission.

## Docs to update (in-place, additive)
- `inventory.frontend.md`, `inventory.business.md`, `inventory.technical.md` (append DD-3 sections — provided).
- `apps/erp/docs/backend-specs/modules/inventory.backend.md` (append DD-3) + line in `_CHANGELOG.md`.
- `apps/erp/docs/backend-specs/_DEPENDENCIES.md` (DD-3 entry — provided in the handoff file).

Commit on the branch when green.
