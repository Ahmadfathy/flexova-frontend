import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SvcProductStockState {
  /** item_id -> cumulative units deducted since app install (delta over the static fixture `stock`). */
  depleted: Record<string, number>;
  deplete: (itemId: string, qty: number) => void;
}

export const useSvcProductStock = create<SvcProductStockState>()(
  persist(
    (set) => ({
      depleted: {},
      deplete: (itemId, qty) =>
        set((s) => ({ depleted: { ...s.depleted, [itemId]: (s.depleted[itemId] ?? 0) + qty } })),
    }),
    { name: "flexova.svc.productStock" }
  )
);

export function effectiveStock(baseStock: number, itemId: string, depleted: Record<string, number>): number {
  return Math.max(0, baseStock - (depleted[itemId] ?? 0));
}
