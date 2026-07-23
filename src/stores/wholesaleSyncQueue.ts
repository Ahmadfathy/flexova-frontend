import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getSyncQueue, getPriceListLines } from "@/lib/mock/wholesale";
import { vanQueueStorage, nextOpNumber, revalidatePriceSnapshot, revalidateCreditSnapshot } from "@/lib/van/offline";
import { resolvePrice } from "@/lib/wholesale/pricing";
import { getAvailableCredit } from "@/lib/wholesale/credit";
import { useWholesaleCustomers } from "@/stores/wholesaleCustomers";
import { useWholesaleCreditReservations } from "@/stores/wholesaleCreditReservations";
import type { SyncOp } from "@/types/wholesale";

interface WholesaleSyncQueueState {
  entries: SyncOp[];
  /** Transient — not persisted meaning beyond the current tab; drives SyncIndicator. */
  syncState: "idle" | "syncing" | "error";
  enqueue: (op: Omit<SyncOp, "id" | "number" | "created_at" | "status">) => void;
  /** Simulates a sync attempt — resolves "pending" entries to "synced" or "rejected"
   * (FE_13 §15 conflict policy) unless `?mock=sync_fail` is set, in which case every
   * pending entry flips to the transient "error" state instead (network-level failure,
   * distinct from a per-op rejection). */
  syncNow: () => Promise<void>;
  /** Rejected-ops drawer's "fix" action — re-attempts sync for just this one op. */
  retryOp: (id: string) => Promise<void>;
}

function revalidate(op: SyncOp): { ok: boolean; reasonAr?: string; reasonEn?: string } {
  if (op.op !== "sale") return { ok: true };

  const priceResult = revalidatePriceSnapshot(op.price_snapshot, (line) => {
    const customer = op.customer_id ? useWholesaleCustomers.getState().customers.find((c) => c.id === op.customer_id) : undefined;
    const resolved = resolvePrice({
      item: { id: line.item_id },
      qty: line.qty,
      uomId: line.uom_id,
      customer: customer ? { price_list_id: customer.price_list_id } : null,
      priceLists: getPriceListLines(),
    });
    return resolved.price;
  });
  if (!priceResult.ok) return priceResult;

  if (op.credit_snapshot != null && op.customer_id) {
    const customer = useWholesaleCustomers.getState().customers.find((c) => c.id === op.customer_id);
    const reservations = useWholesaleCreditReservations.getState().reservations;
    const currentAvailable = customer ? getAvailableCredit(customer, reservations) : 0;
    return revalidateCreditSnapshot(op.credit_snapshot, currentAvailable);
  }

  return { ok: true };
}

export const useWholesaleSyncQueue = create<WholesaleSyncQueueState>()(
  persist(
    (set, get) => ({
      entries: getSyncQueue(),
      syncState: "idle",
      enqueue: (op) =>
        set((s) => {
          const number = nextOpNumber(s.entries.filter((e) => e.shift_id === op.shift_id), op.shift_id);
          return {
            entries: [
              { ...op, id: crypto.randomUUID(), number, created_at: new Date().toISOString(), status: "pending" },
              ...s.entries,
            ],
          };
        }),
      syncNow: async () => {
        set({ syncState: "syncing" });
        await new Promise((r) => setTimeout(r, 900));
        const shouldFail = new URLSearchParams(window.location.search).get("mock") === "sync_fail";
        if (shouldFail) {
          set({ syncState: "error" });
          return;
        }
        set((s) => ({
          syncState: "idle",
          entries: s.entries.map((e) => {
            if (e.status !== "pending") return e;
            const result = revalidate(e);
            return result.ok
              ? { ...e, status: "synced" as const }
              : { ...e, status: "rejected" as const, reason_ar: result.reasonAr, reason_en: result.reasonEn };
          }),
        }));
      },
      retryOp: async (id) => {
        const op = get().entries.find((e) => e.id === id);
        if (!op) return;
        set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, status: "pending" as const, reason_ar: undefined, reason_en: undefined } : e)) }));
        await new Promise((r) => setTimeout(r, 500));
        const result = revalidate({ ...op, status: "pending" });
        set((s) => ({
          entries: s.entries.map((e) =>
            e.id === id
              ? result.ok
                ? { ...e, status: "synced" as const }
                : { ...e, status: "rejected" as const, reason_ar: result.reasonAr, reason_en: result.reasonEn }
              : e,
          ),
        }));
      },
    }),
    {
      name: "flexova.wholesale.sync_queue",
      storage: vanQueueStorage(),
      // IndexedDB structured-clone (unlike JSON.stringify) throws on functions —
      // must persist only the serializable slice, not the whole store (actions included).
      partialize: (s) => ({ entries: s.entries }),
    },
  ),
);
