/**
 * DD-3 — FIFO/FEFO Costing: pure, framework-free logic (mirrors batches.ts's role for DD-2,
 * variants.ts's role for DD-1). Runs entirely against the mock fixture — no network calls.
 *
 * Golden rule (inviolable, technical decision 2/§1 pin A carried forward): a cost layer is not a
 * new entity — it IS a receipt-type `stock_movement` with its `cost` already stored. `qty_remaining`
 * is always DERIVED by replaying the movement stream in effective-method order, never a stored
 * column. `InventoryLedgerRow` gets zero new "layer" shape from this file (only the additive
 * `pending_cost_reconciliation` flag, mirroring DD-2's additive `batch_id`).
 *
 * Carrier: every costing key is `carrier_id = coalesce(variant_id, item_id)` — the same
 * `balanceCarrier()` resolver DD-1/DD-2 already use. Never branch simple-vs-variant.
 *
 * Boundary (technical decision 6): this file computes COGS/valuation and shapes the Accounting
 * seam contract (`CostEvent`). It never writes a journal entry — Accounting (module #3) posts.
 *
 * MFG boundary (technical decision 5): `weightedAverageOnReceipt` reuses the exact formula live
 * in `src/stores/mfgItemStock.ts` (`round2((qb·ab + qi·ci)/(qb+qi))`) — reimplemented here on
 * purpose, not imported, so this file has zero dependency on `src/features/mfg` / `src/stores/mfg*`.
 */
import type { CostEvent, InventoryFixture, InventoryItem, InventoryLedgerRow } from "./types";
import { balanceCarrier } from "./batches";

export type EffectiveCostingMethod = "specific" | "fifo" | "average";

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Unit-cost display rounding for FIFO/specific (4dp — e.g. 1600/150 = 10.6667). `total_cogs` is
 *  always the exact sum of consumed-layer values, never `qty × the rounded unit figure`. */
export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Frontend spec §1 / backend spec §1.2 — read-time resolution, same coalesce/inheritance shape
 *  as DD-2's `effectiveNearExpiryDays`. `specific` is never a stored value. */
export function effectiveCostingMethod(
  item: Pick<InventoryItem, "tracks_batch" | "costing_method">,
  settings: Pick<NonNullable<InventoryFixture["settings"]>, "default_costing_method"> | undefined
): EffectiveCostingMethod {
  if (item.tracks_batch) return "specific";
  return item.costing_method ?? settings?.default_costing_method ?? "fifo";
}

function byDateId(a: InventoryLedgerRow, b: InventoryLedgerRow): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function carrierMovements(
  carrierId: string,
  ledger: InventoryLedgerRow[],
  opts?: { warehouseId?: string; batchId?: string; asOf?: string }
): InventoryLedgerRow[] {
  return ledger.filter(
    (m) =>
      balanceCarrier(m) === carrierId &&
      (!opts?.warehouseId || m.warehouse_id === opts.warehouseId) &&
      (!opts?.batchId || m.batch_id === opts.batchId) &&
      (!opts?.asOf || m.date <= opts.asOf)
  );
}

