# Inventory Backend — DD-2: Batch / Expiry

> **Append in-place to** `apps/erp/docs/backend-specs/modules/inventory.backend.md`
> **Add the CHANGELOG line** (bottom of this file) to `apps/erp/docs/backend-specs/_CHANGELOG.md`.
> Builds on DD-1 (variant balance carrier, `variant_id` on movements, coalesce inheritance). No valuation/costing here — that is DD-3.

---

## 1. Data model

### 1.0 Balance carrier (corrected per live build)
The build attaches batches/movements to the **balance carrier**, not to a variant unconditionally:
```
carrier_id = coalesce(variant_id, item_id)
```
- **Simple item** → carrier = `item_id`, `variant_id IS NULL` (no phantom "default variant" is created).
- **Variant item** → carrier = `variant_id`.
- This continues DD-1's own behavior on `stock_movement` (simple items already ride on `item_id`). Because ID namespaces are distinct (`itm_` vs `var_`), `coalesce` is an unambiguous resolver.
- **Rule for all consumers (Sales, Purchasing, DD-3 costing, Reports, batch engine):** never branch on simple-vs-variant. Read `carrier_id` via the resolver and query by it. This gives one uniform key without phantom rows.

### 1.1 New table `stock_batch`
```
stock_batch
  id            PK
  item_id       FK -> item           NOT NULL          -- always set (owning product)
  variant_id    FK -> item_variant   NULL              -- NULL for simple items
  carrier_id    (computed) = coalesce(variant_id, item_id)   -- logical balance carrier
  lot_number    text                 NOT NULL
  expiry_date   date                 NULL              -- NULL allowed for lot-only items
  mfg_date      date                 NULL
  supplier_ref  text                 NULL
  status        enum('active','hold') NOT NULL DEFAULT 'active'   -- ONLY stored states
  hold_reason   text                 NULL              -- required when status='hold'
  created_at, updated_at
  -- identity / merge key is on the CARRIER, not the variant:
  UNIQUE (carrier_id, lot_number, expiry_date)
```
- `expired`, `near_expiry`, `depleted` are **NOT stored** — derived at read time (§3). Storing them would violate the golden rule (they change with time/movements).
- Identity / merge key = **`(carrier_id, lot_number, expiry_date)`**: re-receiving the same `(carrier, lot, expiry)` reuses the row — works identically for simple and variant items.
- **NULL in a UNIQUE key:** Postgres treats NULLs as distinct, so two lot-only rows with the same lot could both insert. Guard with partial unique indexes on the carrier:
  `UNIQUE (carrier_id, lot_number) WHERE expiry_date IS NULL` **+** `UNIQUE (carrier_id, lot_number, expiry_date) WHERE expiry_date IS NOT NULL`.
  *(If `carrier_id` is a generated column, index it directly; otherwise index the `coalesce(variant_id, item_id)` expression.)*

### 1.2 `stock_movement` — add column
```
+ batch_id   FK -> stock_batch   NULL   -- NULL for non-batch-tracked items
```
- Balance carrier deepens to **(carrier_id × warehouse_id × batch_id)** where `carrier_id = coalesce(variant_id, item_id)`. When `batch_id IS NULL` it degrades to DD-1's (carrier × warehouse). Backward compatible for both simple and variant items.
- **Cost stays on the movement** (`stock_movement.cost`, already present). No cost field on `stock_batch`. Cost layers = DD-3. *(Pin A.)*

### 1.3 `item` — add columns
```
+ tracks_batch      bool  NOT NULL DEFAULT false
+ requires_expiry   bool  NOT NULL DEFAULT true    -- only meaningful when tracks_batch=true
+ near_expiry_days  int   NULL                     -- per-item override; coalesce with global
```
Tracking is **item-level** (a drug tracks lots regardless of pack size); batches themselves are **per variant**.

### 1.4 Settings
```
inventory_settings.global_near_expiry_days  int  NOT NULL DEFAULT 30
```

---

