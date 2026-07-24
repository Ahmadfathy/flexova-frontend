import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getItems } from "@/lib/mock/mfg";
import { round2 } from "@/features/mfg/orders/costing";

interface StockEntry {
  qty: number;
  avg_cost: number;
}

function key(itemId: string, warehouseId: string): string {
  return `${itemId}__${warehouseId}`;
}

function fixtureEntry(itemId: string, warehouseId: string): StockEntry {
  const item = getItems().find((i) => i.id === itemId);
  return {
    qty: item?.balances.find((b) => b.warehouse_id === warehouseId)?.qty ?? 0,
    avg_cost: item?.avg_cost ?? 0,
  };
}

interface MfgItemStockState {
  stock: Record<string, StockEntry>;
  getStock: (itemId: string, warehouseId: string) => StockEntry;
  /**
   * Weighted-average blend on a finished receipt (FE_14 §7.5: "finished enters store at
   * unit cost → weighted-avg updates"). No shared cross-module inventory store exists in
   * this app (every module tracks its own local effect on otherwise-static fixture item
   * data — mirrors `useRprPartsStock`'s "no engine to call" workaround) — this is mfg's.
   */
  receiveFinishedItem: (itemId: string, warehouseId: string, qty: number, unitCost: number) => StockEntry;
}

export const useMfgItemStock = create<MfgItemStockState>()(
  persist(
    (set, get) => ({
      stock: {},

      getStock: (itemId, warehouseId) => get().stock[key(itemId, warehouseId)] ?? fixtureEntry(itemId, warehouseId),

      receiveFinishedItem: (itemId, warehouseId, qty, unitCost) => {
        const k = key(itemId, warehouseId);
        const current = get().stock[k] ?? fixtureEntry(itemId, warehouseId);
        const newQty = current.qty + qty;
        const newAvgCost = newQty > 0 ? round2((current.qty * current.avg_cost + qty * unitCost) / newQty) : current.avg_cost;
        const entry: StockEntry = { qty: newQty, avg_cost: newAvgCost };
        set((s) => ({ stock: { ...s.stock, [k]: entry } }));
        return entry;
      },
    }),
    { name: "flexova.mfg.itemStock" }
  )
);