function nextRunningBalance(carrierId: string, warehouseId: string, ledger: InventoryLedgerRow[]): number {
  return carrierMovements(carrierId, ledger, { warehouseId }).reduce((s, m) => s + m.qty, 0);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Weighted average (technical decision 5) ─────────────────────────────── */

/** `on receipt: new_avg = round2((qty_before·avg_before + qty_in·unit_cost_in)/(qty_before+qty_in))`.
 *  Issues never move the average. */
export function weightedAverageOnReceipt(qtyBefore: number, avgBefore: number, qtyIn: number, unitCostIn: number): number {
  const qtyAfter = qtyBefore + qtyIn;
  return qtyAfter > 0 ? round2((qtyBefore * avgBefore + qtyIn * unitCostIn) / qtyAfter) : avgBefore;
}

/** The running weighted-average balance for a `method='average'` carrier, replaying receipts
 *  chronologically. Backend spec §2.3. */
export function computeRunningAverage(
  carrierId: string,
  ledger: InventoryLedgerRow[],
  opts?: { warehouseId?: string; asOf?: string }
): { qty: number; avg: number; lastReceiptId: string | null; lastReceiptDate: string | null } {
  const rows = carrierMovements(carrierId, ledger, opts).sort(byDateId);
  let qty = 0;
  let avg = 0;
  let lastReceiptId: string | null = null;
  let lastReceiptDate: string | null = null;
  for (const m of rows) {
    if (m.qty > 0) {
      avg = weightedAverageOnReceipt(qty, avg, m.qty, m.cost ?? 0);
      qty += m.qty;
      lastReceiptId = m.id;
      lastReceiptDate = m.date;
    } else if (m.qty < 0) {
      qty += m.qty;
    }
  }
  return { qty, avg, lastReceiptId, lastReceiptDate };
}

/** Frontend spec §2.3 — cost-card "average timeline": one row per receipt, oldest first, each
 *  showing the average recalculated at that point (the "new avg" column). */
export interface AverageTimelineRow {
  receipt_movement_id: string;
  date: string;
  qty_before: number;
  avg_before: number;
  qty_in: number;
  unit_cost_in: number;
  new_avg: number;
}
export function deriveAverageTimeline(
  carrierId: string,
  ledger: InventoryLedgerRow[],
  opts?: { warehouseId?: string; asOf?: string }
): AverageTimelineRow[] {
  const rows = carrierMovements(carrierId, ledger, opts)
    .filter((m) => m.qty > 0)
    .sort(byDateId);
  let qty = 0;
  let avg = 0;
  const out: AverageTimelineRow[] = [];
  for (const m of rows) {
    const newAvg = weightedAverageOnReceipt(qty, avg, m.qty, m.cost ?? 0);
    out.push({ receipt_movement_id: m.id, date: m.date, qty_before: qty, avg_before: avg, qty_in: m.qty, unit_cost_in: m.cost ?? 0, new_avg: newAvg });
    avg = newAvg;
    qty += m.qty;
  }
  return out;
}

/* ── Cost layers (technical decision 2 / backend §2.1) ───────────────────── */

export interface CostLayer {
  receipt_movement_id: string;
  batch_id?: string | null;
  date: string;
  unit_cost: number;
  qty_remaining: number;
}

/** Derive open cost layers for a carrier, oldest→newest, by replaying the movement stream.
 *  `method='average'` collapses to a single synthetic running layer (backend §2.1: "single running
 *  layer"). Deterministic — same order every replay, so no stored `qty_remaining` is needed. */
export function deriveCostLayers(
  carrierId: string,
  ledger: InventoryLedgerRow[],
  method: EffectiveCostingMethod,
  opts?: { warehouseId?: string; batchId?: string; asOf?: string; includeDepleted?: boolean }
): CostLayer[] {
  if (method === "average") {
    const { qty, avg, lastReceiptId, lastReceiptDate } = computeRunningAverage(carrierId, ledger, opts);
    if (qty <= 0 && !opts?.includeDepleted) return [];
    return [
      {
        receipt_movement_id: lastReceiptId ?? "running_avg",
        batch_id: null,
        date: lastReceiptDate ?? "",
        unit_cost: avg,
        qty_remaining: Math.max(0, qty),
      },
    ];
  }

  // fifo | specific — oldest receipt first; replay issues against them in that order.
  const rows = carrierMovements(carrierId, ledger, opts);
  const layers: CostLayer[] = rows
    .filter((m) => m.qty > 0)
    .sort(byDateId)
    .map((m) => ({ receipt_movement_id: m.id, batch_id: m.batch_id ?? null, date: m.date, unit_cost: m.cost ?? 0, qty_remaining: m.qty }));

  const issues = rows.filter((m) => m.qty < 0).sort(byDateId);
  for (const iss of issues) {
    let remaining = -iss.qty;
    for (const layer of layers) {
      if (remaining <= 0) break;
      const take = Math.min(layer.qty_remaining, remaining);
      layer.qty_remaining -= take;
      remaining -= take;
    }
    // remaining > 0 here means that issue oversold at the time (offline/negative) — there was
    // nothing left to decrement; today's open layers are unaffected by a past shortfall.
  }

  return opts?.includeDepleted ? layers : layers.filter((l) => l.qty_remaining > 0);
}

/* ── Consume layers → COGS (backend §2.2) ─────────────────────────────────── */

export interface ConsumedLine {
  layer_id: string;
  qty: number;
  unit_cost: number;
  batch_id?: string;
}
export interface ConsumeResult {
  unit_cogs: number;
  total_cogs: number;
  consumed: ConsumedLine[];
  pending_cost_reconciliation: boolean;
}

export function consumeCostLayers(
  carrierId: string,
  qty: number,
  ledger: InventoryLedgerRow[],
  opts: {
    method: EffectiveCostingMethod;
    warehouseId: string;
    /** batch item allocation being costed — DD-2 already decided *which* batch leaves; this
     *  restricts layers to that one batch's own receipts (oldest first within it). */
    batchId?: string;
    /** provisional unit cost to charge when no layer covers `qty` at all (offline/negative issue,
     *  §2.7) — resolved by the caller from `item.avg_cost ?? item.last_purchase_price ?? 0`. */
    fallbackCost?: number;
  }
): ConsumeResult {
  const layers = deriveCostLayers(carrierId, ledger, opts.method, { warehouseId: opts.warehouseId, batchId: opts.batchId });
  let remaining = qty;
  const consumed: ConsumedLine[] = [];
  let totalCogs = 0;

  for (const layer of layers) {
    if (remaining <= 0) break;
    const take = Math.min(layer.qty_remaining, remaining);
    if (take <= 0) continue;
    consumed.push({ layer_id: layer.receipt_movement_id, qty: take, unit_cost: layer.unit_cost, batch_id: layer.batch_id ?? opts.batchId });
    totalCogs += take * layer.unit_cost;
    remaining -= take;
  }

  let pending = false;
  if (remaining > 0) {
    // Layer exhaustion (negative stock, backend §2.2) — value the remainder at the running cost
    // (last known layer cost, or the caller's fallback if there was never a layer at all) and flag.
    pending = true;
    const runningCost = layers.length > 0 ? layers[layers.length - 1].unit_cost : (opts.fallbackCost ?? 0);
    consumed.push({ layer_id: "provisional", qty: remaining, unit_cost: runningCost, batch_id: opts.batchId });
    totalCogs += remaining * runningCost;
  }

  const unitCogs = qty > 0 ? round4(totalCogs / qty) : 0;
  return { unit_cogs: unitCogs, total_cogs: round2(totalCogs), consumed, pending_cost_reconciliation: pending };
}

/* ── Current cost / valuation (backend §1.1, §2.6) ────────────────────────── */

/** `item.avg_cost` is a maintained **cache**, never the source of truth for display (golden rule
 *  §5.8) — this always re-derives from the movement stream. Falls back to the cache only when a
 *  carrier has zero open layers at all (nothing to derive from yet). */
export function itemCurrentCost(
  item: Pick<InventoryItem, "avg_cost" | "last_purchase_price">,
  ledger: InventoryLedgerRow[],
  carrierId: string,
  method: EffectiveCostingMethod,
  opts?: { warehouseId?: string; asOf?: string }
): number {
  const layers = deriveCostLayers(carrierId, ledger, method, opts);
  const totalQty = layers.reduce((s, l) => s + l.qty_remaining, 0);
  if (totalQty <= 0) return item.avg_cost ?? item.last_purchase_price ?? 0;
  const totalValue = layers.reduce((s, l) => s + l.qty_remaining * l.unit_cost, 0);
  return method === "average" ? round2(totalValue / totalQty) : round4(totalValue / totalQty);
}

/** `Σ (qty_remaining × unit_cost)` over open layers — derived, per backend §2.6. `asOf` replays
 *  movements only up to that date. */
export function itemValuation(
  carrierId: string,
  ledger: InventoryLedgerRow[],
  method: EffectiveCostingMethod,
  opts?: { warehouseId?: string; asOf?: string }
): number {
  const layers = deriveCostLayers(carrierId, ledger, method, opts);
  return round2(layers.reduce((s, l) => s + l.qty_remaining * l.unit_cost, 0));
}

/** Stocktake overage default (frontend §2.6 / backend §2.5): `avg_cost` or last purchase price. */
export function stocktakeOverageCost(item: Pick<InventoryItem, "avg_cost" | "last_purchase_price">): number {
  return item.avg_cost ?? item.last_purchase_price ?? 0;
}

/* ── Accounting seam (technical decision 6 / backend §3) — compute + emit only, never post ── */

export function buildCostEvent(
  movementId: string,
  carrierId: string,
  warehouseId: string,
  qty: number,
  result: ConsumeResult,
  method: EffectiveCostingMethod,
  kind: CostEvent["kind"]
): CostEvent {
  return {
    movement_id: movementId,
    carrier_id: carrierId,
    warehouse_id: warehouseId,
    qty,
    unit_cogs: result.unit_cogs,
    total_cogs: result.total_cogs,
    method,
    consumed: result.consumed.map((c) => ({ layer_id: c.layer_id, qty: c.qty, unit_cost: c.unit_cost, batch_id: c.batch_id })),
    pending_cost_reconciliation: result.pending_cost_reconciliation,
    kind,
  };
}

/* ── Plain (non-batch) receipt / issue producers — sibling of batches.ts's buildReceipt /
   buildIssueMovements for carriers that don't track batches. No StockBatch is touched. ── */

export function buildCostingReceipt(
  carrierId: string,
  itemId: string,
  variantId: string | null,
  warehouseId: string,
  qty: number,
  cost: number,
  ledger: InventoryLedgerRow[],
  sourceRef?: string
): InventoryLedgerRow {
  const isFirstEver = !ledger.some((m) => balanceCarrier(m) === carrierId);
  return {
    id: `mv_${carrierId}_rcpt_${Date.now()}`,
    item_id: itemId,
    variant_id: variantId ?? undefined,
    date: todayISO(),
    type: isFirstEver ? "opening" : "receipt",
    source_ref: sourceRef ?? (isFirstEver ? "OPENING" : `GRN-${Date.now().toString().slice(-6)}`),
    warehouse_id: warehouseId,
    qty,
    cost,
    running_balance: nextRunningBalance(carrierId, warehouseId, ledger) + qty,
    user: "—",
  };
}

export interface SimpleIssueResult {
  movement: InventoryLedgerRow;
  costEvent: CostEvent;
}

/** Always succeeds (offline-first §2.7) — a shortfall is priced at provisional cost and flagged
 *  via `consumeCostLayers`, never blocked. `kind` lets the same builder stand in for a plain issue
 *  or a purchase-return (an issue that consumes the supplier's layer, backend §2.5). */
export function buildCostingIssue(
  carrierId: string,
  itemId: string,
  variantId: string | null,
  warehouseId: string,
  qty: number,
  ledger: InventoryLedgerRow[],
  method: EffectiveCostingMethod,
  fallbackCost: number,
  sourceRef: string,
  kind: CostEvent["kind"] = "issue"
): SimpleIssueResult {
  const result = consumeCostLayers(carrierId, qty, ledger, { method, warehouseId, fallbackCost });
  const movement: InventoryLedgerRow = {
    id: `mv_${carrierId}_iss_${Date.now()}`,
    item_id: itemId,
    variant_id: variantId ?? undefined,
    date: todayISO(),
    type: "issue",
    source_ref: sourceRef,
    warehouse_id: warehouseId,
    qty: -qty,
    cost: result.unit_cogs,
    running_balance: nextRunningBalance(carrierId, warehouseId, ledger) - qty,
    user: "—",
    pending_cost_reconciliation: result.pending_cost_reconciliation || undefined,
  };
  return { movement, costEvent: buildCostEvent(movement.id, carrierId, warehouseId, qty, result, method, kind) };
}

export interface SalesReturnResult {
  movement: InventoryLedgerRow;
  costEvent: CostEvent;
}

/** Technical decision 4 — sales return re-enters stock at the COGS already recorded on the
 *  original sale movement; no re-lookup of consumed layers, no relink table. */
export function buildSalesReturnReceipt(
  originalIssue: InventoryLedgerRow,
  qty: number,
  ledger: InventoryLedgerRow[],
  sourceRef: string,
  method: EffectiveCostingMethod = "fifo"
): SalesReturnResult {
  const carrierId = balanceCarrier(originalIssue);
  const unitCost = originalIssue.cost ?? 0;
  const movement: InventoryLedgerRow = {
    id: `mv_${carrierId}_sret_${Date.now()}`,
    item_id: originalIssue.item_id,
    variant_id: originalIssue.variant_id,
    date: todayISO(),
    type: "receipt",
    source_ref: sourceRef,
    warehouse_id: originalIssue.warehouse_id,
    batch_id: originalIssue.batch_id ?? undefined,
    qty,
    cost: unitCost,
    running_balance: nextRunningBalance(carrierId, originalIssue.warehouse_id, ledger) + qty,
    user: "—",
  };
  const costEvent: CostEvent = {
    movement_id: movement.id,
    carrier_id: carrierId,
    warehouse_id: originalIssue.warehouse_id,
    qty,
    unit_cogs: unitCost,
    total_cogs: round2(unitCost * qty),
    method,
    consumed: [],
    pending_cost_reconciliation: false,
    kind: "sales_return",
  };
  return { movement, costEvent };
}

export interface ReconciliationResult {
  adjustment: InventoryLedgerRow;
  costEvent: CostEvent;
}

/** §2.7 — once a covering receipt exists for a `pending_cost_reconciliation` issue, the COGS
 *  delta (covering receipt's cost − the provisional cost already recorded) posts as a `qty:0`
 *  audit adjustment + a `reconciliation` CostEvent; the caller clears the flag on the original
 *  issue row. */
export function buildCostReconciliation(
  pendingIssue: InventoryLedgerRow,
  coveringReceipt: InventoryLedgerRow,
  ledger: InventoryLedgerRow[],
  method: EffectiveCostingMethod = "fifo"
): ReconciliationResult {
  const carrierId = balanceCarrier(pendingIssue);
  const qty = -pendingIssue.qty; // pendingIssue.qty is negative
  const delta = round2((coveringReceipt.cost ?? 0) - (pendingIssue.cost ?? 0));
  const adjustment: InventoryLedgerRow = {
    id: `mv_${carrierId}_recon_${Date.now()}`,
    item_id: pendingIssue.item_id,
    variant_id: pendingIssue.variant_id,
    date: todayISO(),
    type: "adjustment",
    source_ref: `COGS-RECON-${Date.now().toString().slice(-6)}`,
    warehouse_id: pendingIssue.warehouse_id,
    qty: 0,
    cost: delta,
    running_balance: nextRunningBalance(carrierId, pendingIssue.warehouse_id, ledger),
    user: "system",
  };
  const costEvent: CostEvent = {
    movement_id: adjustment.id,
    carrier_id: carrierId,
    warehouse_id: pendingIssue.warehouse_id,
    qty,
    unit_cogs: delta,
    total_cogs: round2(delta * qty),
    method,
    consumed: [{ layer_id: coveringReceipt.id, qty, unit_cost: delta }],
    pending_cost_reconciliation: false,
    kind: "reconciliation",
    note: `actual ${coveringReceipt.cost} − provisional ${pendingIssue.cost} = ${delta}/unit × ${qty}`,
  };
  return { adjustment, costEvent };
}
