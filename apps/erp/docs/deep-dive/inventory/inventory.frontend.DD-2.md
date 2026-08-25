# Inventory — Deep-Dive DD-2: Batch / Expiry (Frontend Spec)

> **Append this section to** `apps/erp/docs/deep-dive/inventory/inventory.frontend.md` (cumulative, in-place).
> Builds on DD-1 (variants as balance carrier, Item Editor at `/inventory/items/:id`, warning-badge convention). **No new design tokens.**

---

## 0. Scope & flag

- Feature flag: **`inventory.batch_expiry`** — registered in `apps/erp/src/lib/flags.ts` (toggle-able; not silent-default).
- All batch UI is **feature-flag-aware**: when the flag is off, or when an item has `tracks_batch=false`, every screen behaves exactly as DD-1 (no batch fields, no batch selection, receipts/opening work without batch).
- **Golden rule preserved:** balance is always `Σ stock_movement.qty`, now per **(variant × warehouse × batch)**. No editable balance field anywhere in the UI.

---

## 1. Entities surfaced to the user

| Entity | User-facing meaning | Key fields shown |
|---|---|---|
| `stock_batch` | تشغيلة / Lot | lot_number, expiry_date (nullable), mfg_date, supplier_ref, effective status, per-warehouse qty |
| item toggles | tracking config on the item | `tracks_batch`, `requires_expiry`, `near_expiry_days` |
| movement | now carries `batch_id` | existing ledger + batch column |