## 2. Balance & the golden rule
`balance(carrier, warehouse, batch) = Σ stock_movement.qty WHERE carrier_id=? AND warehouse_id=? AND batch_id=?`
where `carrier_id = coalesce(variant_id, item_id)`. No stored/editable balance. Per-carrier-per-warehouse balance = Σ over its batches. Enforced by DB constraint that all stock mutations go through movement inserts (no direct balance writes).

---

## 3. Derived status (read-time function)
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

---

## 4. Batch-selection engine (the core deliverable of DD-2)
```
selectBatchesForIssue(carrier_id, warehouse_id, qty_needed, opts):   // carrier_id = coalesce(variant_id, item_id)
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
DD-3 (FIFO/FEFO costing) **consumes** this engine's output to build cost layers; DD-2 does **not** compute cost.

---

## 5. Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/inventory/carriers/:carrierId/batches?warehouse_id=` | batches + per-warehouse balance + effective status (`carrierId` = item_id for simple, variant_id for variant) |
| POST | `/inventory/batches` | create OR return existing (merge key) |
| POST | `/inventory/stock-in` | receipt: upsert batch by merge key + append receipt movement |
| POST | `/inventory/opening-balances` | bulk opening per batch |
| POST | `/inventory/adjustments` | adjustment (± ) with optional batch |
| POST | `/inventory/issue` | issue using selection engine (auto) or manual list |
| PATCH | `/inventory/batches/:id/hold` | set/clear hold (reason required to set) |
| POST | `/inventory/batches/:id/quarantine` | transfer expired qty → `wh_damaged` (reason=expired) |
| POST | `/inventory/write-off` | adjustment-out from `wh_damaged` (reason=expired) |
| GET | `/inventory/batches/expiring?days=&warehouse_id=` | near-expiry + expired list |
| GET | `/inventory/batches/:id/trace` | full movement timeline (recall) |

---

## 6. Enforcement rules
1. `item.tracks_batch=true` ⇒ every IN/OUT movement for that item **must** carry `batch_id` (422 otherwise).
2. `item.requires_expiry=true` ⇒ batch creation **must** include `expiry_date` (422 otherwise).
3. Receipt/opening: upsert batch by merge key; never duplicate on same `(variant,lot,expiry)`.
4. Issue: engine order enforced server-side; expired & hold excluded from auto; manual override gated + logged.
5. Quarantine = movement pair (out of source / into `wh_damaged`); write-off = adjustment-out. All balances stay = Σ movements.
6. **No hard block on selling expired here.** Inventory only exposes status + excludes from auto-pick. The hard block lives in **Sales/POS** (mirrors the ETA block placement). *(Pin B.)*
7. Break-glass / audit: hold, override, quarantine, write-off all emit immutable audit-log events.

---

## 7. Backward compatibility (feature-flag-aware)
- Flag off / `tracks_batch=false`: `batch_id` stays NULL, engine short-circuits, all DD-1 behavior intact.
- `batch_id` on movement is designed so a **Purchasing GRN (module #4) is just another producer** of a receipt movement — no schema change needed later.

---

### CHANGELOG entry (copy to `_CHANGELOG.md`)
```
## [Inventory] DD-2 Batch/Expiry — 2026-08 — Ahmad
- NEW table stock_batch (identity = carrier+lot+expiry; carrier = coalesce(variant_id, item_id); status active|hold only).
- stock_movement += batch_id (nullable). Balance carrier now carrier×warehouse×batch (carrier = coalesce(variant_id, item_id); simple items ride on item_id, no phantom default variant).
- item += tracks_batch, requires_expiry, near_expiry_days. inventory_settings += global_near_expiry_days.
- Derived statuses: expired/near_expiry/depleted computed read-time (coalesce item→global).
- Batch-selection engine: FEFO (expiry) / FIFO (lot-only) + permission-gated manual override.
- Endpoints: batches, stock-in, opening, adjustments, issue, hold, quarantine, write-off, expiring, trace.
- Cost remains on movement (layers deferred to DD-3). Hard expired-sale block deferred to Sales/POS.
```

*End DD-2 backend section.*
