import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getManufacturingOrders } from "@/lib/mock/mfg";
import type { ManufacturingOrder } from "@/types/mfg";
import { isMoCancellable } from "@/features/mfg/orders/moStatus";

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
    }),
    { name: "flexova.mfg.orders" }
  )
);
