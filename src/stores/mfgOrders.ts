import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getManufacturingOrders } from "@/lib/mock/mfg";
import type { BomComponent, ManufacturingOrder, MoStage, MfgOverhead } from "@/types/mfg";
import { isMoCancellable } from "@/features/mfg/orders/moStatus";

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
    }),
    { name: "flexova.mfg.orders" }
  )
);
