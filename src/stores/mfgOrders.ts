import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getManufacturingOrders } from "@/lib/mock/mfg";
import type { BomComponent, ManufacturingOrder, MoStage, MfgOverhead, LaborEntry, MaterialIssue } from "@/types/mfg";
import { isMoCancellable } from "@/features/mfg/orders/moStatus";

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
  /** Cancel after issue = reversing entries (no delete) per FE_14 §7.7 — here we only
   * flip status since material issues aren't modeled as reversible ledger lines yet. */
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
}

export const useMfgOrders = create<MfgOrdersState>()(
  persist(
    (set, get) => ({
      orders: SEED_ORDERS,

      cancelOrder: (id) => set((s) => {
        const o = s.orders[id];
        if (!o || !isMoCancellable(o.status)) return s;
        return { orders: { ...s.orders, [id]: { ...o, status: "cancelled" } } };
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
    }),
    { name: "flexova.mfg.orders" }
  )
);
