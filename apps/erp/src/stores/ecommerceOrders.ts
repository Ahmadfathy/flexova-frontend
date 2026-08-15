import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSeedOrders } from "@/lib/mock/ecommerce";
import { isOfflineMock, isReturnVsCancel } from "@/features/ecommerce/catalog";
import type { EcOrder } from "@/features/ecommerce/types";

/**
 * Orders local state (spec §5.3 offline row states — "offline status update
 * offline-first + sync"). Seeded once from `orders[]`; every status mutation
 * writes optimistically with `sync:"local"`, then simulates the round trip
 * to `syncing` → `synced` — unless `?mock=offline` is active, in which case
 * the row stays `local` (queued). Mirrors Healthcare Today Board's per-row
 * sync indicator exactly (same offline-first shape, applied to orders).
 */

function seedOrders(): Record<string, EcOrder> {
  return Object.fromEntries(getSeedOrders().map((o) => [o.id, { ...o, sync: "synced" as const }]));
}

interface EcommerceOrdersState {
  orders: Record<string, EcOrder>;
  /** Card order's payment webhook finally lands (or admin forces a recheck
   * on a stuck pending_payment order, spec §5.3) — generates invoice+ETA. */
  recheckPayment: (orderId: string) => void;
  startProcessing: (orderId: string) => void;
  markShipped: (orderId: string, carrier: string, trackingNo: string) => void;
  markDelivered: (orderId: string) => void;
  /** "any → return/cancel" (spec §5.2) — posts a credit note in ERP (mocked)
   * whenever money had already moved (paid/processing/shipped/delivered). */
  returnOrCancel: (orderId: string) => void;
  /** Forces any still-queued rows to resolve once connectivity returns
   * (list/detail pages call this when `!isOffline`). */
  reconcilePending: () => void;
}

function settleRow(orderId: string, set: (fn: (s: EcommerceOrdersState) => Partial<EcommerceOrdersState>) => void) {
  if (isOfflineMock()) return; // stays "local" — no network to round-trip to
  setTimeout(() => {
    set((s) => {
      const row = s.orders[orderId];
      return row ? { orders: { ...s.orders, [orderId]: { ...row, sync: "syncing" } } } : s;
    });
    setTimeout(() => {
      set((s) => {
        const row = s.orders[orderId];
        return row ? { orders: { ...s.orders, [orderId]: { ...row, sync: "synced" } } } : s;
      });
    }, 600);
  }, 400);
}

export const useEcommerceOrders = create<EcommerceOrdersState>()(
  persist(
    (set, get) => ({
      orders: seedOrders(),

      recheckPayment: (orderId) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || order.status !== "pending_payment") return s;
          return {
            orders: {
              ...s.orders,
              [orderId]: {
                ...order,
                status: "paid",
                payment_status: "paid",
                invoice_id: order.invoice_id ?? `inv_${order.id}`,
                eta_status: "accepted",
                sync: "local",
              },
            },
          };
        });
        settleRow(orderId, set);
      },

      startProcessing: (orderId) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || order.status !== "paid") return s;
          return { orders: { ...s.orders, [orderId]: { ...order, status: "processing", sync: "local" } } };
        });
        settleRow(orderId, set);
      },

      markShipped: (orderId, carrier, trackingNo) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || order.status !== "processing") return s;
          return {
            orders: {
              ...s.orders,
              [orderId]: { ...order, status: "shipped", carrier, tracking_no: trackingNo, sync: "local" },
            },
          };
        });
        settleRow(orderId, set);
      },

      markDelivered: (orderId) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || order.status !== "shipped") return s;
          const patch: Partial<EcOrder> = { status: "delivered", sync: "local" as const };
          if (order.payment_method === "cod") patch.payment_status = "paid";
          return { orders: { ...s.orders, [orderId]: { ...order, ...patch } } };
        });
        settleRow(orderId, set);
      },

      returnOrCancel: (orderId) => {
        set((s) => {
          const order = s.orders[orderId];
          if (!order || order.status === "returned" || order.status === "cancelled") return s;
          const kind = isReturnVsCancel(order.status);
          const wasPaid = order.payment_status === "paid";
          const patch: Partial<EcOrder> = {
            status: kind === "return" ? "returned" : "cancelled",
            sync: "local",
          };
          if (kind === "return" && wasPaid) {
            patch.payment_status = "refunded";
            patch.eta_status = "credit_note";
            patch.credit_note_id = `cn_mock_${order.id}`;
          }
          return { orders: { ...s.orders, [orderId]: { ...order, ...patch } } };
        });
        settleRow(orderId, set);
      },

      reconcilePending: () => {
        const { orders } = get();
        const stuck = Object.values(orders).filter((o) => o.sync && o.sync !== "synced");
        if (stuck.length === 0) return;
        set((s) => ({
          orders: Object.fromEntries(
            Object.entries(s.orders).map(([id, o]) => [id, o.sync && o.sync !== "synced" ? { ...o, sync: "synced" as const } : o])
          ),
        }));
      },
    }),
    { name: "flexova.ecommerce.orders", partialize: (s) => ({ orders: s.orders }) }
  )
);
