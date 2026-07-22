import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getOrders } from "@/lib/mock/wholesale";
import type { SalesOrder } from "@/types/wholesale";

interface WholesaleOrdersState {
  orders: SalesOrder[];
  getOrder: (id: string) => SalesOrder | undefined;
  addOrder: (order: SalesOrder) => void;
  updateOrder: (id: string, patch: Partial<SalesOrder>) => void;
}

/** Live orders store, seeded from the fixture — the FE_13 order editor's
 * save-draft/approve actions write here so the list + credit hub reflect them. */
export const useWholesaleOrders = create<WholesaleOrdersState>()(
  persist(
    (set, get) => ({
      orders: getOrders(),
      getOrder: (id) => get().orders.find((o) => o.id === id),
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      updateOrder: (id, patch) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
    }),
    { name: "flexova.wholesale.orders" },
  ),
);

/** Next sequential order number, following the existing "WH-SO-1201" convention. */
export function nextOrderNumber(orders: SalesOrder[]): string {
  const max = orders.reduce((m, o) => {
    const n = parseInt(o.number.replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 1200);
  return `WH-SO-${max + 1}`;
}
