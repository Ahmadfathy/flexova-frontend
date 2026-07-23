import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getShifts } from "@/lib/mock/wholesale";
import type { VanShift } from "@/types/wholesale";

interface WholesaleVanShiftsState {
  shifts: VanShift[];
  /** Posts a collection's cash into its shift's treasury (FE_13 §3.4) — the shift's
   * own `expected_cash = opening_float + cash_sales + collections` formula (§3.5)
   * is recomputed here, not just incremented, so it stays correct regardless of
   * call order. */
  postCollectionCash: (shiftId: string, amount: number) => void;
}

export const useWholesaleVanShifts = create<WholesaleVanShiftsState>()(
  persist(
    (set) => ({
      shifts: getShifts(),
      postCollectionCash: (shiftId, amount) =>
        set((s) => ({
          shifts: s.shifts.map((sh) => {
            if (sh.id !== shiftId) return sh;
            const collections = Math.round((sh.collections + amount) * 100) / 100;
            const expected_cash = Math.round((sh.opening_float + sh.cash_sales + collections) * 100) / 100;
            return { ...sh, collections, expected_cash };
          }),
        })),
    }),
    { name: "flexova.wholesale.van_shifts" },
  ),
);
