import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RprPartsStockState {
  /** part_id -> cumulative units deducted since app install (delta over the fixture's base `stock`). */
  depleted: Record<string, number>;
  deplete: (partId: string, qty: number) => void;
}

export const useRprPartsStock = create<RprPartsStockState>()(
  persist(
    (set) => ({
      depleted: {},
      deplete: (partId, qty) =>
        set((s) => ({ depleted: { ...s.depleted, [partId]: (s.depleted[partId] ?? 0) + qty } })),
    }),
    { name: "flexova.repair.partsStock" }
  )
);

/** Unlike POS/svc's clamped stock helper, repair explicitly allows negative results
 * (flag-don't-block, FE_12 golden rule) — never clamps to zero. */
export function effectiveStock(baseStock: number, partId: string, depleted: Record<string, number>): number {
  return baseStock - (depleted[partId] ?? 0);
}
