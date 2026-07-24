import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getManufacturingOrders, getItems } from "@/lib/mock/mfg";
import type {
  BomComponent, ManufacturingOrder, MoStage, MfgOverhead, LaborEntry, MaterialIssue, ScrapEntry,
} from "@/types/mfg";
import { isMoCancellable } from "@/features/mfg/orders/moStatus";
import { computeReceiptPreview, round2 } from "@/features/mfg/orders/costing";
import { useMfgItemStock } from "@/stores/mfgItemStock";

export interface AddLaborInput {
  stage_id: string;
  employee_id: string | null;
  hours: number;
  cost: number;
}

export interface AddManualIssueInput {
  stage_id: string;
  lines: { item_id: string; qty: number; unit_cost: number }[];
}

export interface ReceiveFinishedInput {
  qty_good: number;
  to_wh: string;
}

export interface RecordScrapInput {
  stage_id: string;
  item_id: string;
  qty: number;
  reason_id: string;
  note?: string;
}

function patchStage(mo: ManufacturingOrder, stageId: string, patch: Partial<MoStage>): MoStage[] {
  return mo.stages.map((st) => (st.id === stageId ? { ...st, ...patch } : st));
}

/** Recomputes `total`/`unit_cost` from the four cost components — never re-derives
 * `materials`/`overhead` themselves (those only change via their own dedicated actions,
 * e.g. `addManualMaterialIssue`), so a fixture's pre-baked historical total is never
 * silently overwritten by a generic recompute-from-scratch formula. */
function retotal(mo: ManufacturingOrder): ManufacturingOrder {
  const { materials, labor, overhead } = mo.cost_summary;
  const total = materials + labor + overhead;
  const unit_cost = mo.cost_summary.received > 0 ? total / mo.cost_summary.received : 0;
  return { ...mo, cost_summary: { ...mo.cost_summary, total, unit_cost } };
}

export interface CreateMoInput {
  output_item_id: string;
  qty_ordered: number;
  source_template_id: string | null;
  customer_order_id: string | null;
  wh_raw: string;
  wh_wip: string;
  wh_finished: string;
  issue_mode: "backflush" | "manual";
  order_bom: BomComponent[];
  stages: MoStage[];
  overhead: MfgOverhead;
}

const SEED_ORDERS: Record<string, ManufacturingOrder> = Object.fromEntries(
  getManufacturingOrders().map((o) => [o.id, o])
);