**Effective status (computed, never stored beyond active/hold):**
`hold` → `depleted` (balance 0) → `expired` (expiry < today) → `near_expiry` (expiry ≤ today + effectiveNearExpiryDays) → `active`.
`effectiveNearExpiryDays = coalesce(item.near_expiry_days, settings.global_near_expiry_days)` (same coalesce pattern as DD-1's `effectiveEtaCode`).

---

## 2. Screens & fields

### 2.1 Item Editor → **Batch/Expiry section** (new panel)
Route: existing `/inventory/items/:id` (DD-1 Item Editor). Shown only when `flags.inventory.batch_expiry` is on.

Fields:
- Toggle **`tracks_batch`** — label i18n `inventory.batch.tracks_batch` ("يتتبّع تشغيلة/صلاحية").
- Toggle **`requires_expiry`** — shown only when `tracks_batch=on`; default **ON**. Label `inventory.batch.requires_expiry` ("يتطلّب صلاحية"). Off = lot-only (devices/consumables).
- Number field **`near_expiry_days`** — optional per-item override; placeholder shows the global default (`settings.global_near_expiry_days`). Empty = inherit global. Label `inventory.batch.near_expiry_days`.

States: default(off) · tracks-on · lot-only(requires_expiry off) · override-set · inherited(empty→shows global as ghost).

### 2.2 Item Editor → **Batches tab** (per default variant, or per-variant selector if multi-variant)
List columns: Lot · Expiry · Mfg · Supplier ref · Warehouse balances (chips per warehouse) · **Status badge** · row actions.
- **Status badge** reuses the DD-1 warning-badge convention (`Flag` icon + tint classes, `no_eta_code_hint`-style i18n hint):
  - `near_expiry` → `bg-warning-tint` / `text-warning-text` + hint `inventory.batch.near_expiry_hint`.
  - `expired` → `bg-danger-tint` / `text-danger-text` **if those danger tokens already exist in the codebase**; otherwise fall back to warning tint with a stronger label. **Do not invent tokens.**
  - `hold` → warning tint + `inventory.batch.hold_hint` (shows `hold_reason`).
  - `active` / `depleted` → neutral (depleted rows collapsed under a "show depleted" toggle).
- Row actions (permission-gated): **Hold / Release**, **Quarantine expired**, **Trace**.
- Empty state: `inventory.batch.empty` ("لا توجد تشغيلات لهذا الصنف بعد").

### 2.3 Stock-in / Receipt modal (extends DD-1 receipt)
When the item `tracks_batch=on`, add batch fields to each receipt line:
- `lot_number` (required), `expiry_date` (required iff `requires_expiry=on`), `mfg_date`, `supplier_ref`, `cost`, `qty`, `warehouse`.
- **Merge preview:** if `(variant + lot + expiry)` matches an existing batch, show inline note `inventory.batch.merge_notice` ("سيُضاف إلى تشغيلة موجودة") and the resulting new balance. No new batch is created; a receipt movement is appended.
- Flag off / item not tracked → line renders exactly as DD-1 (no batch fields).

### 2.4 Opening balances (per batch)
Grid rows accept lot+expiry+mfg+cost+qty+warehouse → each row emits an `opening` movement with `batch_id`. Non-tracked items → single row without batch (DD-1 behavior).

### 2.5 Issue / Transfer / Adjustment
- On issue, the UI shows the **auto-selected batch(es)** returned by the batch-selection engine (FEFO for expiry-tracked, FIFO for lot-only), displayed read-only with qty split per batch.
- **Manual pick** button (visible only with permission `inventory.batch.manual_pick`) opens the **Batch picker modal**.

### 2.6 Batch picker modal (manual override)
- Sortable list of active batches with balance in the selected warehouse, each showing its status badge.
- **Expired / hold batches are disabled** by default; selecting one requires an explicit "override" confirm (permission `inventory.batch.issue_override`) → writes an audit-logged reason.
- Allocation input per batch; total must equal qty needed. On confirm → movement rows with chosen `batch_id`.

### 2.7 Expiry alerts (Alerts / Low-stock panel)
- New **Expiring soon / Expired** section: lists batches with status `near_expiry` and `expired`, grouped by item, with per-warehouse qty and quick actions (Quarantine, Trace).
- Threshold banner text reflects effective days (item override vs global).

### 2.8 Items list — rollup badges
Parent/item row shows a batch-warning badge if **any** of its variants/batches is `near_expiry` or `expired` (rollup, same "parent learns from any variant" rule as DD-1 ETA-missing). Badges **stack** with the existing ETA-missing badge; they do not replace it.

### 2.9 Quarantine & write-off
- **Quarantine expired** action on an expired batch → creates a transfer movement (source warehouse → `wh_damaged`, reason `expired`). Batch stays traceable.
- **Write-off** action on a batch sitting in `wh_damaged` → adjustment-out (reason `expired`). Both are permission-gated and audit-logged.

### 2.10 Traceability view
Batch → chronological movement timeline (receipt → transfers → issues → quarantine → write-off), each with source_ref, warehouse, qty, user. Read-only. Serves pharma/food recall.

---

## 3. i18n keys (add to `i18n/locales/{ar,en}/inventory.json`)

`batch.tracks_batch`, `batch.requires_expiry`, `batch.near_expiry_days`, `batch.lot_number`, `batch.expiry_date`, `batch.mfg_date`, `batch.supplier_ref`, `batch.status.active|near_expiry|expired|hold|depleted`, `batch.near_expiry_hint`, `batch.expired_hint`, `batch.hold_hint`, `batch.merge_notice`, `batch.empty`, `batch.manual_pick`, `batch.issue_override_confirm`, `batch.quarantine`, `batch.write_off`, `batch.trace`, `batch.expiring_section_title`.

---

## 4. Permissions (add to `apps/erp/src/lib/permissions.ts`)

- `inventory.batch.manual_pick` — see & use manual batch picker.
- `inventory.batch.issue_override` — issue an expired/hold batch (with reason).
- `inventory.batch.hold` — set/release hold.
- `inventory.batch.quarantine` — quarantine + write-off.
Dimensions follow the Core model (action × scope: all/branch/warehouse). Default operational roles get pick/quarantine; override + hold gated to supervisor roles.

---

## 5. Acceptance criteria

1. Flag off → zero batch UI anywhere; DD-1 screens unchanged.
2. Item with `tracks_batch=on, requires_expiry=on` → receipt line **blocks save** without expiry_date (client-side + server 422).
3. Item with `requires_expiry=off` (lot-only) → receipt saves without expiry; issue uses **FIFO by receipt date**.
4. Receiving `(variant+lot+expiry)` that already exists → **no new batch row**; balance accumulates; merge notice shown.
5. Issue on expiry-tracked item auto-selects **nearest-expiry active** batch; expired & hold batches never auto-picked.
6. Manual pick hidden without `inventory.batch.manual_pick`; picking expired/hold requires `issue_override` + reason; both audit-logged.
7. Status badges render correctly for all six states using **existing tokens only**; parent rollup lights up from any variant/batch; stacks with ETA-missing badge.
8. `near_expiry` window respects item override then global (coalesce); milk item (override 7) and paracetamol (global 30) both classify per fixtures.
9. Quarantine moves qty to `wh_damaged` (balance reconciles); write-off zeroes it; batch remains in trace.
10. Every screen’s displayed balance equals `Σ stock_movement.qty` for its (variant×warehouse×batch) — no field edits.

---

*End DD-2 frontend section.*
