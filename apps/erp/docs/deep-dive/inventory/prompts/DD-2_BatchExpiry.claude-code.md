# Claude Code Prompt — DD-2 Batch/Expiry (Inventory)

> Save at `apps/erp/docs/deep-dive/inventory/prompts/DD-2_BatchExpiry.claude-code.md` and run in Claude Code on branch `chore/fe21-phase-a-monorepo`, working dir `apps/erp`.
> ⛔ Do NOT touch `packages/shared` (tokens) or `apps/storefront`. No new design tokens.

## Context
Implement DD-2 (Batch/Expiry) for Inventory, building on DD-1 (variants = balance carrier, Item Editor at `/inventory/items/:id`, warning-badge convention, coalesce inheritance). Specs: `apps/erp/docs/deep-dive/inventory/inventory.frontend.md` (DD-2 section) and `apps/erp/docs/backend-specs/modules/inventory.backend.md` (DD-2 section).

## Tasks (in order)

1. **Flag** — register `inventory.batch_expiry` in `apps/erp/src/lib/flags.ts` (toggle-able).

2. **Permissions** — add to `apps/erp/src/lib/permissions.ts`: `inventory.batch.manual_pick`, `inventory.batch.issue_override`, `inventory.batch.hold`, `inventory.batch.quarantine`.

3. **Types** — in `apps/erp/src/features/inventory/types.ts`: `StockBatch` (id, variant_id, lot_number, expiry_date|null, mfg_date|null, supplier_ref|null, status:'active'|'hold', hold_reason|null); extend movement type with `batch_id?: string|null`; extend item type with `tracks_batch`, `requires_expiry`, `near_expiry_days?`.

4. **Fixtures** — merge `apps/erp/docs/deep-dive/inventory/fixtures/Inventory.fixtures.batch.json` into `apps/erp/src/lib/mock/fixtures/Inventory.fixtures.json` (add `demo_items`, `demo_variants`, `stock_batch`, `stock_movement_batch`, `settings.global_near_expiry_days`). Keep `_flag` edge-case rows.

5. **Mock client** — in `apps/erp/src/lib/mock/client.ts`: expose batches per variant with per-warehouse balance (Σ movements), `effectiveBatchStatus()` (coalesce item→global), and `selectBatchesForIssue()` (FEFO if requires_expiry else FIFO; exclude hold & expired from auto; manual override path).

6. **i18n** — add keys from the frontend spec §3 to `apps/erp/src/i18n/locales/{ar,en}/inventory.json`.

7. **UI** (build on DD-1 Item Editor):
   - Item Editor → Batch/Expiry section (tracks_batch, requires_expiry, near_expiry_days).
   - Item Editor → Batches tab (list + status badges reusing DD-1 badge convention; row actions hold/quarantine/trace).
   - Stock-in/Receipt modal: batch fields + merge preview.
   - Opening balances per batch; adjustments with batch.
   - Issue flow: show auto-selected batch(es) + permission-gated Manual pick modal (expired/hold need issue_override + reason).
   - Alerts panel: Expiring/Expired section.
   - Items list: rollup batch badge, stacks with ETA-missing badge.
   - Quarantine → `wh_damaged`; Write-off adjustment.
   - Trace view (movement timeline).

8. **Routes/menu** — reuse existing Item Editor route; no new top-level route needed. Ensure the Batch/Expiry section is flag-gated.

## Verification (must pass)
- `pnpm --filter @flexova/erp typecheck` and build clean.
- JSON valid; for every batch, displayed balance == Σ movements per (variant×warehouse×batch); no negatives.
- Derived statuses match fixtures: `bat_para_B`/`bat_milk_A` near_expiry; `bat_para_C`/`bat_milk_B` expired; `bat_para_D`/`bat_oldmilk` depleted; `bat_amox_recall` hold; omron batches active/lot-only.
- Flag off ⇒ no batch UI; DD-1 screens unchanged.
- Playwright: (a) receipt blocks save without expiry when requires_expiry; (b) re-receiving same lot+expiry shows merge notice, no new row; (c) issue auto-picks nearest-expiry active batch, never expired/hold; (d) manual pick hidden without permission; (e) badges render with existing tokens only and stack with ETA-missing.
- No edits under `packages/shared` or `apps/storefront`.

## Docs to update (in-place, additive)
- `inventory.frontend.md`, `inventory.business.md`, `inventory.technical.md` (append DD-2 sections — provided).
- `apps/erp/docs/backend-specs/modules/inventory.backend.md` (append DD-2) + line in `_CHANGELOG.md`.
- `apps/erp/docs/backend-specs/_DEPENDENCIES.md` (DD-2 entry — provided).

Commit on the branch when green.