function nextNumber(orders: Record<string, ManufacturingOrder>): string {
  const max = Object.values(orders).reduce((m, o) => {
    const n = parseInt(o.number.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `MO-${String(max + 1).padStart(4, "0")}`;
}

let seq = 1;

interface MfgOrdersState {
  orders: Record<string, ManufacturingOrder>;
  /** Cancel after issue = reversing entries, never delete (FE_14 §7.7). Only `manual`-type
   * issues are reversible — a `backflush` issue always accompanies a completed receipt, so
   * that material already left WIP into Inventory-Finished and has nothing left to return. */
  cancelOrder: (id: string) => void;
  /** New draft MO with a frozen copy of the source Order BOM (FE_14 §11.4) — lifecycle
   * fields (stages/issues/labor/scrap/receipts/cost) reset, customer link dropped. */
  duplicateOrder: (id: string) => ManufacturingOrder | null;
  /** New MO from the §6 New MO drawer — `order_bom`/`stages` are the caller's own copy
   * (either from a template or built free), never a live reference into the template. */
  createOrder: (input: CreateMoInput) => ManufacturingOrder;
  /** draft → approved. Flag-don't-block (FE_14 §7.1/§8): material shortage never blocks this. */
  approveOrder: (id: string) => void;
  /** approved → in_progress (the header's "Start production" action). */
  startOrder: (id: string) => void;
  setNotes: (id: string, notes: string) => void;
  /** Order BOM is editable only while `draft` (FE_14 §7.2/§7.7) — enforced here too, not
   * just in the UI, so a stale draft-mode form can't slip an edit through post-approval. */
  updateOrderBom: (id: string, order_bom: BomComponent[]) => void;
  /** pending → in_progress, stamps `started_at`. */
  startStage: (moId: string, stageId: string) => void;
  /** in_progress → done, stamps `ended_at`. */
  endStage: (moId: string, stageId: string) => void;
  assignStage: (moId: string, stageId: string, employeeId: string | null) => void;
  /** Inline "add labor" (FE_14 §7.3) — cost is the caller's own (HR day-rate × hours,
   * or a manual figure when HR is absent/ambiguous); this action only books it. */
  addLaborEntry: (moId: string, input: AddLaborInput) => void;
  /** Advanced manual material issue for a stage, only meaningful when issue_mode=manual
   * (FE_14 §7.3). Increments `materials` by this issue's cost — never recomputed from
   * scratch, so a fixture MO's historical materials figure stays intact. */
  addManualMaterialIssue: (moId: string, input: AddManualIssueInput) => void;
  /** FE_14 §7.5 — backflush-issues raw per Order BOM (backflush mode only), computes
   * overhead fresh from the formula, records the receipt at the new order-average unit
   * cost, updates the finished item's weighted-average (mfgItemStock), and moves status
   * to partial/done. */
  receiveFinished: (moId: string, input: ReceiveFinishedInput) => void;
  /** FE_14 §7.6 — no separate journal entry; scrap stays inside WIP (materials is never
   * reduced for it), only the informational `scrap_effect` readout is recomputed. */
  recordScrap: (moId: string, input: RecordScrapInput) => void;
}

export const useMfgOrders = create<MfgOrdersState>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,

      cancelOrder: (id) => set((s) => {
        const o = s.orders[id];
        if (!o || !isMoCancellable(o.status)) return s;

        const reversible = o.material_issues.filter((mi) => mi.type === "manual");
        let material_issues = o.material_issues;
        let materials = o.cost_summary.materials;

        if (reversible.length > 0) {
          const reversalLines = reversible.flatMap((mi) => mi.lines).map((l) => ({ ...l, qty: -l.qty }));
          const reversedAmount = round2(reversalLines.reduce((sum, l) => sum + Math.abs(l.qty) * l.unit_cost, 0));
          const reversal: MaterialIssue = { id: `mi_${Date.now()}_${seq++}`, type: "reversal", lines: reversalLines };
          material_issues = [...o.material_issues, reversal];
          materials = round2(materials - reversedAmount);
        }

        const total = round2(materials + o.cost_summary.labor + o.cost_summary.overhead);
        const unit_cost = o.cost_summary.received > 0 ? round2(total / o.cost_summary.received) : 0;

        return {
          orders: {
            ...s.orders,
            [id]: {
              ...o,
              status: "cancelled",
              material_issues,
              cost_summary: { ...o.cost_summary, materials, total, unit_cost },
            },
          },
        };
      }),

      duplicateOrder: (id) => {
        const source = get().orders[id];
        if (!source) return null;

        const copy: ManufacturingOrder = {
          ...source,
          id: `mo_${Date.now()}_${seq++}`,
          number: nextNumber(get().orders),
          status: "draft",
          qty_received: 0,
          customer_order_id: null,
          order_bom: source.order_bom.map((line) => ({ ...line })),
          stages: source.stages.map((st) => ({ ...st, status: "pending", started_at: null, ended_at: null })),
          material_issues: [],
          labor_entries: [],
          scrap: [],
          finished_receipts: [],
          cost_summary: { materials: 0, labor: 0, overhead: 0, scrap_effect: 0, total: 0, received: 0, unit_cost: 0 },
          material_shortage: undefined,
          _case: undefined,
          _note: undefined,
        };

        set((s) => ({ orders: { ...s.orders, [copy.id]: copy } }));
        return copy;
      },

      createOrder: (input) => {
        const mo: ManufacturingOrder = {
          id: `mo_${Date.now()}_${seq++}`,
          number: nextNumber(get().orders),
          output_item_id: input.output_item_id,
          qty_ordered: input.qty_ordered,
          qty_received: 0,
          source_template_id: input.source_template_id,
          customer_order_id: input.customer_order_id,
          wh_raw: input.wh_raw,
          wh_wip: input.wh_wip,
          wh_finished: input.wh_finished,
          issue_mode: input.issue_mode,
          status: "draft",
          order_bom: input.order_bom,
          stages: input.stages,
          material_issues: [],
          labor_entries: [],
          overhead: input.overhead,
          scrap: [],
          finished_receipts: [],
          cost_summary: { materials: 0, labor: 0, overhead: 0, scrap_effect: 0, total: 0, received: 0, unit_cost: 0 },
        };
        set((s) => ({ orders: { ...s.orders, [mo.id]: mo } }));
        return mo;
      },

      approveOrder: (id) => set((s) => {
        const o = s.orders[id];
        if (!o || o.status !== "draft") return s;
        return { orders: { ...s.orders, [id]: { ...o, status: "approved" } } };
      }),

      startOrder: (id) => set((s) => {
        const o = s.orders[id];
        if (!o || o.status !== "approved") return s;
        return { orders: { ...s.orders, [id]: { ...o, status: "in_progress" } } };
      }),

      setNotes: (id, notes) => set((s) => {
        const o = s.orders[id];
        if (!o) return s;
        return { orders: { ...s.orders, [id]: { ...o, notes } } };
      }),

      updateOrderBom: (id, order_bom) => set((s) => {
        const o = s.orders[id];
        if (!o || o.status !== "draft") return s;
        return { orders: { ...s.orders, [id]: { ...o, order_bom } } };
      }),

      startStage: (moId, stageId) => set((s) => {
        const o = s.orders[moId];
        const stage = o?.stages.find((st) => st.id === stageId);
        if (!o || !stage || stage.status !== "pending") return s;
        const now = new Date().toISOString();
        return { orders: { ...s.orders, [moId]: { ...o, stages: patchStage(o, stageId, { status: "in_progress", started_at: now }) } } };
      }),

      endStage: (moId, stageId) => set((s) => {
        const o = s.orders[moId];
        const stage = o?.stages.find((st) => st.id === stageId);
        if (!o || !stage || stage.status !== "in_progress") return s;
        const now = new Date().toISOString();
        return { orders: { ...s.orders, [moId]: { ...o, stages: patchStage(o, stageId, { status: "done", ended_at: now }) } } };
      }),

      assignStage: (moId, stageId, employeeId) => set((s) => {
        const o = s.orders[moId];
        if (!o) return s;
        return { orders: { ...s.orders, [moId]: { ...o, stages: patchStage(o, stageId, { assignee_id: employeeId }) } } };
      }),

      addLaborEntry: (moId, input) => set((s) => {
        const o = s.orders[moId];
        if (!o) return s;
        const entry: LaborEntry = {
          id: `le_${Date.now()}_${seq++}`,
          employee_id: input.employee_id,
          stage_id: input.stage_id,
          hours: input.hours,
          cost: input.cost,
        };
        const labor_entries = [...o.labor_entries, entry];
        const labor = labor_entries.reduce((sum, l) => sum + l.cost, 0);
        return { orders: { ...s.orders, [moId]: retotal({ ...o, labor_entries, cost_summary: { ...o.cost_summary, labor } }) } };
      }),

      addManualMaterialIssue: (moId, input) => set((s) => {
        const o = s.orders[moId];
        if (!o) return s;
        const issue: MaterialIssue = {
          id: `mi_${Date.now()}_${seq++}`,
          type: "manual",
          stage_id: input.stage_id,
          lines: input.lines.map((l) => ({ item_id: l.item_id, qty: l.qty, from_wh: o.wh_raw, unit_cost: l.unit_cost })),
        };
        const issueCost = issue.lines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0);
        const material_issues = [...o.material_issues, issue];
        const materials = o.cost_summary.materials + issueCost;
        return { orders: { ...s.orders, [moId]: retotal({ ...o, material_issues, cost_summary: { ...o.cost_summary, materials } }) } };
      }),

      receiveFinished: (moId, input) => set((s) => {
        const o = s.orders[moId];
        if (!o) return s;
        const remaining = o.qty_ordered - o.qty_received;
        const qtyGood = Math.min(input.qty_good, remaining);
        if (qtyGood <= 0) return s;

        const items = getItems();
        const preview = computeReceiptPreview(o, items, qtyGood);

        let material_issues = o.material_issues;
        if (preview.issueLines.length > 0) {
          const issue: MaterialIssue = {
            id: `mi_${Date.now()}_${seq++}`,
            type: "backflush",
            receipt_id: `fr_${Date.now()}_${seq++}`,
            lines: preview.issueLines,
          };
          material_issues = [...material_issues, issue];
        }

        const receipt = {
          id: `fr_${Date.now()}_${seq++}`,
          qty_good: qtyGood,
          to_wh: input.to_wh,
          unit_cost: preview.unitCostAfter,
          date: new Date().toISOString(),
        };

        useMfgItemStock.getState().receiveFinishedItem(o.output_item_id, input.to_wh, qtyGood, preview.unitCostAfter);

        return {
          orders: {
            ...s.orders,
            [moId]: {
              ...o,
              status: preview.newStatus,
              qty_received: preview.newQtyReceived,
              material_issues,
              finished_receipts: [...o.finished_receipts, receipt],
              overhead: { ...o.overhead, computed: preview.overheadAmount },
              cost_summary: {
                ...o.cost_summary,
                materials: preview.materialsAfter,
                overhead: preview.overheadAmount,
                total: preview.totalAfter,
                unit_cost: preview.unitCostAfter,
                received: preview.newQtyReceived,
              },
            },
          },
        };
      }),

      recordScrap: (moId, input) => set((s) => {
        const o = s.orders[moId];
        if (!o) return s;
        const entry: ScrapEntry = {
          id: `sc_${Date.now()}_${seq++}`,
          stage_id: input.stage_id,
          item_id: input.item_id,
          qty: input.qty,
          reason_id: input.reason_id,
          note: input.note,
        };
        const scrap = [...o.scrap, entry];
        const items = getItems();
        const scrap_effect = round2(scrap.reduce((sum, sc) => {
          const item = items.find((i) => i.id === sc.item_id);
          return sum + sc.qty * (item?.avg_cost ?? 0);
        }, 0));
        return { orders: { ...s.orders, [moId]: { ...o, scrap, cost_summary: { ...o.cost_summary, scrap_effect } } } };
      }),
    }),
    { name: "flexova.mfg.orders" }
  )
);
