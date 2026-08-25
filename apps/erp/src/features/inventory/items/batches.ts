/**
 * DD-2 — Batch / Expiry: pure, framework-free logic (mirrors variants.ts's role
 * for DD-1). Runs entirely against the mock fixture — no network calls.
 *
 * Golden rule (inviolable, technical §1/§6): a batch's balance is ALWAYS
 * `Σ ledger rows with that batch_id`, and its `expired`/`near_expiry`/`depleted`
 * status is ALWAYS derived read-time from that balance + today's date — never
 * stored. `stock_batch.status` in the fixture only ever holds `active|hold`.
 *
 * Reality correction (same shape as DD-1's kickoff-doc gap, inventory_dd1_variants
 * memory): the DD-2 fixture bundle models every batch-tracked item with its own
 * `demo_variants` row (`var_para500` etc.), separate from the item id, mirroring
 * the backend's `item_variant.variant_of` defaulting to `item_id` for simple
 * items (DD-1 backend §"New: item_variant"). This app's DD-1 frontend only ever
 * materializes an explicit `variants[]` array for `is_product_parent` items, so
 * there is no separate variant row to attach a batch to for a simple item.
 * Rather than inventing a parallel "default variant" entity, a batch's carrier
 * id is simply the DD-1 product-variant id when the item has one, else the
 * item's own id — see `batchCarrierId`. The merged fixture already remaps every
 * `var_*` reference to its owning `itm_*` id on this basis.
 */
import type { InventoryFixture, InventoryItem, InventoryLedgerRow, StockBatch } from "./types";

export type BatchStatus = "active" | "hold" | "depleted" | "expired" | "near_expiry";

/** DD-2 §1 — coalesce(item.near_expiry_days, settings.global_near_expiry_days), same pattern as DD-1's effectiveEtaCode. */
export function effectiveNearExpiryDays(
  item: Pick<InventoryItem, "near_expiry_days">,
  globalDays: number
): number {
  return item.near_expiry_days ?? globalDays;
}

/** The id batches attach to for this item: its DD-1 variant when it has one, else the item itself. */
export function batchCarrierId(item: Pick<InventoryItem, "id">, variantId?: string | null): string {
  return variantId ?? item.id;
}

export function getCarrierBatches(carrierId: string, batches: StockBatch[]): StockBatch[] {
  return batches.filter((b) => b.variant_id === carrierId);
}

export function batchMovements(batchId: string, ledger: InventoryLedgerRow[]): InventoryLedgerRow[] {
  return ledger.filter((m) => m.batch_id === batchId);
}

export function batchBalance(batchId: string, ledger: InventoryLedgerRow[], warehouseId?: string): number {
  return batchMovements(batchId, ledger)
    .filter((m) => !warehouseId || m.warehouse_id === warehouseId)
    .reduce((s, m) => s + m.qty, 0);
}

