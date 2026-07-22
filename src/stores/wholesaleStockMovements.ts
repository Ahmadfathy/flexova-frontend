import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface StockIssueEntry {
  id: string;
  item_id: string;
  warehouse_id: string;
  /** Qty removed from stock, in the item's base unit. */
  qty_base: number;
  source_ref: string;
  created_at: string;
}

interface WholesaleStockMovementsState {
  entries: StockIssueEntry[];
  addIssue: (entry: Omit<StockIssueEntry, "id" | "created_at">) => void;
  issuedBaseFor: (itemId: string, warehouseId: string) => number;
}

/**
 * Real stock-issue movements created by "تسليم" (deliver) on the picking
 * screen (FE_13 §6) — this session's consumption on top of the inventory
 * ledger's last known balance (`lib/wholesale/stock.ts`).
 */
export const useWholesaleStockMovements = create<WholesaleStockMovementsState>()(
  persist(
    (set, get) => ({
      entries: [],
      addIssue: (entry) =>
        set((s) => ({
          entries: [{ ...entry, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...s.entries],
        })),
      issuedBaseFor: (itemId, warehouseId) =>
        get().entries
          .filter((e) => e.item_id === itemId && e.warehouse_id === warehouseId)
          .reduce((sum, e) => sum + e.qty_base, 0),
    }),
    { name: "flexova.wholesale.stock_movements" },
  ),
);
