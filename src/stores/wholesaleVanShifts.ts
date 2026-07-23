import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getShifts } from "@/lib/mock/wholesale";
import type { VanShift, GoodsVariance, VanShiftStatus } from "@/types/wholesale";

interface WholesaleVanShiftsState {
  shifts: VanShift[];
  /** Posts a collection's cash into its shift's treasury (FE_13 §3.4) — the shift's
   * own `expected_cash = opening_float + cash_sales + collections` formula (§3.5)
   * is recomputed here, not just incremented, so it stays correct regardless of
   * call order. */
  postCollectionCash: (shiftId: string, amount: number) => void;
  /** Posts a van sale's cash-tendered portion into `cash_sales` (only the `pm_cash`
   * amount — card/wallet/fawry/credit never touch physical van cash). */
  postSaleCash: (shiftId: string, cashAmount: number) => void;
  /** FE_13 §3.5 — closes the shift with its declared cash/goods count results. */
  closeShift: (shiftId: string, result: {
    status: VanShiftStatus;
    closed_at: string;
    declared_cash: number;
    cash_variance: number;
    goods_variance: GoodsVariance[];
    commission_estimate: number;
    settlement_status?: string;
  }) => void;
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
      postSaleCash: (shiftId, cashAmount) =>
        set((s) => ({
          shifts: s.shifts.map((sh) => {
            if (sh.id !== shiftId || cashAmount <= 0) return sh;
            const cash_sales = Math.round((sh.cash_sales + cashAmount) * 100) / 100;
            const expected_cash = Math.round((sh.opening_float + cash_sales + sh.collections) * 100) / 100;
            return { ...sh, cash_sales, expected_cash };
          }),
        })),
      closeShift: (shiftId, result) =>
        set((s) => ({
          shifts: s.shifts.map((sh) => (sh.id === shiftId ? { ...sh, ...result } : sh)),
        })),
    }),
    { name: "flexova.wholesale.van_shifts" },
  ),
);