export function batchWarehouseBalances(
  batchId: string,
  ledger: InventoryLedgerRow[]
): Array<{ warehouse_id: string; qty: number }> {
  const map = new Map<string, number>();
  for (const m of batchMovements(batchId, ledger)) {
    map.set(m.warehouse_id, (map.get(m.warehouse_id) ?? 0) + m.qty);
  }
  return [...map.entries()]
    .map(([warehouse_id, qty]) => ({ warehouse_id, qty }))
    .filter((b) => b.qty !== 0);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** DD-2 §1 — hold → depleted (balance 0) → expired → near_expiry → active. */
export function effectiveBatchStatus(
  batch: Pick<StockBatch, "id" | "status" | "expiry_date">,
  ledger: InventoryLedgerRow[],
  nearExpiryDays: number,
  today: string = todayISO()
): BatchStatus {
  if (batch.status === "hold") return "hold";
  const balance = batchBalance(batch.id, ledger);
  if (balance <= 0) return "depleted";
  if (!batch.expiry_date) return "active";
  if (batch.expiry_date < today) return "expired";
  const near = new Date(today);
  near.setDate(near.getDate() + nearExpiryDays);
  if (batch.expiry_date <= near.toISOString().slice(0, 10)) return "near_expiry";
  return "active";
}

/** DD-2 §2.3 merge key — (variant/carrier + lot + expiry). */
export function findMergeBatch(
  carrierId: string,
  lotNumber: string,
  expiryDate: string | null,
  batches: StockBatch[]
): StockBatch | null {
  return (
    batches.find(
      (b) => b.variant_id === carrierId && b.lot_number === lotNumber && (b.expiry_date ?? null) === (expiryDate ?? null)
    ) ?? null
  );
}

/** Running balance is scoped per (item_id, warehouse_id) — same convention as v1/DD-1's ledger tab. */
function nextRunningBalance(itemId: string, warehouseId: string, ledger: InventoryLedgerRow[]): number {
  return ledger
    .filter((m) => m.item_id === itemId && m.warehouse_id === warehouseId)
    .reduce((s, m) => s + m.qty, 0);
}

/* ── Receipt / opening (DD-2 §2.3/§2.4, technical decision 4) ──────────── */

export interface ReceiptLineInput {
  carrierId: string;
  warehouseId: string;
  lotNumber: string;
  expiryDate: string | null;
  mfgDate: string | null;
  supplierRef: string | null;
  cost: number;
  qty: number;
}

export interface ReceiptResult {
  ok: true;
  batch: StockBatch;
  isNewBatch: boolean;
  movement: InventoryLedgerRow;
}
export interface ReceiptError {
  ok: false;
  reason: "expiry_required" | "invalid_qty" | "lot_required";
}

export function buildReceipt(
  input: ReceiptLineInput,
  itemId: string,
  existingBatches: StockBatch[],
  ledger: InventoryLedgerRow[],
  requiresExpiry: boolean,
  isFirstEver: boolean
): ReceiptResult | ReceiptError {
  if (!input.lotNumber.trim()) return { ok: false, reason: "lot_required" };
  if (requiresExpiry && !input.expiryDate) return { ok: false, reason: "expiry_required" };
  if (!(input.qty > 0)) return { ok: false, reason: "invalid_qty" };

  const merged = findMergeBatch(input.carrierId, input.lotNumber, input.expiryDate, existingBatches);
  const batch: StockBatch = merged ?? {
    id: `bat_${input.carrierId}_${input.lotNumber}_${Date.now()}`.replace(/[^a-z0-9_]/gi, ""),
    variant_id: input.carrierId,
    lot_number: input.lotNumber,
    expiry_date: input.expiryDate,
    mfg_date: input.mfgDate,
    supplier_ref: input.supplierRef,
    status: "active",
    hold_reason: null,
  };

  const movement: InventoryLedgerRow = {
    id: `mv_${batch.id}_${Date.now()}`,
    item_id: itemId,
    date: todayISO(),
    type: isFirstEver ? "opening" : "receipt",
    source_ref: isFirstEver ? "OPENING-BATCH" : `GRN-${Date.now().toString().slice(-6)}`,
    warehouse_id: input.warehouseId,
    batch_id: batch.id,
    qty: input.qty,
    running_balance: nextRunningBalance(itemId, input.warehouseId, ledger) + input.qty,
    cost: input.cost,
    user: "—",
  };
  return { ok: true, batch, isNewBatch: !merged, movement };
}

/* ── Issue / batch-selection engine (DD-2 §2.5/§2.6, technical decision 3) ── */

export interface BatchAllocation {
  batch_id: string;
  qty: number;
}
export interface SelectBatchesResult {
  ok: boolean;
  allocations: BatchAllocation[];
  shortfall: number;
}

/** FEFO for expiry-tracked items, FIFO (by earliest receipt date) for lot-only. Hold & expired never auto-picked. */
export function selectBatchesForIssue(
  carrierId: string,
  warehouseId: string,
  qtyNeeded: number,
  batches: StockBatch[],
  ledger: InventoryLedgerRow[],
  requiresExpiry: boolean,
  today: string = todayISO()
): SelectBatchesResult {
  const eligible = getCarrierBatches(carrierId, batches)
    .map((batch) => ({ batch, balance: batchBalance(batch.id, ledger, warehouseId) }))
    .filter(({ batch, balance }) => balance > 0 && batch.status !== "hold" && !(batch.expiry_date && batch.expiry_date < today));

  eligible.sort((a, b) => {
    if (requiresExpiry) {
      const ae = a.batch.expiry_date ?? "9999-99-99";
      const be = b.batch.expiry_date ?? "9999-99-99";
      return ae < be ? -1 : ae > be ? 1 : 0;
    }
    const earliestReceipt = (batchId: string) =>
      batchMovements(batchId, ledger)
        .filter((m) => m.qty > 0)
        .reduce((min, m) => (m.date < min ? m.date : min), "9999-99-99");
    const ad = earliestReceipt(a.batch.id);
    const bd = earliestReceipt(b.batch.id);
    return ad < bd ? -1 : ad > bd ? 1 : 0;
  });

  let remaining = qtyNeeded;
  const allocations: BatchAllocation[] = [];
  for (const { batch, balance } of eligible) {
    if (remaining <= 0) break;
    const take = Math.min(balance, remaining);
    if (take <= 0) continue;
    allocations.push({ batch_id: batch.id, qty: take });
    remaining -= take;
  }
  return { ok: remaining <= 0 && allocations.length > 0, allocations, shortfall: Math.max(0, remaining) };
}

export function buildIssueMovements(
  allocations: BatchAllocation[],
  itemId: string,
  warehouseId: string,
  sourceRef: string,
  ledger: InventoryLedgerRow[]
): InventoryLedgerRow[] {
  const rows: InventoryLedgerRow[] = [];
  let running = nextRunningBalance(itemId, warehouseId, ledger);
  for (const alloc of allocations) {
    running -= alloc.qty;
    rows.push({
      id: `mv_${alloc.batch_id}_iss_${Date.now()}_${rows.length}`,
      item_id: itemId,
      date: todayISO(),
      type: "issue",
      source_ref: sourceRef,
      warehouse_id: warehouseId,
      batch_id: alloc.batch_id,
      qty: -alloc.qty,
      running_balance: running,
      cost: 0,
      user: "—",
    });
  }
  return rows;
}

/* ── Quarantine & write-off (DD-2 §2.9, technical decision 6) ───────────── */

export const DAMAGED_WAREHOUSE_ID = "wh_damaged";

/** Expired batch → transfer (source → wh_damaged), traceable, reason=expired. */
export function buildQuarantineMovements(
  batchId: string,
  itemId: string,
  fromWarehouseId: string,
  qty: number,
  ledger: InventoryLedgerRow[]
): [InventoryLedgerRow, InventoryLedgerRow] {
  const ref = `QRT-EXP-${Date.now().toString().slice(-6)}`;
  const runningOut = nextRunningBalance(itemId, fromWarehouseId, ledger) - qty;
  const runningIn = nextRunningBalance(itemId, DAMAGED_WAREHOUSE_ID, ledger) + qty;
  return [
    {
      id: `mv_${batchId}_qout_${Date.now()}`,
      item_id: itemId, date: todayISO(), type: "transfer_out", source_ref: ref,
      warehouse_id: fromWarehouseId, batch_id: batchId, qty: -qty, running_balance: runningOut, cost: 0, user: "—",
    },
    {
      id: `mv_${batchId}_qin_${Date.now()}`,
      item_id: itemId, date: todayISO(), type: "transfer_in", source_ref: ref,
      warehouse_id: DAMAGED_WAREHOUSE_ID, batch_id: batchId, qty, running_balance: runningIn, cost: 0, user: "—",
    },
  ];
}

/** A batch sitting in wh_damaged → adjustment-out, reason=expired. Zeroes it; stays traceable. */
export function buildWriteOffMovement(
  batchId: string,
  itemId: string,
  qty: number,
  ledger: InventoryLedgerRow[]
): InventoryLedgerRow {
  return {
    id: `mv_${batchId}_woff_${Date.now()}`,
    item_id: itemId,
    date: todayISO(),
    type: "adjustment",
    source_ref: `WOFF-EXP-${Date.now().toString().slice(-6)}`,
    warehouse_id: DAMAGED_WAREHOUSE_ID,
    batch_id: batchId,
    qty: -qty,
    running_balance: nextRunningBalance(itemId, DAMAGED_WAREHOUSE_ID, ledger) - qty,
    cost: 0,
    user: "—",
  };
}

/** Free-form adjustment against a specific batch (DD-2 §2.4/technical decision 4). */
export function buildBatchAdjustment(
  batchId: string,
  itemId: string,
  warehouseId: string,
  deltaQty: number,
  reasonRef: string,
  ledger: InventoryLedgerRow[]
): InventoryLedgerRow {
  return {
    id: `mv_${batchId}_adj_${Date.now()}`,
    item_id: itemId,
    date: todayISO(),
    type: "adjustment",
    source_ref: reasonRef,
    warehouse_id: warehouseId,
    batch_id: batchId,
    qty: deltaQty,
    running_balance: nextRunningBalance(itemId, warehouseId, ledger) + deltaQty,
    cost: 0,
    user: "—",
  };
}

/* ── Rollup for the Items list (DD-2 §2.8 — "parent learns from any batch") ── */

export function itemBatchAlert(
  item: InventoryItem,
  fixture: Pick<InventoryFixture, "stock_batch" | "ledger" | "settings">
): "expired" | "near_expiry" | null {
  if (!item.tracks_batch) return null;
  const batches = fixture.stock_batch ?? [];
  const carrierIds = item.is_product_parent
    ? (item.variants ?? []).map((v) => v.id)
    : [batchCarrierId(item)];
  const nearDays = effectiveNearExpiryDays(item, fixture.settings?.global_near_expiry_days ?? 30);

  let sawNearExpiry = false;
  for (const carrierId of carrierIds) {
    for (const batch of getCarrierBatches(carrierId, batches)) {
      const st = effectiveBatchStatus(batch, fixture.ledger, nearDays);
      if (st === "expired") return "expired";
      if (st === "near_expiry") sawNearExpiry = true;
    }
  }
  return sawNearExpiry ? "near_expiry" : null;
}
