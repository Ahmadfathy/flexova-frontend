import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toBase } from "@/lib/wholesale/pricing";

export interface StockReservationEntry {
  id: string;
  order_id: string;
  warehouse_id: string;
  item_id: string;
  /** Reserved qty, normalized to the item's base unit. */
  qty_base: number;
  created_at: string;
}

interface WholesaleStockReservationsState {
  entries: StockReservationEntry[];
  addForOrder: (
    orderId: string,
    warehouseId: string,
    lines: { item_id: string; qty: number; uom_id: string }[],
  ) => void;
}

/**
 * Soft (informational) stock reservation on order approval (FE_13 §5) — flags
 * committed-but-not-yet-picked qty per item/warehouse. Never blocks other
 * documents (golden rule #3: stock movements come from documents, not direct
 * balance edits); no inventory screen renders this badge yet — that's FE_01
 * territory and out of scope here, but the reservation itself is real and
 * inspectable.
 */
export const useWholesaleStockReservations = create<WholesaleStockReservationsState>()(
  persist(
    (set) => ({
      entries: [],
      addForOrder: (orderId, warehouseId, lines) =>
        set((s) => ({
          entries: [
            ...lines.map((l) => ({
              id: crypto.randomUUID(),
              order_id: orderId,
              warehouse_id: warehouseId,
              item_id: l.item_id,
              qty_base: toBase(l.qty, l.uom_id),
              created_at: new Date().toISOString(),
            })),
            ...s.entries,
          ],
        })),
    }),
    { name: "flexova.wholesale.stock_reservations" },
  ),
);
